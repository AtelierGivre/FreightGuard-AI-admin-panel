const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const Contract = require('../models/Contract');
const config = require('../config/env');
const { round2 } = require('../utils/round');
const {
  assertTransition,
  calculateFee,
  isAcceptedFlag,
  RECOVERY_ALLOWED_STATUSES,
} = require('../utils/domain');
const { generateDisputeLetter } = require('../utils/letterGenerator');

const INVOICE_FIELDS = 'invoiceNumber carrierName containerNumber port totalBilled currency';
const LINE_FIELDS =
  'description feeType billedAmount correctAmount verdict reason confidence customerDecision operatorDecision reviewStatus';

const populateDispute = (query) =>
  query.populate('invoice', INVOICE_FIELDS).populate('lines', LINE_FIELDS).sort({ createdAt: -1 });

const list = async (req, res) => {
  const disputes = await populateDispute(Dispute.find({ company: req.user.company }));
  res.json({ success: true, count: disputes.length, data: disputes });
};

const get = async (req, res) => {
  const dispute = await populateDispute(
    Dispute.findOne({ _id: req.params.id, company: req.user.company }),
  );
  if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });
  res.json({ success: true, data: dispute });
};

/** Create an empty draft tied to a company-owned invoice. */
const create = async (req, res) => {
  const { invoiceId, disputedAmount = 0, notes } = req.body;
  const invoice = await Invoice.findOne({ _id: invoiceId, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  const dispute = await Dispute.create({
    invoice: invoice._id,
    company: req.user.company,
    disputedAmount,
    currency: invoice.currency || 'USD',
    notes,
  });

  res.status(201).json({ success: true, data: dispute });
};

/**
 * Build a letter from accepted flags and save it to a draft dispute.
 * Re-running on the same invoice refreshes the existing draft instead of
 * creating duplicate letters.
 */
const generateLetter = async (req, res) => {
  const { invoiceId, lineIds } = req.body;

  const invoice = await Invoice.findOne({ _id: invoiceId, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  const company = await Company.findById(req.user.company);
  if (!company) {
    return res.status(400).json({ success: false, message: 'Company profile not found' });
  }

  const filter = {
    invoice: invoice._id,
    verdict: { $in: ['overcharged', 'invalid'] },
    $or: [
      { customerDecision: 'accept' },
      { operatorDecision: 'confirmed' },
      { customerDecision: null, operatorDecision: null, reviewStatus: 'confirmed' },
    ],
  };
  const requestedIds = Array.isArray(lineIds) ? [...new Set(lineIds.map(String))] : [];
  if (requestedIds.length) filter._id = { $in: requestedIds };

  // Apply the shared decision rules after loading candidates so operator
  // rejections and low-confidence flags are handled consistently.
  const flags = (await InvoiceLine.find(filter)).filter(isAcceptedFlag);
  if (!flags.length) {
    return res.status(400).json({
      success: false,
      message: 'Accept at least one flagged line before generating a dispute letter',
    });
  }
  if (requestedIds.length && flags.length !== requestedIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Every selected line must be an accepted flag on this invoice',
    });
  }

  const contract = invoice.contract
    ? await Contract.findById(invoice.contract)
    : await Contract.findOne({
        company: req.user.company,
        carrierName: invoice.carrierName,
        port: invoice.port,
      });

  const letterText = generateDisputeLetter({ company, invoice, flags, contract });
  const disputedAmount = round2(
    flags.reduce((sum, line) => sum + (line.billedAmount || 0) - (line.correctAmount || 0), 0),
  );
  const lineRefs = flags.map((line) => line._id);

  let dispute = await Dispute.findOne({
    company: req.user.company,
    invoice: invoice._id,
    status: 'draft',
  }).sort({ createdAt: -1 });

  if (dispute) {
    dispute.letterText = letterText;
    dispute.disputedAmount = disputedAmount;
    dispute.currency = invoice.currency || 'USD';
    dispute.lines = lineRefs;
    await dispute.save();
  } else {
    dispute = await Dispute.create({
      invoice: invoice._id,
      company: req.user.company,
      status: 'draft',
      disputedAmount,
      currency: invoice.currency || 'USD',
      lines: lineRefs,
      letterText,
    });
  }

  const saved = await populateDispute(Dispute.findOne({ _id: dispute._id }));

  res.json({
    success: true,
    data: { dispute: saved, letterText, flags },
  });
};

/** Move a dispute through Draft → Sent → Under review → Won/Lost. */
const updateStatus = async (req, res) => {
  const { status, sentAt, responseDueDate, notes } = req.body;
  const dispute = await Dispute.findOne({ _id: req.params.id, company: req.user.company });
  if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

  if (status === 'won') {
    const recovery = await Recovery.findOne({ dispute: dispute._id, company: req.user.company });
    if (!recovery) {
      return res.status(400).json({
        success: false,
        message: 'Record a recovery before marking this dispute as won',
      });
    }
  }

  assertTransition(dispute.status, status);

  dispute.status = status;
  if (status === 'sent' && sentAt === undefined && !dispute.sentAt) dispute.sentAt = new Date();
  if (sentAt !== undefined) dispute.sentAt = new Date(sentAt);
  if (responseDueDate !== undefined) dispute.responseDueDate = new Date(responseDueDate);
  if (notes !== undefined) dispute.notes = notes;
  await dispute.save();

  res.json({ success: true, data: dispute });
};

/** Record cash received and bill the contingency fee in one transaction. */
const recordRecovery = async (req, res) => {
  const { amount, recoveredAt } = req.body;
  const session = await mongoose.startSession();
  let recovery;

  try {
    await session.withTransaction(async () => {
      const fail = (statusCode, message) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        throw error;
      };

      const dispute = await Dispute.findOne({
        _id: req.params.id,
        company: req.user.company,
      }).session(session);
      if (!dispute) fail(404, 'Dispute not found');
      if (dispute.status === 'lost') fail(400, 'A lost dispute cannot be recovered');

      // Claim the dispute first. Two concurrent requests cannot both match this
      // conditional update, so only one recovery can ever win a dispute.
      const claimed = await Dispute.findOneAndUpdate(
        {
          _id: dispute._id,
          company: req.user.company,
          status: { $in: RECOVERY_ALLOWED_STATUSES },
        },
        { $set: { status: 'won' } },
        { new: true, session },
      );
      if (!claimed) {
        fail(409, `Cannot record a recovery while dispute is ${dispute.status}`);
      }

      const company = await Company.findById(req.user.company).session(session);
      const feePct = Number(company?.feePct ?? config.defaultFeePct);
      const [created] = await Recovery.create(
        [
          {
            dispute: dispute._id,
            company: req.user.company,
            amount,
            feePct,
            feeAmount: calculateFee(amount, feePct),
            recoveredAt: recoveredAt ? new Date(recoveredAt) : new Date(),
            billingStatus: 'due',
          },
        ],
        { session },
      );
      recovery = created;
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A recovery is already recorded for this dispute',
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }

  await recovery.populate({
    path: 'dispute',
    select: 'status disputedAmount',
    populate: { path: 'invoice', select: 'invoiceNumber carrierName' },
  });

  res.status(201).json({ success: true, data: recovery });
};

module.exports = { list, get, create, generateLetter, updateStatus, recordRecovery };
