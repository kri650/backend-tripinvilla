import express from 'express';
import PricingRule from '../models/PricingRule.js';
import { protect, ownerOnly } from '../middleware/auth.js';

const router = express.Router();

// GET all rules for the current owner
router.get('/', protect, ownerOnly, async (req, res) => {
  try {
    const rules = await PricingRule.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST add a rule
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const rule = new PricingRule({
      ...req.body,
      owner: req.user._id
    });
    await rule.save();
    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update a rule
router.put('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const rule = await PricingRule.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a rule
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const rule = await PricingRule.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json({ message: 'Rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
