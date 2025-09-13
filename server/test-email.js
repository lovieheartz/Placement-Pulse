require('dotenv').config();
const nodemailer = require('nodemailer');

// Create a test email transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Log email configuration
console.log('Email configuration:', {
  service: 'Gmail',
  user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '...' : 'Not set',
  pass: process.env.EMAIL_PASSWORD ? 'Set (hidden)' : 'Not set'
});

// Verify connection
transporter.verify((err, success) => {
  if (err) {
    console.error('SMTP transporter failed:', err);
  } else {
    console.log('SMTP transporter is ready');
    
    // Send a test email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'Test Email from NSEC Placement Portal',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from the NSEC Placement Portal.</p>
        <p>If you're seeing this, the email configuration is working correctly.</p>
      `,
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending test email:', error);
      } else {
        console.log('Test email sent successfully:', info.messageId);
      }
    });
  }
});