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
      if (req.user._id && req.user._id.toString().startsWith('fake_')) {
        return res.json([]);
      }
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
    if (req.user._id && req.user._id.toString().startsWith("fake_")) {
      return res.json([]);
    }
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
      if (req.user._id && req.user._id.toString().startsWith('fake_')) {
        return res.json([]);
      }
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
    const { property_id, propertyId, user_id, user_name, phone, email, query, message, name, property, propertyName } = req.body;
    
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

// POST /api/enquiries/send-otp (Send secure OTP code via MSG91)
router.post('/send-otp', async (req, res) => {
  try {
    const { email, name, phone, propertyName } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone Number are required.' });
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit Indian number required.' });
    }

    const MSG91_API_KEY = process.env.MSG91_API_KEY || 'dummy_msg91_key';
    const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || 'dummy_template';

    // Store OTP context keyed by phone number
    await OTP.findOneAndUpdate(
      { phone: cleanPhone },
      { 
        name,
        email: email ? email.toLowerCase().trim() : '',
        propertyName,
        createdAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (MSG91_API_KEY === 'dummy_msg91_key') {
      console.log(`[MOCK] MSG91 OTP request simulated for 91${cleanPhone}`);
      return res.json({ success: true, channel: 'sms', message: 'OTP sent successfully (Mock)' });
    }

    const axios = (await import('axios')).default;
    const response = await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        template_id: TEMPLATE_ID,
        mobile: `91${cleanPhone}`,
        otp_length: 6,
        otp_expiry: 5
      },
      {
        headers: {
          'authkey': MSG91_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[MSG91] OTP Sent:', response.data);
    res.json({ success: true, channel: 'sms', message: 'OTP sent successfully via MSG91' });
  } catch (err) {
    console.error('Send OTP Error:', err?.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Failed to dispatch verification code. Please try again.' });
  }
});

// POST /api/enquiries/verify-otp (Verify OTP code by phone via MSG91 and email owner)
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP code are required.' });
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }

    const MSG91_API_KEY = process.env.MSG91_API_KEY || 'dummy_msg91_key';
    let isVerified = false;

    if (MSG91_API_KEY === 'dummy_msg91_key' && otp === '123456') {
      isVerified = true;
    } else if (MSG91_API_KEY !== 'dummy_msg91_key') {
      const axios = (await import('axios')).default;
      const response = await axios.get(`https://control.msg91.com/api/v5/otp/verify`, {
        params: { mobile: `91${cleanPhone}`, otp: otp },
        headers: { 'authkey': MSG91_API_KEY }
      });
      if (response.data.type === 'success') {
        isVerified = true;
      }
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check and try again.' });
    }

    const dbRecord = await OTP.findOne({ phone: cleanPhone });
    const uName = dbRecord?.name || 'Guest';
    const propName = dbRecord?.propertyName || 'Property';

    const property = await Property.findOne({ name: { $regex: new RegExp(propName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'i') } }).populate('owner');

    const newEnquiry = await Enquiry.create({
      property_id: property?._id || new mongoose.Types.ObjectId(),
      user_name: uName,
      email: dbRecord?.email || 'guest@tripinvilla.com',
      phone: cleanPhone,
      query: `Verified via MSG91 OTP request to view host contact number for property: ${propName}`,
      property: property?._id,
      name: uName,
      message: `Verified via MSG91 OTP request to view host contact number for property: ${propName}`,
      propertyName: property?.name || propName,
      status: 'Open'
    });

    if (property && property.owner) {
      const ownerEmail = property.owner.email;
      const ownerName = property.owner.name;

      const userWaLink = `https://wa.me/91${cleanPhone}?text=Hi%20${encodeURIComponent(uName)},%20I%20am%20the%20owner%20of%20${encodeURIComponent(propName)}.%20How%20can%20I%20help%20you?`;

      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'dummy@gmail.com',
          pass: process.env.EMAIL_PASS || 'dummy'
        }
      });
      
      const mailOptions = {
        from: process.env.EMAIL_USER || 'no-reply@tripinvilla.com',
        to: ownerEmail,
        subject: `New Guest Enquiry for ${propName}`,
        html: `
          <h3>Hello ${ownerName},</h3>
          <p>A guest has verified their phone number and is interested in your property: <strong>${propName}</strong></p>
          <p><strong>Guest Name:</strong> ${uName}</p>
          <p><strong>Guest Phone:</strong> +91 ${cleanPhone}</p>
          <br/>
          <p>You can chat with them directly on WhatsApp by clicking the link below:</p>
          <a href="${userWaLink}" style="display: inline-block; padding: 10px 20px; background-color: #25D366; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Chat on WhatsApp</a>
          <br/><br/>
          <p>Best regards,<br/>TripInVilla Team</p>
        `
      };

      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          await transporter.sendMail(mailOptions);
        } else {
          console.log(`[MOCK EMAIL] Sent to ${ownerEmail}`);
          console.log(`[MOCK EMAIL] WhatsApp Link: ${userWaLink}`);
        }
      } catch (err) {
        console.error('Error sending email to owner:', err.message);
      }
    }

    await OTP.deleteOne({ phone: cleanPhone });
    console.log(`[OTP] ✅ Phone ${cleanPhone} verified successfully.`);

    res.json({ success: true, message: 'Phone verified successfully!', enquiry: newEnquiry });
  } catch (err) {
    console.error('Verify OTP Endpoint Error:', err?.response?.data || err.message);
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
