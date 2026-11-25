const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const Contract = require('../models/Contract');
const { auditInvoice } = require('../utils/rulesEngine');
const { isFlagged, syncReviewStatus } = require('../utils/domain');
const { buildAuditLineWrite } = require('../utils/auditPersistence');
const { buildInvoiceInput } = require('../utils/invoiceInput');

const list = async (req, res) => {
  const invoices = await Invoice.find({ company: req.user.company })
    .populate('contract', 'carrierName port')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: invoices.length, data: invoices });
};

const get = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company }).populate(
    'contract',
  );
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  const lines = await InvoiceLine.find({ invoice: invoice._id });
  res.json({ success: true, data: { ...invoice.toObject(), lines } });
};

const ensureOwnedContract = async (contractId, companyId) => {
  if (!contractId) return true;
  return Boolean(await Contract.findOne({ _id: contractId, company: companyId }));
};

const create = async (req, res) => {
  const payload = buildInvoiceInput(req.body);
  if (!(await ensureOwnedContract(payload.contract, req.user.company))) {
    return res.status(400).json({ success: false, message: 'Contract not found' });
  }

  const invoice = await Invoice.create({ ...payload, company: req.user.company });
  res.status(201).json({ success: true, data: invoice });
};

const update = async (req, res) => {
  const payload = buildInvoiceInput(req.body);
  if (!Object.keys(payload).length) {
    return res.status(400).json({ success: false, message: 'No supported fields to update' });
  }
  if (!(await ensureOwnedContract(payload.contract, req.user.company))) {
    return res.status(400).json({ success: false, message: 'Contract not found' });
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, company: req.user.company },
    { $set: payload },
    { new: true, runValidators: true },
  );
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: invoice });
};

const remove = async (req, res) => {
  // Confirm the invoice belongs to the caller before touching its lines.
  const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  await InvoiceLine.deleteMany({ invoice: invoice._id });
  res.json({ success: true, message: 'Invoice deleted' });
};

/**
 * Run the rules engine on an invoice's lines.
 */
const runAudit = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  const contract = invoice.contract
    ? await Contract.findById(invoice.contract)
    : await Contract.findOne({
        company: req.user.company,
        carrierName: invoice.carrierName,
        port: invoice.port,
      });

  const existingLines = await InvoiceLine.find({ invoice: invoice._id });
  const lines = existingLines.length
    ? existingLines
    : (invoice.rawJson?.lines || []).map((l) => ({
        ...l,
        invoice: invoice._id,
        billedAmount: l.billedAmount || l.amount || 0,
      }));

  if (!lines.length) {
    return res.status(400).json({ success: false, message: 'Invoice has no line items to audit' });
  }

  const results = auditInvoice(lines, contract);

  const saved = await Promise.all(
    results.map((result, i) => {
      const write = buildAuditLineWrite(lines[i], result, invoice._id);
      if (write.operation === 'create') return InvoiceLine.create(write.payload);
      return InvoiceLine.findOneAndUpdate(write.filter, write.payload, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      });
    }),
  );

  invoice.auditStatus = 'audited';
  await invoice.save();

  res.json({ success: true, data: saved });
};

/** Customer accept/reject decision on one flagged audit line. */
const reviewFlag = async (req, res) => {
  const { decision, reviewNote } = req.body;
  const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  const line = await InvoiceLine.findOne({ _id: req.params.lineId, invoice: invoice._id });
  if (!line) return res.status(404).json({ success: false, message: 'Audit line not found' });
  if (!isFlagged(line)) {
    return res.status(400).json({ success: false, message: 'Only flagged lines can be reviewed' });
  }

  line.customerDecision = decision === 'accept' ? 'accept' : 'reject';
  line.customerReviewedBy = req.user._id;
  line.customerReviewedAt = new Date();
  syncReviewStatus(line);
  if (reviewNote !== undefined) line.reviewNote = reviewNote;
  await line.save();

  return res.json({ success: true, data: line });
};

module.exports = { list, get, create, update, remove, runAudit, reviewFlag };
