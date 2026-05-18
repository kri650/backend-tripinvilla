import express from 'express';
import Enquiry from '../models/Enquiry.js';
import Property from '../models/Property.js';
import { protect } from '../middleware/auth.js';
import { sendEnquiryNotification, sendOTPEmail, sendHostLeadAlert } from '../utils/email.js';
import { sendSMSOTP } from '../utils/sms.js';

const router = express.Router();

// Temporary memory store for active OTP codes (valid for 5 minutes)
const activeOTPs = new Map();

// GET all enquiries (admin/owner only)
router.get('/', protect, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(50);
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE direct enquiry
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

// POST /api/enquiries/send-otp (Send secure OTP code via SMS / Fast2SMS with Email fallback)
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name, phone, propertyName } = req.body;
    
    if (!email || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Name, Email, and Phone Number are required to request OTP.' });
    }

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in active OTPs map (expires in 5 minutes)
    activeOTPs.set(email.toLowerCase().trim(), {
      otp: otpCode,
      name,
      phone,
      propertyName,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    let sentViaSMS = false;

    // 1. Try sending via Fast2SMS if API key is present
    if (process.env.FAST2SMS_API_KEY) {
      try {
        const smsResult = await sendSMSOTP(phone, otpCode);
        if (smsResult.success) {
          sentViaSMS = true;
          console.log(`[OTP] Successfully sent OTP SMS to guest: ${phone}`);
        }
      } catch (smsErr) {
        console.error('[OTP] Fast2SMS dispatch failed, attempting email fallback:', smsErr);
      }
    }

    // 2. Fall back to Email if SMS failed or Fast2SMS is not configured
    if (!sentViaSMS) {
      console.log('[OTP] Sending OTP via Email fallback...');
      await sendOTPEmail(email, name, otpCode, propertyName);
    }

    res.json({ 
      success: true, 
      message: sentViaSMS 
        ? `A 6-digit secure code has been sent directly to your phone number via SMS.` 
        : `A 6-digit secure verification code has been sent to your email address.` 
    });
  } catch (err) {
    console.error('Send OTP Endpoint Error:', err);
    res.status(500).json({ success: false, message: 'Failed to dispatch verification code. Please check your credentials.' });
  }
});

// POST /api/enquiries/verify-otp (Verify OTP code and create enquiry)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const key = email.toLowerCase().trim();
    const cachedRecord = activeOTPs.get(key);

    if (!cachedRecord) {
      return res.status(400).json({ success: false, message: 'No active OTP request found for this email.' });
    }

    if (Date.now() > cachedRecord.expiresAt) {
      activeOTPs.delete(key);
      return res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new one.' });
    }

    if (cachedRecord.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check and try again.' });
    }

    // OTP is valid! Automatically create the enquiry in the database
    const enquiryData = {
      name: cachedRecord.name,
      email: key,
      phone: cachedRecord.phone || 'N/A',
      propertyName: cachedRecord.propertyName || 'Kasol Stay',
      message: `Verified OTP request for host contact number on property: ${cachedRecord.propertyName}`
    };

    const newEnquiry = await Enquiry.create(enquiryData);

    // Send email notification to admin in background
    sendEnquiryNotification(newEnquiry).catch(err => console.error(err));

    // Lookup the Property Owner to send Direct Lead Email & WhatsApp alerts
    try {
      const propName = cachedRecord.propertyName;
      // Search for the property in database (case-insensitive)
      const property = await Property.findOne({ name: { $regex: new RegExp(propName, 'i') } }).populate('owner');
      
      if (property && property.owner) {
        const ownerEmail = property.owner.email;
        const ownerName = property.owner.name;
        const ownerPhone = property.owner.phone || 'N/A';

        // 1. Send Email alert directly to the Host/Owner with direct WhatsApp deep-link!
        sendHostLeadAlert(ownerEmail, ownerName, cachedRecord.name, cachedRecord.phone || 'N/A', key, propName).catch(err => console.error(err));

        // 2. Simulated WhatsApp Notification Trigger
        console.log('\n=========================================');
        console.log('📱 SIMULATED WHATSAPP NOTIFICATION TRIGGERED');
        console.log(`TO OWNER (${ownerName} - ${ownerPhone})`);
        console.log(`MESSAGE: "Hi ${ownerName}, a user named ${cachedRecord.name} (${cachedRecord.phone}) has unlocked your contact number for property '${propName}'. Standby for a call!"`);
        console.log('=========================================\n');
      }
    } catch (ownerAlertErr) {
      console.error('Failed to dispatch host lead alert:', ownerAlertErr);
    }

    // Clear the used OTP cache
    activeOTPs.delete(key);

    res.json({ success: true, message: 'Verification successful!', enquiry: newEnquiry });
  } catch (err) {
    console.error('Verify OTP Endpoint Error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
});

// PUT reply to enquiry (admin/owner)
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
