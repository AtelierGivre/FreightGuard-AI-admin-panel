const mongoose = require('mongoose');
const Recovery = require('../models/Recovery');
const { STAFF_ROLES } = require('../config/constants');
const { parsePagination } = require('../utils/pagination');
const { round2 } = require('../utils/round');

const populateRecovery = (query) =>
  query.populate({
    path: 'dispute',
    select: 'status disputedAmount',
    populate: { path: 'invoice', select: 'invoiceNumber carrierName' },
  });

const list = async (req, res) => {
  const { limit, skip, meta } = parsePagination(req.query);
  const filter = { company: req.user.company };
  const companyId = req.user.company ? new mongoose.Types.ObjectId(String(req.user.company)) : null;
  const summaryQuery = companyId
    ? Recovery.aggregate([
        { $match: { company: companyId } },
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
            fees: { $sum: '$feeAmount' },
            due: {
              $sum: { $cond: [{ $ne: ['$billingStatus', 'paid'] }, '$feeAmount', 0] },
            },
          },
        },
      ])
    : Promise.resolve([]);
  const [recoveries, total, summaryRows] = await Promise.all([
    populateRecovery(Recovery.find(filter)).sort({ recoveredAt: -1 }).skip(skip).limit(limit),
    Recovery.countDocuments(filter),
    summaryQuery,
  ]);
  const summary = {
    amount: round2(summaryRows[0]?.amount || 0),
    fees: round2(summaryRows[0]?.fees || 0),
    due: round2(summaryRows[0]?.due || 0),
  };

  res.json({
    success: true,
    count: recoveries.length,
    total,
    meta: meta(total, { summary }),
    data: recoveries,
  });
};

/** Recovery attached to one dispute, used by the dispute detail panel. */
const getForDispute = async (req, res) => {
  const recovery = await populateRecovery(
    Recovery.findOne({ dispute: req.params.disputeId, company: req.user.company }),
  );
  res.json({ success: true, data: recovery });
};

/** Mark the contingency fee as settled. Restricted to staff at the route level. */
const updateBilling = async (req, res) => {
  const { billingStatus } = req.body;
  // Staff can bill any tenant's recovery. Customers are limited to their own.
  const filter = STAFF_ROLES.includes(req.user.role)
    ? { _id: req.params.id }
    : { _id: req.params.id, company: req.user.company };
  const recovery = await Recovery.findOneAndUpdate(
    filter,
    {
      billingStatus,
      billedAt: billingStatus === 'paid' ? new Date() : null,
    },
    { new: true, runValidators: true },
  ).populate({
    path: 'dispute',
    select: 'status disputedAmount',
    populate: { path: 'invoice', select: 'invoiceNumber carrierName' },
  });

  if (!recovery) return res.status(404).json({ success: false, message: 'Recovery not found' });
  res.json({ success: true, data: recovery });
};

module.exports = { list, getForDispute, updateBilling };
