import express from 'express';
import Enquiry from '../models/Enquiry.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(50);
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

import { sendEnquiryNotification } from '../utils/email.js';

router.post('/', async (req, res) => {
  try {
    const enquiry = await Enquiry.create(req.body);
    // Send email notification in background
    sendEnquiryNotification(enquiry).catch(err => console.error(err));
    res.status(201).json(enquiry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/reply', protect, async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { reply: req.body.reply, status: 'Replied', repliedAt: new Date() },
      { new: true }
    );
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
