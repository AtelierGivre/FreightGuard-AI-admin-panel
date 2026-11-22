const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, default: 'free' },
    feePct: { type: Number, default: 25, min: 0, max: 100 },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
