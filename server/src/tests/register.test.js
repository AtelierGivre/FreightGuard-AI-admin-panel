const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Company = require('../models/Company');
const controller = require('../controllers/authController');

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

const stub = (model, key, value) => {
  const original = model[key];
  model[key] = value;
  return () => {
    model[key] = original;
  };
};

test('register creates the company and user as one linked pair', async () => {
  const restores = [];
  let companyPayload;
  let userPayload;

  restores.push(stub(User, 'findOne', async () => null));
  restores.push(
    stub(Company, 'create', async (payload) => {
      companyPayload = payload;
      return { _id: 'company-1' };
    }),
  );
  restores.push(
    stub(User, 'create', async (payload) => {
      userPayload = payload;
      return {
        _id: payload._id,
        name: payload.name,
        email: payload.email,
        role: 'user',
        company: payload.company,
      };
    }),
  );

  const res = mockRes();
  try {
    await controller.register(
      { body: { name: 'Ada', email: 'ada@example.com', password: 'password123' } },
      res,
    );
  } finally {
    restores.forEach((restore) => restore());
  }

  assert.equal(res.statusCode, 201);
  assert.equal(String(companyPayload.owner), String(userPayload._id));
  assert.equal(userPayload.company, 'company-1');
  assert.equal(res.body.user.company, 'company-1');
});

test('register removes the company when user creation fails', async () => {
  const restores = [];
  let deletedCompany;

  restores.push(stub(User, 'findOne', async () => null));
  restores.push(stub(Company, 'create', async () => ({ _id: 'company-2' })));
  restores.push(
    stub(User, 'create', async () => {
      const error = new Error('duplicate');
      error.code = 11000;
      throw error;
    }),
  );
  restores.push(
    stub(Company, 'deleteOne', async (filter) => {
      deletedCompany = filter;
    }),
  );

  const res = mockRes();
  try {
    await controller.register(
      { body: { name: 'Ada', email: 'ada@example.com', password: 'password123' } },
      res,
    );
  } finally {
    restores.forEach((restore) => restore());
  }

  assert.deepEqual(deletedCompany, { _id: 'company-2' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'Email already registered');
});
