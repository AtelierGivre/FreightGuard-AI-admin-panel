const mongoose = require('mongoose');

const recoverySchema = new mongoose.Schema(
  {
    dispute: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    amount: { type: Number, required: true },
    feeAmount: { type: Number, required: true },
    feePct: { type: Number, default: 25 },
    recoveredAt: { type: Date, default: Date.now },
    billingStatus: {
      type: String,
      enum: ['due', 'paid'],
      default: 'due',
    },
    billedAt: { type: Date },
  },
  { timestamps: true },
);

recoverySchema.index({ company: 1, recoveredAt: -1 });
recoverySchema.index({ dispute: 1 }, { unique: true });

module.exports = mongoose.model('Recovery', recoverySchema);
