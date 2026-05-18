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
