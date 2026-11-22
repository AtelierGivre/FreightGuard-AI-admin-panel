const Invoice = require('../models/Invoice');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const InvoiceLine = require('../models/InvoiceLine');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const getDashboard = async (req, res) => {
  const companyId = req.user.company;

  const [invoices, disputes, recoveries] = await Promise.all([
    Invoice.find({ company: companyId }),
    Dispute.find({ company: companyId }),
    Recovery.find({ company: companyId }),
  ]);

  const invoiceIds = invoices.map((i) => i._id);
  const lines = await InvoiceLine.find({ invoice: { $in: invoiceIds } });

  const totalBilled = round2(invoices.reduce((s, i) => s + (i.totalBilled || 0), 0));
  const flaggedLines = lines.filter((l) => l.verdict !== 'ok' && l.verdict !== 'skipped');
  const flaggedAmount = round2(
    flaggedLines.reduce((s, l) => s + ((l.billedAmount || 0) - (l.correctAmount || 0)), 0)
  );
  const recoveredAmount = round2(recoveries.reduce((s, r) => s + (r.amount || 0), 0));
  const feeDue = round2(recoveries.reduce((s, r) => s + (r.feeAmount || 0), 0));

  res.json({
    success: true,
    data: {
      kpis: {
        auditedInvoices: invoices.filter((i) => i.auditStatus === 'audited').length,
        totalInvoices: invoices.length,
        totalBilled,
        flaggedAmount,
        recoveredAmount,
        recoveryRate: totalBilled > 0 ? round2((recoveredAmount / totalBilled) * 100) : 0,
        feeDue,
        activeDisputes: disputes.filter((d) => !['won', 'lost'].includes(d.status)).length,
      },
      invoices: invoices.slice(0, 8).map((i) => ({
        id: i._id,
        invoiceNumber: i.invoiceNumber,
        carrierName: i.carrierName,
        amount: i.totalBilled,
        auditStatus: i.auditStatus,
        createdAt: i.createdAt,
      })),
      disputes: disputes.slice(0, 8).map((d) => ({
        id: d._id,
        status: d.status,
        disputedAmount: d.disputedAmount,
        createdAt: d.createdAt,
      })),
    },
  });
};

module.exports = { getDashboard };
