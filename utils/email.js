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
