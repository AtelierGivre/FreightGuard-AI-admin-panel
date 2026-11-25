const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const Dispute = require('../models/Dispute');
const Recovery = require('../models/Recovery');
const { authorize } = require('../middleware/auth');
const authController = require('../controllers/authController');
const invoiceController = require('../controllers/invoiceController');
const disputeController = require('../controllers/disputeController');
const recoveryController = require('../controllers/recoveryController');

const mockRes = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const stub = (target, key, value) => {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
};

const withStubs = async (pairs, fn) => {
  const restores = [];
  try {
    for (const [target, key, value] of pairs) restores.push(stub(target, key, value));
    return await fn();
  } finally {
    restores.reverse().forEach((restore) => restore());
  }
};

test('register rejects a duplicate email before creating a company', async () => {
  let companyCreated = false;
  const res = mockRes();

  await withStubs(
    [
      [
        User,
        'findOne',
        async (filter) => {
          assert.deepEqual(filter, { email: 'ada@example.com' });
          return { _id: 'existing-user' };
        },
      ],
      [
        Company,
        'create',
        async () => {
          companyCreated = true;
          throw new Error('Company.create must not run for a duplicate email');
        },
      ],
    ],
    () =>
      authController.register(
        { body: { name: 'Ada', email: 'ada@example.com', password: 'password123' } },
        res,
      ),
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Email already registered');
  assert.equal(companyCreated, false);
});

test('register can be retried after a duplicate write cleans up the company', async () => {
  let createAttempts = 0;
  let deletedCompany;
  const first = mockRes();
  const second = mockRes();

  await withStubs(
    [
      [User, 'findOne', async () => null],
      [Company, 'create', async () => ({ _id: `company-${createAttempts + 1}` })],
      [
        User,
        'create',
        async (payload) => {
          createAttempts += 1;
          if (createAttempts === 1) {
            const error = new Error('duplicate');
            error.code = 11000;
            throw error;
          }
          return {
            _id: payload._id,
            name: payload.name,
            email: payload.email,
            role: 'user',
            company: payload.company,
          };
        },
      ],
      [
        Company,
        'deleteOne',
        async (filter) => {
          deletedCompany = filter;
        },
      ],
    ],
    async () => {
      const body = { name: 'Ada', email: 'ada@example.com', password: 'password123' };
      await authController.register({ body }, first);
      await authController.register({ body }, second);
    },
  );

  assert.equal(first.statusCode, 400);
  assert.deepEqual(deletedCompany, { _id: 'company-1' });
  assert.equal(second.statusCode, 201);
  assert.equal(second.body.user.company, 'company-2');
});

test('role guard blocks operators from admin-only routes and allows staff billing', () => {
  const denied = mockRes();
  const allowed = mockRes();
  let nextCalls = 0;

  authorize('admin')({ user: { role: 'operator' } }, denied, () => {
    nextCalls += 1;
  });
  authorize('operator', 'admin')({ user: { role: 'operator' } }, allowed, () => {
    nextCalls += 1;
  });

  assert.equal(denied.statusCode, 403);
  assert.equal(allowed.statusCode, null);
  assert.equal(nextCalls, 1);
});

test('detail lookups always include the caller company in the filter', async () => {
  const filters = {};
  const invoiceRes = mockRes();
  const disputeRes = mockRes();
  const recoveryRes = mockRes();

  await withStubs(
    [
      [
        Invoice,
        'findOne',
        (filter) => {
          filters.invoice = filter;
          return { populate: async () => null };
        },
      ],
      [
        Dispute,
        'findOne',
        (filter) => {
          filters.dispute = filter;
          return {
            populate() {
              return this;
            },
            sort: async () => null,
          };
        },
      ],
      [
        Recovery,
        'findOne',
        (filter) => {
          filters.recovery = filter;
          return { populate: async () => null };
        },
      ],
    ],
    async () => {
      const req = {
        user: { company: 'company-a' },
        params: { id: 'invoice-1', disputeId: 'dispute-1' },
      };
      await invoiceController.get(req, invoiceRes);
      await disputeController.get(req, disputeRes);
      await recoveryController.getForDispute(req, recoveryRes);
    },
  );

  assert.deepEqual(filters.invoice, { _id: 'invoice-1', company: 'company-a' });
  assert.deepEqual(filters.dispute, { _id: 'invoice-1', company: 'company-a' });
  assert.deepEqual(filters.recovery, {
    dispute: 'dispute-1',
    company: 'company-a',
  });
  assert.equal(invoiceRes.statusCode, 404);
  assert.equal(disputeRes.statusCode, 404);
  assert.equal(recoveryRes.statusCode, null);
  assert.equal(recoveryRes.body.data, null);
});

const sessionStub = () => ({
  withTransaction: async (fn) => fn(),
  endSession: async () => {},
});

test('a second recovery attempt is rejected before any cash is written', async () => {
  let recoveryCreated = false;
  const res = mockRes();

  await withStubs(
    [
      [mongoose, 'startSession', async () => sessionStub()],
      [Dispute, 'findOne', () => ({ session: async () => ({ _id: 'dispute-1', status: 'won' }) })],
      [Dispute, 'findOneAndUpdate', async () => null],
      [
        Recovery,
        'create',
        async () => {
          recoveryCreated = true;
          throw new Error('Recovery.create must not run for a won dispute');
        },
      ],
    ],
    () =>
      disputeController.recordRecovery(
        {
          user: { company: 'company-a' },
          params: { id: 'dispute-1' },
          body: { amount: 100 },
        },
        res,
      ),
  );

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /Cannot record a recovery/);
  assert.equal(recoveryCreated, false);
});

test('a duplicate recovery key returns a friendly 400', async () => {
  let recoveryAttempted = false;
  const res = mockRes();

  await withStubs(
    [
      [mongoose, 'startSession', async () => sessionStub()],
      [Dispute, 'findOne', () => ({ session: async () => ({ _id: 'dispute-1', status: 'sent' }) })],
      [Dispute, 'findOneAndUpdate', async () => ({ _id: 'dispute-1', status: 'won' })],
      [Company, 'findById', () => ({ session: async () => ({ feePct: 25 }) })],
      [
        Recovery,
        'create',
        async () => {
          recoveryAttempted = true;
          const error = new Error('duplicate key');
          error.code = 11000;
          throw error;
        },
      ],
    ],
    () =>
      disputeController.recordRecovery(
        {
          user: { company: 'company-a' },
          params: { id: 'dispute-1' },
          body: { amount: 100 },
        },
        res,
      ),
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /already recorded/);
  assert.equal(recoveryAttempted, true);
});

test('won requires a recovery and cannot be set by status alone', async () => {
  let saved = false;
  let recoveryLookups = 0;
  let recoveryFilter;
  const denied = mockRes();
  const allowed = mockRes();

  await withStubs(
    [
      [
        Dispute,
        'findOne',
        async () => ({
          _id: 'dispute-1',
          status: 'sent',
          save: async () => {
            saved = true;
          },
        }),
      ],
      [
        Recovery,
        'findOne',
        async (filter) => {
          recoveryLookups += 1;
          recoveryFilter = filter;
          return recoveryLookups === 1 ? null : { _id: 'recovery-1' };
        },
      ],
    ],
    async () => {
      const req = {
        user: { company: 'company-a' },
        params: { id: 'dispute-1' },
        body: { status: 'won' },
      };
      await disputeController.updateStatus(req, denied);
      await disputeController.updateStatus(req, allowed);
    },
  );

  assert.equal(denied.statusCode, 400);
  assert.match(denied.body.message, /Record a recovery/);
  assert.deepEqual(recoveryFilter, { dispute: 'dispute-1', company: 'company-a' });
  assert.equal(allowed.statusCode, null);
  assert.equal(allowed.body.success, true);
  assert.equal(saved, true);
});
