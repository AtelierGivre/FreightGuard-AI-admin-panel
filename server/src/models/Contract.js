const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    carrierName: { type: String, required: true, trim: true },
    port: { type: String, required: true, trim: true },
    containerType: {
      type: String,
      enum: ['20gp', '40gp', '40hc', 'reefer'],
      default: '40gp',
    },
    freeDays: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    dayRule: { type: String, enum: ['calendar', 'working'], default: 'calendar' },
    tiers: [
      {
        dayFrom: { type: Number, required: true },
        dayTo: { type: Number, required: true },
        rate: { type: Number, required: true },
      },
    ],
    effectiveDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

contractSchema.index({ company: 1, carrierName: 1, port: 1 }, { unique: true });

module.exports = mongoose.model('Contract', contractSchema);
