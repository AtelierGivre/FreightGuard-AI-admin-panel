const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const Contract = require('../models/Contract');
const { auditInvoice } = require('../utils/rulesEngine');

const list = async (req, res) => {
  const invoices = await Invoice.find({ company: req.user.company })
    .populate('contract', 'carrierName port')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: invoices.length, data: invoices });
};

const get = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company }).populate('contract');
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  const lines = await InvoiceLine.find({ invoice: invoice._id });
  res.json({ success: true, data: { ...invoice.toObject(), lines } });
};

const create = async (req, res) => {
  const payload = { ...req.body, company: req.user.company };
  const invoice = await Invoice.create(payload);
  res.status(201).json({ success: true, data: invoice });
};

const update = async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, company: req.user.company },
    req.body,
    { new: true, runValidators: true }
  );
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: invoice });
};

const remove = async (req, res) => {
  await InvoiceLine.deleteMany({ invoice: req.params.id });
  const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, message: 'Invoice deleted' });
};

/**
 * Run the rules engine on an invoice's lines.
 */
const runAudit = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, company: req.user.company });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  const contract = invoice.contract ? await Contract.findById(invoice.contract) : await Contract.findOne({
    company: req.user.company,
    carrierName: invoice.carrierName,
    port: invoice.port,
  });

  const existingLines = await InvoiceLine.find({ invoice: invoice._id });
  const lines = existingLines.length
    ? existingLines
    : (invoice.rawJson?.lines || []).map((l) => ({ ...l, invoice: invoice._id, billedAmount: l.billedAmount || l.amount || 0 }));

  if (!lines.length) {
    return res.status(400).json({ success: false, message: 'Invoice has no line items to audit' });
  }

  const results = auditInvoice(lines, contract);

  const saved = await Promise.all(
    results.map((result, i) => {
      const line = lines[i];
      return InvoiceLine.findOneAndUpdate(
        { _id: line._id || line.id },
        {
          invoice: invoice._id,
          feeType: line.feeType || 'demurrage',
          description: line.description,
          days: line.days || 0,
          rate: line.rate || 0,
          billedAmount: line.billedAmount || 0,
          ...result,
        },
        { new: true, upsert: true, runValidators: true }
      );
    })
  );

  invoice.auditStatus = 'audited';
  await invoice.save();

  res.json({ success: true, data: saved });
};

module.exports = { list, get, create, update, remove, runAudit };
