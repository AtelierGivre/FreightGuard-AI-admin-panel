const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    feeType: {
      type: String,
      enum: ['demurrage', 'detention', 'other'],
      default: 'demurrage',
    },
    description: { type: String },
    days: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    billedAmount: { type: Number, required: true },
    verdict: {
      type: String,
      enum: ['ok', 'overcharged', 'invalid', 'skipped'],
      default: 'ok',
    },
    correctAmount: { type: Number },
    reason: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    // Admin/operator review fields
    reviewStatus: {
      type: String,
      enum: ['unreviewed', 'confirmed', 'rejected'],
      default: 'unreviewed',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

invoiceLineSchema.index({ invoice: 1 });
invoiceLineSchema.index({ reviewStatus: 1, confidence: 1 });

module.exports = mongoose.model('InvoiceLine', invoiceLineSchema);
