import express from 'express';
import mongoose from 'mongoose';
import Enquiry from '../models/Enquiry.js';
import Property from '../models/Property.js';
import OTP from '../models/OTP.js';
import { protect, ownerOnly } from '../middleware/auth.js';
import { sendEnquiryNotification, sendOTPEmail, sendHostLeadAlert } from '../utils/email.js';
import { sendSMSOTP } from '../utils/sms.js';
import { sendWhatsAppText } from '../utils/whatsapp.js';

const router = express.Router();

// GET owner's inbox (all enquiries matching owner's properties)
// GET /api/enquiries/owner
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    let enquiries;
    if (['admin', 'super_admin'].includes(req.user?.role)) {
      enquiries = await Enquiry.find()
        .populate('property_id', 'name location city type')
        .sort({ createdAt: -1 });
    } else {
      const properties = await Property.find({ owner: req.user._id }).select('_id');
      const propertyIds = properties.map(p => p._id);
      enquiries = await Enquiry.find({ property_id: { $in: propertyIds } })
        .populate('property_id', 'name location city type')
        .sort({ createdAt: -1 });
    }

    const formatted = enquiries.map((e, idx) => {
      const obj = e.toObject();
      return {
        ...obj,
        id: e._id,
        enquiryNo: `ENQ-${4000 + enquiries.length - idx}`,
        createdAt: e.createdAt,
        user_name: e.user_name || e.name || 'Guest',
        phone: e.phone || 'N/A',
        email: e.email,
        query: e.query || e.message || '',
        propertyName: e.property_id?.name || e.propertyName || 'Property'
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET logged-in user's own enquiries
// GET /api/enquiries/user
router.get('/user', protect, async (req, res) => {
  try {
    const emailQuery = req.user.email ? { email: { $regex: new RegExp(`^${req.user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } } : null;
    const searchFilter = emailQuery 
      ? { $or: [ { user_id: req.user._id }, emailQuery ] } 
      : { user_id: req.user._id };

    const enquiries = await Enquiry.find(searchFilter)
      .populate('property_id', 'name location images')
      .sort({ createdAt: -1 });

    const formatted = enquiries.map((e, idx) => ({
      ...e.toObject(),
      id: e._id,
      enquiryNo: `ENQ-${4000 + enquiries.length - idx}`,
      propertyName: e.property_id?.name || e.propertyName || 'Property Enquiry',
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET owner's enquiries with filter options
// GET /api/enquiries/owner/filter
router.get('/owner/filter', protect, ownerOnly, async (req, res) => {
  try {
    const { date_from, date_to, property_type, location, search } = req.query;

    const propertyFilter = {};
    if (!['admin', 'super_admin'].includes(req.user?.role)) {
      propertyFilter.owner = req.user._id;
    }
    if (property_type) {
      propertyFilter.type = property_type;
    }
    if (location) {
      propertyFilter.$or = [
        { location: { $regex: location, $options: 'i' } },
        { city: { $regex: location, $options: 'i' } }
      ];
    }

    const properties = await Property.find(propertyFilter).select('_id');
    const propertyIds = properties.map(p => p._id);

    const enquiryFilter = { property_id: { $in: propertyIds } };

    if (date_from || date_to) {
      enquiryFilter.createdAt = {};
      if (date_from) {
        enquiryFilter.createdAt.$gte = new Date(date_from);
      }
      if (date_to) {
        const dateToObj = new Date(date_to);
        dateToObj.setHours(23, 59, 59, 999);
        enquiryFilter.createdAt.$lte = dateToObj;
      }
    }

    if (search) {
      enquiryFilter.$or = [
        { user_name: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { query: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const enquiries = await Enquiry.find(enquiryFilter)
      .populate('property_id', 'name location city type')
      .sort({ createdAt: -1 });

    const formatted = enquiries.map((e, idx) => {
      const obj = e.toObject();
      return {
        ...obj,
        id: e._id,
        enquiryNo: `ENQ-${4000 + enquiries.length - idx}`,
        createdAt: e.createdAt,
        user_name: e.user_name || e.name || 'Guest',
        phone: e.phone || 'N/A',
        email: e.email,
        query: e.query || e.message || '',
        propertyName: e.property_id?.name || e.propertyName || 'Property'
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all enquiries (legacy support)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.email = req.user.email;
    }
    const enquiries = await Enquiry.find(query).populate('property_id', 'name location images').sort({ createdAt: -1 }).limit(50);
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE direct enquiry (Public - no auth)
router.post('/', async (req, res) => {
  try {
    const { property_id, propertyId, user_id, user_name, phone, email, query, message, name, property } = req.body;
    
    const propId = property_id || propertyId || property;
    const uName = user_name || name || 'Guest';
    const qText = query || message || 'No message provided';

    let pDoc;
    try {
      if (mongoose.Types.ObjectId.isValid(propId)) {
        pDoc = await Property.findById(propId);
      }
    } catch(e) {}
    
    // For mock properties that don't exist in DB
    const finalPropId = pDoc ? pDoc._id : new mongoose.Types.ObjectId();
    const finalPropName = pDoc ? pDoc.name : (propertyName || name || 'Mock Property');

    const newEnquiry = await Enquiry.create({
      property_id: finalPropId,
      user_id: user_id || null,
      user_name: uName,
      phone: phone || 'N/A',
      email: email,
      query: qText,
      
      // Compatibility fields
      property: finalPropId,
      name: uName,
      message: qText,
      propertyName: finalPropName,
      status: 'Open'
    });

    sendEnquiryNotification(newEnquiry).catch(err => console.error(err));
    res.status(201).json(newEnquiry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/enquiries/send-otp (Send secure OTP code via SMS / Fast2SMS)
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name, phone, propertyName } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone Number are required to request OTP.' });
    }

    // Normalize phone: strip non-digits, remove leading 91 for 12-digit numbers
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP keyed by phone number (TTL auto-expires after 5 minutes)
    await OTP.findOneAndUpdate(
      { phone: cleanPhone },
      { 
        otp: otpCode,
        name,
        email: email ? email.toLowerCase().trim() : '',
        propertyName,
        createdAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[OTP] Generated OTP ${otpCode} for phone ${cleanPhone}`);

    let sentViaSMS = false;

    if (process.env.FAST2SMS_API_KEY) {
      try {
        const smsResult = await sendSMSOTP(cleanPhone, otpCode);
        if (smsResult.success) {
          sentViaSMS = true;
          console.log(`[OTP] ✅ SMS sent successfully to ${cleanPhone}`);
        } else {
          console.error('[OTP] Fast2SMS returned failure:', smsResult);
        }
      } catch (smsErr) {
        console.error('[OTP] Fast2SMS dispatch failed:', smsErr.message);
      }
    } else {
      console.warn('[OTP] FAST2SMS_API_KEY not set. Cannot send SMS.');
    }

    // Email fallback if SMS fails or no API key is configured
    if (!sentViaSMS && email) {
      console.log('[OTP] No SMS gateway configured or SMS failed — sending OTP via email fallback...');
      await sendOTPEmail(email, name, otpCode, propertyName);
      return res.json({ 
        success: true, 
        channel: 'email',
        message: `A 6-digit verification code has been sent to your email address.`
      });
    }

    if (!sentViaSMS && !email) {
      // Log OTP to console for debugging when SMS fails and no email provided
      console.log(`\n========================================`);
      console.log(`📱 OTP FOR ${cleanPhone}: ${otpCode}`);
      console.log(`(SMS dispatch failed — check Fast2SMS API key/balance)`);
      console.log(`========================================\n`);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send SMS. Please check your phone number and try again.'
      });
    }

    res.json({ 
      success: true,
      channel: 'sms',
      message: `A 6-digit verification code has been sent to your phone number via SMS.`
    });
  } catch (err) {
    console.error('Send OTP Endpoint Error:', err);
    res.status(500).json({ success: false, message: 'Failed to dispatch verification code. Please try again.' });
  }
});

// POST /api/enquiries/verify-otp (Verify OTP code by phone and create enquiry)
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP code are required.' });
    }

    // Normalize phone
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }

    const dbRecord = await OTP.findOne({ phone: cleanPhone });

    if (!dbRecord) {
      return res.status(400).json({ success: false, message: 'Verification code has expired or was never requested. Please request a new code.' });
    }

    if (dbRecord.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check and try again.' });
    }

    const propName = dbRecord.propertyName || 'TripInVilla Property';
    const property = await Property.findOne({ name: { $regex: new RegExp(propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }).populate('owner');

    const enquiryData = {
      property_id: property?._id || new mongoose.Types.ObjectId(),
      user_name: dbRecord.name,
      email: dbRecord.email || 'guest@tripinvilla.com',
      phone: cleanPhone,
      query: `Verified SMS OTP request to view host contact number for property: ${propName}`,

      // Compatibility fields
      property: property?._id,
      name: dbRecord.name,
      message: `Verified SMS OTP request to view host contact number for property: ${propName}`,
      propertyName: property?.name || propName,
      status: 'Open'
    };

    const newEnquiry = await Enquiry.create(enquiryData);
    sendEnquiryNotification(newEnquiry).catch(err => console.error(err));

    try {
      if (property && property.owner) {
        const ownerEmail = property.owner.email;
        const ownerName = property.owner.name;
        const ownerPhone = property.owner.phone || 'N/A';

        sendHostLeadAlert(
          ownerEmail, ownerName, dbRecord.name,
          cleanPhone, dbRecord.email || 'N/A', propName
        ).catch(err => console.error(err));

        const waMessage =
          `Hi ${ownerName}, a user named ${dbRecord.name} (+91${cleanPhone}) ` +
          `has verified via SMS OTP and unlocked your contact number for '${propName}'. ` +
          `Guest phone: +91${cleanPhone}. Standby for a call.`;

        try {
          const waResult = await sendWhatsAppText(ownerPhone, waMessage);
          if (!waResult.success) {
            console.log('\n=========================================');
            console.log('📱 SIMULATED WHATSAPP NOTIFICATION (ENV NOT CONFIGURED)');
            console.log(`TO OWNER (${ownerName} - ${ownerPhone})`);
            console.log(`MESSAGE: "${waMessage}"`);
            console.log('=========================================\n');
          }
        } catch (waErr) {
          console.error('WhatsApp dispatch failed:', waErr?.message || waErr);
        }
      }
    } catch (ownerAlertErr) {
      console.error('Failed to dispatch host lead alert:', ownerAlertErr);
    }

    // Delete OTP record after successful verification
    await OTP.deleteOne({ phone: cleanPhone });
    console.log(`[OTP] ✅ Phone ${cleanPhone} verified successfully.`);

    res.json({ success: true, message: 'Phone verified successfully!', enquiry: newEnquiry });
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
