/**
 * Seed script — populates MongoDB with demo data from PRD section 16.
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/env');
const User = require('../models/User');
const Company = require('../models/Company');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const AuditLog = require('../models/AuditLog');
const { calculateFee } = require('../utils/domain');

const seed = async () => {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB. Clearing existing data...');
  await Promise.all([
    User.deleteMany(),
    Company.deleteMany(),
    Contract.deleteMany(),
    Invoice.deleteMany(),
    InvoiceLine.deleteMany(),
    Dispute.deleteMany(),
    Recovery.deleteMany(),
    AuditLog.deleteMany(),
  ]);

  // Admin + operator accounts
  const admin = await User.create({
    name: 'Platform Admin',
    email: config.admin.email,
    password: config.admin.password,
    role: 'admin',
    isVerified: true,
  });
  const operator = await User.create({
    name: 'Review Operator',
    email: 'operator@freightguard.ai',
    password: 'Operator@12345',
    role: 'operator',
    isVerified: true,
  });
  console.log('Created admin + operator accounts.');

  // Demo company + user (Priya Nair)
  const priya = await User.create({
    name: 'Priya Nair',
    email: 'priya@harborline.com',
    password: 'Demo@12345',
    role: 'user',
    isVerified: true,
  });
  const company = await Company.create({
    name: 'Harborline Imports',
    email: 'priya@harborline.com',
    owner: priya._id,
    plan: 'free',
    feePct: 25,
  });
  priya.company = company._id;
  await priya.save();

  // Staff accounts also belong to the seeded company so their company-scoped
  // workspace views (dashboard, invoices, contracts) show the starter records.
  admin.company = company._id;
  operator.company = company._id;
  await Promise.all([admin.save(), operator.save()]);

  // Contracts
  const contract1 = await Contract.create({
    company: company._id,
    carrierName: 'TransMarine Lines',
    port: 'Port of Los Angeles',
    containerType: '40gp',
    freeDays: 4,
    currency: 'USD',
    dayRule: 'calendar',
    tiers: [
      { dayFrom: 1, dayTo: 5, rate: 75 },
      { dayFrom: 6, dayTo: 10, rate: 120 },
      { dayFrom: 11, dayTo: 999, rate: 180 },
    ],
    effectiveDate: new Date('2026-01-01'),
  });
  const contract2 = await Contract.create({
    company: company._id,
    carrierName: 'Maersk',
    port: 'Port of Los Angeles',
    containerType: '40hc',
    freeDays: 5,
    currency: 'USD',
    dayRule: 'working',
    tiers: [
      { dayFrom: 1, dayTo: 7, rate: 90 },
      { dayFrom: 8, dayTo: 999, rate: 150 },
    ],
  });
  const contract3 = await Contract.create({
    company: company._id,
    carrierName: 'Hapag-Lloyd',
    port: 'Port of New York',
    containerType: 'reefer',
    freeDays: 3,
    currency: 'USD',
    dayRule: 'calendar',
    tiers: [{ dayFrom: 1, dayTo: 10, rate: 110 }],
  });

  // Invoices — the full audit example from PRD
  const inv1 = await Invoice.create({
    company: company._id,
    contract: contract1._id,
    invoiceNumber: 'TRM-2026-04412',
    carrierName: 'TransMarine Lines',
    port: 'Port of Los Angeles',
    containerNumber: 'TCLU-4829137',
    billedDateStart: new Date('2026-09-01'),
    billedDateEnd: new Date('2026-09-20'),
    totalBilled: 1840,
    currency: 'USD',
    auditStatus: 'audited',
  });
  await InvoiceLine.insertMany([
    {
      invoice: inv1._id,
      feeType: 'demurrage',
      description: 'Demurrage days 1-10',
      days: 10,
      rate: 120,
      billedAmount: 1200,
      verdict: 'overcharged',
      correctAmount: 720,
      reason: 'Billed 10 days at $120, but only 6 chargeable days after 4 free days at $120.',
      confidence: 0.92,
      customerDecision: 'accept',
      customerReviewedBy: priya._id,
      customerReviewedAt: new Date(),
      operatorDecision: 'confirmed',
      operatorReviewedBy: operator._id,
      operatorReviewedAt: new Date(),
      reviewStatus: 'confirmed',
      reviewedBy: operator._id,
      reviewedAt: new Date(),
    },
    {
      invoice: inv1._id,
      feeType: 'detention',
      description: 'Detention days 1-7',
      days: 7,
      rate: 90,
      billedAmount: 630,
      verdict: 'invalid',
      correctAmount: 0,
      reason: 'Days billed (7) exceed free time; rate mismatch and duplicate of demurrage period.',
      confidence: 0.68,
      reviewStatus: 'unreviewed',
    },
    {
      invoice: inv1._id,
      feeType: 'demurrage',
      description: 'Duplicate demurrage',
      days: 10,
      rate: 40,
      billedAmount: 10,
      verdict: 'invalid',
      correctAmount: 0,
      reason: 'Duplicate charge: same fee type and dates appear twice.',
      confidence: 0.85,
      reviewStatus: 'unreviewed',
    },
  ]);

  const inv2 = await Invoice.create({
    company: company._id,
    contract: contract2._id,
    invoiceNumber: 'MSK-2026-11890',
    carrierName: 'Maersk',
    port: 'Port of Los Angeles',
    containerNumber: 'MRDU-7721904',
    billedDateStart: new Date('2026-09-05'),
    billedDateEnd: new Date('2026-09-15'),
    totalBilled: 940,
    currency: 'USD',
    auditStatus: 'audited',
  });
  await InvoiceLine.insertMany([
    {
      invoice: inv2._id,
      feeType: 'demurrage',
      description: 'Demurrage 8 days',
      days: 8,
      rate: 90,
      billedAmount: 720,
      verdict: 'ok',
      correctAmount: 720,
      reason: 'Charge matches contract terms.',
      confidence: 0.95,
      customerDecision: 'accept',
      customerReviewedBy: priya._id,
      customerReviewedAt: new Date(),
      operatorDecision: 'confirmed',
      operatorReviewedBy: operator._id,
      operatorReviewedAt: new Date(),
      reviewStatus: 'confirmed',
    },
    {
      invoice: inv2._id,
      feeType: 'detention',
      description: 'Detention 2 days',
      days: 2,
      rate: 110,
      billedAmount: 220,
      verdict: 'overcharged',
      correctAmount: 0,
      reason: 'Within free time allowance of 5 days.',
      confidence: 0.91,
      reviewStatus: 'unreviewed',
    },
  ]);

  const inv3 = await Invoice.create({
    company: company._id,
    contract: contract3._id,
    invoiceNumber: 'HPL-2026-09331',
    carrierName: 'Hapag-Lloyd',
    port: 'Port of New York',
    containerNumber: 'HLGU-3391200',
    billedDateStart: new Date('2026-10-01'),
    billedDateEnd: new Date('2026-10-08'),
    totalBilled: 550,
    currency: 'USD',
    auditStatus: 'audited',
  });
  await InvoiceLine.insertMany([
    {
      invoice: inv3._id,
      feeType: 'demurrage',
      description: 'Demurrage 5 days',
      days: 5,
      rate: 110,
      billedAmount: 550,
      verdict: 'ok',
      correctAmount: 550,
      reason: 'Charge matches contract terms.',
      confidence: 0.94,
    },
  ]);

  const inv4 = await Invoice.create({
    company: company._id,
    invoiceNumber: 'TRM-2026-04560',
    carrierName: 'TransMarine Lines',
    port: 'Port of Los Angeles',
    containerNumber: 'TCLU-4900112',
    totalBilled: 310,
    auditStatus: 'pending',
  });

  const inv5 = await Invoice.create({
    company: company._id,
    invoiceNumber: 'MSC-2026-22001',
    carrierName: 'MSC',
    port: 'Port of New York',
    containerNumber: 'MSCU-1122334',
    totalBilled: 1275,
    auditStatus: 'pending',
  });

  // Disputes
  const d1 = await Dispute.create({
    invoice: inv1._id,
    company: company._id,
    status: 'won',
    disputedAmount: 930,
    letterText: 'Dispute letter for TRM-2026-04412...',
    sentAt: new Date('2026-09-25'),
  });
  await Dispute.create({
    invoice: inv2._id,
    company: company._id,
    status: 'sent',
    disputedAmount: 220,
    letterText: 'Dispute letter for MSK-2026-11890...',
    sentAt: new Date('2026-10-01'),
    responseDueDate: new Date('2026-10-15'),
  });
  await Dispute.create({
    invoice: inv3._id,
    company: company._id,
    status: 'under_review',
    disputedAmount: 0,
    letterText: 'Under review...',
    sentAt: new Date('2026-10-10'),
  });
  await Dispute.create({
    invoice: inv4._id,
    company: company._id,
    status: 'draft',
    disputedAmount: 0,
    letterText: 'Draft letter...',
  });
  await Dispute.create({
    invoice: inv5._id,
    company: company._id,
    status: 'lost',
    disputedAmount: 275,
    letterText: 'Dispute lost...',
    sentAt: new Date('2026-08-01'),
  });
  await Dispute.create({
    invoice: inv1._id,
    company: company._id,
    status: 'draft',
    disputedAmount: 100,
    letterText: 'Second draft...',
  });

  // Recovery: $2,845 recovered at the configured contingency fee (25% by default)
  const recoveredAmount = 2845;
  await Recovery.create({
    dispute: d1._id,
    company: company._id,
    amount: recoveredAmount,
    feePct: config.defaultFeePct,
    feeAmount: calculateFee(recoveredAmount, config.defaultFeePct),
    recoveredAt: new Date('2026-10-20'),
    billingStatus: 'due',
  });

  console.log('Seed complete.');
  console.log('Demo credentials:');
  console.log(`  Admin:    ${config.admin.email} / ${config.admin.password}`);
  console.log('  Operator: operator@freightguard.ai / Operator@12345');
  console.log('  User:     priya@harborline.com / Demo@12345');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
