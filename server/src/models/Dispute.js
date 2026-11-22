const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'under_review', 'won', 'lost'],
      default: 'draft',
    },
    disputedAmount: { type: Number, required: true, default: 0 },
    responseDueDate: { type: Date },
    letterText: { type: String },
    sentAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

disputeSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
