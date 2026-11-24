const Recovery = require('../models/Recovery');

const list = async (req, res) => {
  const recoveries = await Recovery.find({ company: req.user.company })
    .populate({
      path: 'dispute',
      select: 'status disputedAmount',
      populate: { path: 'invoice', select: 'invoiceNumber carrierName' },
    })
    .sort({ recoveredAt: -1 });

  res.json({ success: true, count: recoveries.length, data: recoveries });
};

/** Mark the contingency fee as settled. Restricted to staff at the route level. */
const updateBilling = async (req, res) => {
  const { billingStatus } = req.body;
  const recovery = await Recovery.findOneAndUpdate(
    { _id: req.params.id, company: req.user.company },
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

module.exports = { list, updateBilling };
