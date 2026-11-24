const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Company = require('../models/Company');
const Contract = require('../models/Contract');
const Invoice = require('../models/Invoice');
const InvoiceLine = require('../models/InvoiceLine');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const AuditJob = require('../models/AuditJob');
const controller = require('../controllers/adminController');

test('tenant cleanup cascades across every workspace collection', async () => {
  const calls = [];
  const originals = [];
  const stub = (model, key, value) => {
    originals.push([model, key, model[key]]);
    model[key] = value;
  };
  const deleteMany = (name) => async (filter) => {
    calls.push({ model: name, filter });
  };

  stub(Company, 'findById', async () => ({ _id: 'target-company' }));
  stub(Company, 'findByIdAndDelete', async (id) => {
    calls.push({ model: 'Company.delete', id });
  });
  stub(Invoice, 'find', () => ({
    select: async () => [{ _id: 'invoice-1' }],
  }));
  stub(User, 'deleteMany', deleteMany('User.deleteMany'));
  stub(Contract, 'deleteMany', deleteMany('Contract.deleteMany'));
  stub(Invoice, 'deleteMany', deleteMany('Invoice.deleteMany'));
  stub(InvoiceLine, 'deleteMany', deleteMany('InvoiceLine.deleteMany'));
  stub(Dispute, 'deleteMany', deleteMany('Dispute.deleteMany'));
  stub(Recovery, 'deleteMany', deleteMany('Recovery.deleteMany'));
  stub(AuditJob, 'deleteMany', deleteMany('AuditJob.deleteMany'));

  let response;
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      response = payload;
      return this;
    },
  };

  try {
    await controller.deleteCompany(
      { user: { company: 'own-company' }, params: { id: 'target-company' } },
      res,
    );
  } finally {
    for (const [model, key, value] of originals) model[key] = value;
  }

  assert.equal(response.success, true);
  const deletedModels = calls.filter((call) => call.model.endsWith('.delete')).map((c) => c.model);
  assert.deepEqual(deletedModels, ['Company.delete']);
  const cascaded = Object.fromEntries(
    calls.filter((call) => call.model.endsWith('deleteMany')).map((c) => [c.model, c.filter]),
  );
  assert.deepEqual(cascaded['User.deleteMany'], { company: 'target-company' });
  assert.deepEqual(cascaded['Contract.deleteMany'], { company: 'target-company' });
  assert.deepEqual(cascaded['Invoice.deleteMany'], { company: 'target-company' });
  assert.deepEqual(cascaded['InvoiceLine.deleteMany'], { invoice: { $in: ['invoice-1'] } });
  assert.deepEqual(cascaded['AuditJob.deleteMany'], { invoice: { $in: ['invoice-1'] } });
  assert.deepEqual(cascaded['Dispute.deleteMany'], { company: 'target-company' });
  assert.deepEqual(cascaded['Recovery.deleteMany'], { company: 'target-company' });
});

test('tenant cleanup refuses to delete the caller company', async () => {
  let statusCode;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };

  await controller.deleteCompany(
    { user: { company: 'same-company' }, params: { id: 'same-company' } },
    res,
  );

  assert.equal(statusCode, 400);
});
