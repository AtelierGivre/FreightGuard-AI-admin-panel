const User = require('../models/User');
const Company = require('../models/Company');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Platform-wide statistics */
const getStats = async (req, res) => {
  const [users, companies, invoices, disputes, recoveries, lines] = await Promise.all([
    User.countDocuments(),
    Company.countDocuments(),
    Invoice.find(),
    Dispute.find(),
    Recovery.find(),
    InvoiceLine.find(),
  ]);

  const totalBilled = round2(invoices.reduce((s, i) => s + (i.totalBilled || 0), 0));
  const flaggedAmount = round2(
    lines
      .filter((l) => l.verdict !== 'ok' && l.verdict !== 'skipped')
      .reduce((s, l) => s + ((l.billedAmount || 0) - (l.correctAmount || 0)), 0)
  );
  const recoveredAmount = round2(recoveries.reduce((s, r) => s + (r.amount || 0), 0));
  const fees = round2(recoveries.reduce((s, r) => s + (r.feeAmount || 0), 0));

  res.json({
    success: true,
    data: {
      users: { total: users, operators: await User.countDocuments({ role: 'operator' }), admins: await User.countDocuments({ role: 'admin' }) },
      companies: companies,
      invoices: {
        total: invoices.length,
        audited: invoices.filter((i) => i.auditStatus === 'audited').length,
        pending: invoices.filter((i) => i.auditStatus === 'pending').length,
        totalBilled,
      },
      flags: { total: lines.filter((l) => l.verdict !== 'ok').length, flaggedAmount },
      disputes: {
        total: disputes.length,
        draft: disputes.filter((d) => d.status === 'draft').length,
        active: disputes.filter((d) => ['sent', 'under_review'].includes(d.status)).length,
        won: disputes.filter((d) => d.status === 'won').length,
        lost: disputes.filter((d) => d.status === 'lost').length,
      },
      recoveries: { total: recoveries.length, recoveredAmount, fees },
    },
  });
};

/** Operator review queue — low-confidence or unreviewed flags */
const getReviewQueue = async (req, res) => {
  const { status = 'unreviewed', limit = 50, page = 1 } = req.query;
  const filter = { reviewStatus: status };
  if (req.query.invoiceId) filter.invoice = req.query.invoiceId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    InvoiceLine.find(filter)
      .populate({ path: 'invoice', select: 'invoiceNumber carrierName port containerNumber company', populate: { path: 'company', select: 'name' } })
      .sort({ confidence: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    InvoiceLine.countDocuments(filter),
  ]);

  res.json({ success: true, count: items.length, total, page: Number(page), data: items });
};

/** Review a single flagged line */
const reviewLine = async (req, res) => {
  const { reviewStatus, reviewNote, correctAmount, verdict } = req.body;
  const line = await InvoiceLine.findById(req.params.id);
  if (!line) return res.status(404).json({ success: false, message: 'Line not found' });

  line.reviewStatus = reviewStatus || 'confirmed';
  line.reviewedBy = req.user._id;
  line.reviewedAt = new Date();
  if (reviewNote) line.reviewNote = reviewNote;
  if (correctAmount !== undefined) line.correctAmount = correctAmount;
  if (verdict) line.verdict = verdict;
  await line.save();

  res.json({ success: true, data: line });
};

/** User management */
const listUsers = async (req, res) => {
  const users = await User.find().populate('company', 'name plan').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
};

const updateUser = async (req, res) => {
  const { role, isActive } = req.body;
  const update = {};
  if (role) update.role = role;
  if (isActive !== undefined) update.isActive = isActive;

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('company', 'name');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
};

const deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, message: 'User deleted' });
};

/** All invoices platform-wide */
const allInvoices = async (req, res) => {
  const invoices = await Invoice.find()
    .populate('company', 'name')
    .populate('contract', 'carrierName port')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: invoices.length, data: invoices });
};

/** All disputes platform-wide */
const allDisputes = async (req, res) => {
  const disputes = await Dispute.find()
    .populate('company', 'name')
    .populate('invoice', 'invoiceNumber carrierName containerNumber')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: disputes.length, data: disputes });
};

/** Platform settings / fee configuration */
const getSettings = async (req, res) => {
  const companies = await Company.find();
  res.json({
    success: true,
    data: {
      defaultFeePct: 25,
      companies: companies.map((c) => ({ id: c._id, name: c.name, feePct: c.feePct, plan: c.plan })),
    },
  });
};

module.exports = {
  getStats,
  getReviewQueue,
  reviewLine,
  listUsers,
  updateUser,
  deleteUser,
  allInvoices,
  allDisputes,
  getSettings,
};
