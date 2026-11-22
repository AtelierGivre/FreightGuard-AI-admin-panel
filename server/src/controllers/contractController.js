const Contract = require('../models/Contract');

const list = async (req, res) => {
  const contracts = await Contract.find({ company: req.user.company }).sort({ createdAt: -1 });
  res.json({ success: true, count: contracts.length, data: contracts });
};

const get = async (req, res) => {
  const contract = await Contract.findOne({ _id: req.params.id, company: req.user.company });
  if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
  res.json({ success: true, data: contract });
};

const create = async (req, res) => {
  const payload = { ...req.body, company: req.user.company };
  const contract = await Contract.create(payload);
  res.status(201).json({ success: true, data: contract });
};

const update = async (req, res) => {
  const contract = await Contract.findOneAndUpdate(
    { _id: req.params.id, company: req.user.company },
    req.body,
    { new: true, runValidators: true }
  );
  if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
  res.json({ success: true, data: contract });
};

const remove = async (req, res) => {
  const contract = await Contract.findOneAndDelete({ _id: req.params.id, company: req.user.company });
  if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
  res.json({ success: true, message: 'Contract deleted' });
};

module.exports = { list, get, create, update, remove };
