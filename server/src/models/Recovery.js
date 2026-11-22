const mongoose = require('mongoose');

const recoverySchema = new mongoose.Schema(
  {
    dispute: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    amount: { type: Number, required: true },
    feeAmount: { type: Number, required: true },
    feePct: { type: Number, default: 25 },
    recoveredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recovery', recoverySchema);
