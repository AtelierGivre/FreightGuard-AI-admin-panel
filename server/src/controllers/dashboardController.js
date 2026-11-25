const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const InvoiceLine = require('../models/InvoiceLine');
const config = require('../config/env');
const { round2 } = require('../utils/round');
const { isFlagged } = require('../utils/domain');
const { weeklyRecoverySeries } = require('../utils/recoverySeries');

/**
 * Company-scoped dashboard data. Every query is filtered by `req.user.company`
 * so one customer can never see another customer's numbers.
 */
const getDashboard = async (req, res) => {
  const companyId = req.user.company;

  const [company, invoices, disputes, recoveries] = await Promise.all([
    Company.findById(companyId).select('feePct'),
    Invoice.find({ company: companyId }),
    Dispute.find({ company: companyId }).populate('invoice', 'invoiceNumber'),
    Recovery.find({ company: companyId }),
  ]);

  const lines = await InvoiceLine.find({
    invoice: { $in: invoices.map((invoice) => invoice._id) },
  });

  const totalBilled = round2(
    invoices.reduce((sum, invoice) => sum + (invoice.totalBilled || 0), 0),
  );
  const flaggedAmount = round2(
    lines
      .filter(isFlagged)
      .reduce((sum, line) => sum + ((line.billedAmount || 0) - (line.correctAmount || 0)), 0),
  );
  const recoveredAmount = round2(recoveries.reduce((sum, item) => sum + (item.amount || 0), 0));
  const feeDue = round2(
    recoveries
      .filter((item) => item.billingStatus !== 'paid')
      .reduce((sum, item) => sum + (item.feeAmount || 0), 0),
  );

  res.json({
    success: true,
    data: {
      kpis: {
        auditedInvoices: invoices.filter((invoice) => invoice.auditStatus === 'audited').length,
        totalInvoices: invoices.length,
        totalBilled,
        flaggedAmount,
        recoveredAmount,
        recoveryRate: totalBilled > 0 ? round2((recoveredAmount / totalBilled) * 100) : 0,
        feeDue,
        feePct: Number(company?.feePct ?? config.defaultFeePct),
        activeDisputes: disputes.filter((dispute) => !['won', 'lost'].includes(dispute.status))
          .length,
      },
      invoices: invoices.slice(0, 8).map((invoice) => ({
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        carrierName: invoice.carrierName,
        totalBilled: invoice.totalBilled,
        auditStatus: invoice.auditStatus,
        createdAt: invoice.createdAt,
      })),
      disputes: disputes.slice(0, 8).map((dispute) => ({
        id: dispute._id,
        invoiceNumber: dispute.invoice?.invoiceNumber || '',
        status: dispute.status,
        disputedAmount: dispute.disputedAmount,
        createdAt: dispute.createdAt,
      })),
      weekly: weeklyRecoverySeries(recoveries),
    },
  });
};

module.exports = { getDashboard };
