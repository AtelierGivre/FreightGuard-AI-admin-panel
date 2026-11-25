const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

  let company;
  try {
    // Share one id so the company owner is valid before either write lands.
    // If user creation fails, remove the company in the catch below.
    const userId = new mongoose.Types.ObjectId();
    company = await Company.create({
      name: companyName || `${name}'s Company`,
      email,
      owner: userId,
    });

    const user = await User.create({
      _id: userId,
      name,
      email,
      password,
      company: company._id,
    });

    const token = signToken(user._id);
    return res.status(201).json({
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
  } catch (error) {
    if (company) await Company.deleteOne({ _id: company._id });
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    throw error;
  }
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
