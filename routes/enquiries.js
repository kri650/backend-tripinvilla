import express from 'express';
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
    const properties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);

    const enquiries = await Enquiry.find({ property_id: { $in: propertyIds } })
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

// GET owner's enquiries with filter options
// GET /api/enquiries/owner/filter
router.get('/owner/filter', protect, ownerOnly, async (req, res) => {
  try {
    const { date_from, date_to, property_type, location, search } = req.query;

    const propertyFilter = { owner: req.user._id };
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
    const enquiries = await Enquiry.find(query).populate('property_id', 'name location').sort({ createdAt: -1 }).limit(50);
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE direct enquiry (Public - no auth)
router.post('/', async (req, res) => {
  try {
    const { property_id, user_id, user_name, phone, email, query, message, name, property } = req.body;
    
    const propId = property_id || property;
    const uName = user_name || name || 'Guest';
    const qText = query || message || 'No message provided';

    const pDoc = await Property.findById(propId);
    if (!pDoc) return res.status(404).json({ message: 'Property not found' });

    const newEnquiry = await Enquiry.create({
      property_id: propId,
      user_id: user_id || null,
      user_name: uName,
      phone: phone || 'N/A',
      email: email,
      query: qText,
      
      // Compatibility fields
      property: propId,
      name: uName,
      message: qText,
      propertyName: pDoc.name,
      status: 'Open'
    });

    sendEnquiryNotification(newEnquiry).catch(err => console.error(err));
    res.status(201).json(newEnquiry);
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

    const key = email.toLowerCase().trim();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.findOneAndUpdate(
      { email: key },
      { 
        otp: otpCode,
        name,
        phone,
        propertyName,
        createdAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let sentViaSMS = false;

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
    const dbRecord = await OTP.findOne({ email: key });

    if (!dbRecord) {
      return res.status(400).json({ success: false, message: 'Verification code has expired or was never requested. Please request a new one.' });
    }

    if (dbRecord.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check and try again.' });
    }

    const propName = dbRecord.propertyName || 'Kasol Stay';
    const property = await Property.findOne({ name: { $regex: new RegExp(propName, 'i') } }).populate('owner');

    const enquiryData = {
      property_id: property?._id || new mongoose.Types.ObjectId(),
      user_name: dbRecord.name,
      email: key,
      phone: dbRecord.phone || 'N/A',
      query: `Verified OTP request for host contact number on property: ${propName}`,

      // Compatibility fields
      property: property?._id,
      name: dbRecord.name,
      message: `Verified OTP request for host contact number on property: ${propName}`,
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

        sendHostLeadAlert(ownerEmail, ownerName, dbRecord.name, dbRecord.phone || 'N/A', key, propName).catch(err => console.error(err));

        const waMessage =
          `Hi ${ownerName}, a user named ${dbRecord.name} (${dbRecord.phone || 'N/A'}) ` +
          `has unlocked your contact number for property '${propName}'. ` +
          `Guest email: ${key}. Standby for a call/message.`;

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

    await OTP.deleteOne({ email: key });
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
