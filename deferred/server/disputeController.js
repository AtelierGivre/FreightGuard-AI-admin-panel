const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const { generateDisputeLetter } = require('../utils/letterGenerator');

const list = async (req, res) => {
  const disputes = await Dispute.find({ company: req.user.company })
    .populate('invoice', 'invoiceNumber carrierName containerNumber totalBilled')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: disputes.length, data: disputes });
};

const get = async (req, res) => {
  const dispute = await Dispute.findOne({ _id: req.params.id, company: req.user.company }).populate('invoice');
  if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });
  res.json({ success: true, data: dispute });
};

const create = async (req, res) => {
  const payload = { ...req.body, company: req.user.company };
  const dispute = await Dispute.create(payload);
  res.status(201).json({ success: true, data: dispute });
};

const update = async (req, res) => {
  const dispute = await Dispute.findOneAndUpdate(
    { _id: req.params.id, company: req.user.company },
    req.body,
    { new: true, runValidators: true }
  );
  if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });
  res.json({ success: true, data: dispute });
};

const generateLetter = async (req, res) => {
  const { invoiceId, flagIds } = req.body;
  const invoice = await Invoice.findOne({ _id: invoiceId, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  const company = await Company.findById(req.user.company);
  const allLines = await InvoiceLine.find({ invoice: invoice._id });
  const flags = allLines
    .filter((l) => l.verdict !== 'ok' && (!flagIds || flagIds.includes(String(l._id))))
    .map((l) => ({ ...l.toObject(), accepted: true }));

  const letterText = generateDisputeLetter({ company, invoice, flags });
  res.json({ success: true, data: { letterText, flags } });
};

const recordRecovery = async (req, res) => {
  const { amount, recoveredAt } = req.body;
  const dispute = await Dispute.findOne({ _id: req.params.id, company: req.user.company });
  if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

  const company = await Company.findById(req.user.company);
  const feePct = company.feePct ?? 25;
  const feeAmount = Math.round((amount * feePct + Number.EPSILON) * 100) / 100;

  const recovery = await Recovery.create({
    dispute: dispute._id,
    company: req.user.company,
    amount,
    feeAmount,
    feePct,
    recoveredAt: recoveredAt ? new Date(recoveredAt) : new Date(),
  });

  dispute.status = 'won';
  await dispute.save();

  res.status(201).json({ success: true, data: recovery });
};

module.exports = { list, get, create, update, generateLetter, recordRecovery };
