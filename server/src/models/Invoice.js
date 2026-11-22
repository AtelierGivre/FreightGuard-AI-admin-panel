const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    invoiceNumber: { type: String, required: true, trim: true },
    carrierName: { type: String, required: true, trim: true },
    port: { type: String, required: true, trim: true },
    containerNumber: { type: String, trim: true },
    billedDateStart: { type: Date },
    billedDateEnd: { type: Date },
    currency: { type: String, default: 'USD' },
    totalBilled: { type: Number, required: true, default: 0 },
    fileUrl: { type: String },
    fileName: { type: String },
    fileHash: { type: String },
    auditStatus: {
      type: String,
      enum: ['pending', 'processing', 'audited', 'failed'],
      default: 'pending',
    },
    rawJson: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

invoiceSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
