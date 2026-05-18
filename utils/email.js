import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // or any other service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEnquiryNotification = async (enquiry) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'admin@tripinvilla.com', // Admin or owner email
    subject: `New Enquiry for ${enquiry.propertyName || 'Property'}`,
    html: `
      <h2>New Enquiry Received</h2>
      <p><strong>Name:</strong> ${enquiry.name}</p>
      <p><strong>Email:</strong> ${enquiry.email}</p>
      <p><strong>Phone:</strong> ${enquiry.phone}</p>
      <p><strong>Message:</strong> ${enquiry.message}</p>
      <p><strong>Property:</strong> ${enquiry.propertyName || 'N/A'}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const sendOTPEmail = async (email, name, otpCode, propertyName) => {
  const mailOptions = {
    from: `"Tripinstays" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🔐 Your OTP Code for ${propertyName || 'Tripinstays'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 16px; padding: 32px; box-sizing: border-box;">
        <h2 style="color: #1F2937; font-size: 24px; font-weight: 700; margin-bottom: 16px; font-family: 'Lato', sans-serif;">Verify Your Request</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 24px; margin-bottom: 24px; font-family: 'Lato', sans-serif;">
          Hi ${name || 'Guest'},<br><br>
          We received a request to view the host's contact details for <strong>${propertyName || 'our villa stay'}</strong>. Use the secure 6-digit verification code below to authorize this request:
        </p>
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563EB;">${otpCode}</span>
        </div>
        <p style="color: #9CA3AF; font-size: 13px; line-height: 20px; margin: 0; font-family: 'Lato', sans-serif;">
          This OTP code is valid for exactly <strong>5 minutes</strong>. If you did not make this request, please safely disregard this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP Email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

export const sendHostLeadAlert = async (hostEmail, hostName, guestName, guestPhone, guestEmail, propertyName) => {
  // Clean phone number for WhatsApp link
  const cleanPhone = guestPhone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(guestName)},%20thanks%20for%20expressing%20interest%20in%20our%20property%20${encodeURIComponent(propertyName)}!%20Let's%20connect.`;

  const mailOptions = {
    from: `"Tripinstays" <${process.env.EMAIL_USER}>`,
    to: hostEmail,
    subject: `🔥 Hot Lead Alert: ${guestName} unlocked your contact number!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #F59E0B; border-radius: 16px; padding: 32px; box-sizing: border-box; background-color: #FFFDF5;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 40px;">🔥</span>
        </div>
        <h2 style="color: #D97706; font-size: 24px; font-weight: 700; margin-bottom: 8px; font-family: 'Lato', sans-serif; text-align: center;">New Lead Alert!</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 24px; margin-bottom: 24px; font-family: 'Lato', sans-serif; text-align: center;">
          Hello <strong>${hostName}</strong>,<br><br>
          A potential guest has just successfully verified their details and **unlocked your contact number** for <strong>${propertyName}</strong>!
        </p>
        
        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; color: #1F2937; font-size: 18px; margin-bottom: 16px; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px;">Guest Details</h3>
          <p style="margin: 8px 0; color: #4B5563;"><strong style="color: #1F2937;">Name:</strong> ${guestName}</p>
          <p style="margin: 8px 0; color: #4B5563;"><strong style="color: #1F2937;">Email:</strong> ${guestEmail}</p>
          <p style="margin: 8px 0; color: #4B5563;"><strong style="color: #1F2937;">Phone:</strong> ${guestPhone}</p>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${whatsappUrl}" target="_blank" style="background-color: #25D366; color: white; padding: 14px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 15px; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.3);">
            💬 Chat with Guest on WhatsApp
          </a>
        </div>
        
        <p style="color: #9CA3AF; font-size: 13px; line-height: 20px; margin: 0; font-family: 'Lato', sans-serif; text-align: center;">
          Get ready! They might call or message you any minute now.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Lead Alert email successfully sent to owner: ${hostEmail}`);
  } catch (error) {
    console.error('Error sending lead alert email to host:', error);
  }
};
