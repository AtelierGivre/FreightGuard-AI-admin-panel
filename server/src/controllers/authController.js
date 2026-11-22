const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const Company = require('../models/Company');

const signToken = (id) => jwt.sign({ id }, config.jwt.secret, { expiresIn: config.jwt.expire });

const register = async (req, res) => {
  const { name, email, password, companyName } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({ name, email, password });

  const company = await Company.create({
    name: companyName || `${name}'s Company`,
    email,
    owner: user._id,
  });
  user.company = company._id;
  await user.save();

  const token = signToken(user._id);
  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: company._id,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is inactive' });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
    },
  });
};

const getMe = async (req, res) => {
  const company = req.user.company ? await Company.findById(req.user.company) : null;
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      company,
      isActive: req.user.isActive,
    },
  });
};

module.exports = { register, login, getMe };
