const test = require('node:test');
const assert = require('node:assert/strict');
const Recovery = require('../models/Recovery');
const controller = require('../controllers/recoveryController');

const mockRes = () => ({
  body: null,
  json(payload) {
    this.body = payload;
    return this;
  },
});

const withStub = async (req, assertion) => {
  const original = Recovery.findOneAndUpdate;
  let filter;
  Recovery.findOneAndUpdate = (value) => {
    filter = value;
    return {
      populate: async () => ({ _id: 'recovery-1', billingStatus: req.body.billingStatus }),
    };
  };
  const res = mockRes();
  try {
    await controller.updateBilling(req, res);
  } finally {
    Recovery.findOneAndUpdate = original;
  }
  assertion(filter, res);
};

test('staff can bill a recovery without belonging to its company', async () => {
  await withStub(
    {
      user: { role: 'admin' },
      params: { id: 'recovery-1' },
      body: { billingStatus: 'paid' },
    },
    (filter, res) => {
      assert.deepEqual(filter, { _id: 'recovery-1' });
      assert.equal(res.body.data.billingStatus, 'paid');
    },
  );
});

test('customer billing stays scoped to the caller company', async () => {
  await withStub(
    {
      user: { role: 'user', company: 'company-1' },
      params: { id: 'recovery-1' },
      body: { billingStatus: 'due' },
    },
    (filter) => {
      assert.deepEqual(filter, { _id: 'recovery-1', company: 'company-1' });
    },
  );
});
