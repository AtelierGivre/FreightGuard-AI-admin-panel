const User = require('../models/User');
const Company = require('../models/Company');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const AuditJob = require('../models/AuditJob');
const config = require('../config/env');
const { ROLES, STAFF_ROLES } = require('../config/constants');
const { round2 } = require('../utils/round');
const { isFlagged } = require('../utils/domain');

/** Platform-wide statistics for the admin overview. */
const getStats = async (req, res) => {
  const [companyCount, users, invoices, disputes, recoveries, lines] = await Promise.all([
    Company.countDocuments(),
    User.find().select('role'),
    Invoice.find(),
    Dispute.find(),
    Recovery.find(),
    InvoiceLine.find(),
  ]);

  const totalBilled = round2(
    invoices.reduce((sum, invoice) => sum + (invoice.totalBilled || 0), 0),
  );
  const flaggedAmount = round2(
    lines
      .filter(isFlagged)
      .reduce((sum, line) => sum + ((line.billedAmount || 0) - (line.correctAmount || 0)), 0),
  );
  const recoveredAmount = round2(recoveries.reduce((sum, item) => sum + (item.amount || 0), 0));
  const fees = round2(recoveries.reduce((sum, item) => sum + (item.feeAmount || 0), 0));

  res.json({
    success: true,
    data: {
      users: {
        total: users.length,
        operators: users.filter((user) => user.role === ROLES.OPERATOR).length,
        admins: users.filter((user) => user.role === ROLES.ADMIN).length,
      },
      companies: companyCount,
      invoices: {
        total: invoices.length,
        audited: invoices.filter((invoice) => invoice.auditStatus === 'audited').length,
        pending: invoices.filter((invoice) => invoice.auditStatus === 'pending').length,
        totalBilled,
      },
      flags: { total: lines.filter(isFlagged).length, flaggedAmount },
      disputes: {
        total: disputes.length,
        draft: disputes.filter((dispute) => dispute.status === 'draft').length,
        active: disputes.filter((dispute) => ['sent', 'under_review'].includes(dispute.status))
          .length,
        won: disputes.filter((dispute) => dispute.status === 'won').length,
        lost: disputes.filter((dispute) => dispute.status === 'lost').length,
      },
      recoveries: { total: recoveries.length, recoveredAmount, fees },
    },
  });
};

/** Paginated operator review queue (unreviewed flags first). */
const getReviewQueue = async (req, res) => {
  const { status = 'unreviewed', limit = 50, page = 1, invoiceId } = req.query;
  const filter = { reviewStatus: status };
  if (invoiceId) filter.invoice = invoiceId;

  const pageNumber = Number(page);
  const pageSize = Number(limit);
  const skip = (pageNumber - 1) * pageSize;

  const [items, total] = await Promise.all([
    InvoiceLine.find(filter)
      .populate({
        path: 'invoice',
        select: 'invoiceNumber carrierName port containerNumber company',
        populate: { path: 'company', select: 'name' },
      })
      .sort({ confidence: 1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    InvoiceLine.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: items.length,
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    data: items,
  });
};

/** Review a single flagged line. */
const reviewLine = async (req, res) => {
  const { reviewStatus, reviewNote, correctAmount, verdict } = req.body;
  const line = await InvoiceLine.findById(req.params.id);
  if (!line) return res.status(404).json({ success: false, message: 'Line not found' });

  line.reviewStatus = reviewStatus || 'confirmed';
  line.reviewedBy = req.user._id;
  line.reviewedAt = new Date();
  if (reviewNote !== undefined) line.reviewNote = reviewNote;
  if (correctAmount !== undefined) line.correctAmount = correctAmount;
  if (verdict !== undefined) line.verdict = verdict;
  await line.save();

  return res.json({ success: true, data: line });
};

/** User management (admin only at the route level). */
const listUsers = async (req, res) => {
  const users = await User.find().populate('company', 'name plan').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
};

const updateUser = async (req, res) => {
  const update = {};
  if (req.body.role !== undefined) update.role = req.body.role;
  if (req.body.isActive !== undefined) update.isActive = req.body.isActive;
  if (req.body.name !== undefined) update.name = req.body.name;

  // Prevent an admin from locking themselves out by demoting/deactivating self.
  if (String(req.user._id) === req.params.id) {
    if (update.role && update.role !== ROLES.ADMIN) {
      return res
        .status(400)
        .json({ success: false, message: 'You cannot demote your own account' });
    }
    if (update.isActive === false) {
      return res
        .status(400)
        .json({ success: false, message: 'You cannot deactivate your own account' });
    }
  }

  const user = await User.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  }).populate('company', 'name');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, data: user });
};

const deleteUser = async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, message: 'User deleted' });
};

/** Delete a tenant and its workspace data (admin only). */
const deleteCompany = async (req, res) => {
  if (String(req.user.company) === req.params.id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own company' });
  }

  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

  const invoices = await Invoice.find({ company: company._id }).select('_id');
  const invoiceIds = invoices.map((invoice) => invoice._id);

  await Promise.all([
    User.deleteMany({ company: company._id }),
    Contract.deleteMany({ company: company._id }),
    Dispute.deleteMany({ company: company._id }),
    Recovery.deleteMany({ company: company._id }),
  ]);
  await Promise.all([
    InvoiceLine.deleteMany({ invoice: { $in: invoiceIds } }),
    AuditJob.deleteMany({ invoice: { $in: invoiceIds } }),
    Invoice.deleteMany({ company: company._id }),
  ]);
  await Company.findByIdAndDelete(company._id);

  return res.json({ success: true, message: 'Company and workspace data deleted' });
};

/** Platform-wide invoice oversight. */
const allInvoices = async (req, res) => {
  const invoices = await Invoice.find()
    .populate('company', 'name')
    .populate('contract', 'carrierName port')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: invoices.length, data: invoices });
};

/** Platform-wide dispute oversight. */
const allDisputes = async (req, res) => {
  const disputes = await Dispute.find()
    .populate('company', 'name')
    .populate('invoice', 'invoiceNumber carrierName containerNumber')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: disputes.length, data: disputes });
};

/** Fee configuration shown in the admin settings screen. */
const getSettings = async (req, res) => {
  const companies = await Company.find().select('name feePct plan');
  res.json({
    success: true,
    data: {
      defaultFeePct: config.defaultFeePct,
      staffRoles: STAFF_ROLES,
      companies: companies.map((company) => ({
        id: company._id,
        name: company.name,
        feePct: company.feePct,
        plan: company.plan,
      })),
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
  deleteCompany,
  allInvoices,
  allDisputes,
  getSettings,
};
