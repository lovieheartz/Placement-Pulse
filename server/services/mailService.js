// services/mailService.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify email configuration
console.log('Email configuration:', {
  service: 'Gmail',
  user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '...' : 'Not set',
  pass: process.env.EMAIL_PASSWORD ? 'Set (hidden)' : 'Not set'
});

transporter.verify((err, success) => {
  if (err) {
    console.error('SMTP transporter failed:', err);
  } else {
    console.log('SMTP transporter is ready');
  }
});

const sendPasswordResetEmail = async (email, resetToken, userType) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&type=${userType.toLowerCase()}`;

  const mailOptions = {
    to: email,
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset for your ${userType} account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendFacultyWelcomeEmail = async (faculty, plainPassword) => {
  // Generate reset token for the faculty
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour

  // Update faculty with reset token (this should be done in the controller)
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&type=faculty`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: faculty.email,
    subject: 'Welcome to NSEC Placement Portal - Faculty Account Created',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
    <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background-color: #4285f4;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
      margin: -20px -20px 20px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      text-align: center;
      color: #666;
    }
    .btn {
      display: inline-block;
      background-color: #4285f4;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .credentials {
      background-color: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      margin: 15px 0;
    }
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header">
      <h2>Welcome to NSEC Placement Portal!</h2>
    </div>

        <p>Dear <strong>${faculty.name}</strong>,</p>
        
        <p>Welcome to our team! Your faculty account has been successfully created in the NSEC Placement Portal.</p>
        
        <p>Here are your account credentials:</p>
        
        <div class="credentials">
          <p><strong>Email:</strong> ${faculty.email}</p>
          <p><strong>Temporary Password:</strong> ${plainPassword}</p>
        </div>
        
        <p>For security reasons, we recommend changing your password immediately after your first login.</p>
        
        <p>You can reset your password by clicking the button below:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>NSEC Placement Portal Team</p>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    `,
  };

  return { mailOptions, resetToken, resetTokenExpiry };
};

const sendOTPEmail = async (email, otp) => {
  console.log(`Preparing to send OTP email to ${email} with OTP: ${otp}`);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification - NSEC Placement Portal',
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP for email verification is:</p>
      <h1 style="color: #4a90e2; font-size: 32px; text-align: center;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Failed to send OTP email to ${email}:`, error);
    throw error;
  }
};

const sendNOCNotificationEmail = async (student, nocRequest, adminEmails) => {
  console.log(`Preparing to send NOC notification email to admins`);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmails,
    subject: 'New NOC Request - NSEC Placement Portal',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
    <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background-color: #2196f3;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
      margin: -20px -20px 20px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      text-align: center;
      color: #666;
    }
    .info-box {
      background-color: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #2196f3;
    }
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
        <h2>New NOC Request Submitted</h2>
      </div>

      <p>Dear Admin,</p>
      
      <p>A new No Objection Certificate (NOC) request has been submitted by a student.</p>
      
      <div class="info-box">
        <p><strong>Student Details:</strong></p>
        <p>Name: ${student.name}</p>
        <p>Email: ${student.email}</p>
        <p>University Roll: ${nocRequest.universityRoll}</p>
        <p>Course: ${nocRequest.course}</p>
        <p>Branch: ${nocRequest.branch}</p>
        <p>Submission Date: ${new Date(nocRequest.createdAt).toLocaleDateString()}</p>
      </div>
      
      <p><strong>Reason for NOC:</strong></p>
      <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${nocRequest.reason}</p>
      
      ${nocRequest.attachment ? `<p><strong>Attachment:</strong> ${nocRequest.attachment.filename}</p>` : ''}
      
      <p>Please log in to the admin portal to review and process this NOC request.</p>
      
      <p>Best regards,<br>NSEC Placement Portal Team</p>
      
      <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
    </body>
    </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`NOC notification email sent to admins: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Failed to send NOC notification email:`, error);
    throw error;
  }
};

const sendBlockNotificationEmail = async (student, reason = 'policy violation') => {
  console.log(`Preparing to send block notification email to ${student.email}`);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: 'Account Access Restricted - NSEC Placement Portal',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
    <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background-color: #e53935;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
      margin: -20px -20px 20px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      text-align: center;
      color: #666;
    }
    .btn {
      display: inline-block;
      background-color: #4285f4;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .info-box {
      background-color: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #e53935;
    }
    </style>
    </head>
    <body>
    <div class="container">
      <div class="header">
        <h2>Account Access Restricted</h2>
      </div>

      <p>Dear <strong>${student.name}</strong>,</p>
      
      <p>We regret to inform you that your access to the NSEC Placement Portal has been temporarily restricted.</p>
      
      <div class="info-box">
        <p><strong>Account Details:</strong></p>
        <p>Name: ${student.name}</p>
        <p>Email: ${student.email}</p>
        <p>Course: ${student.course}</p>
        <p>Branch: ${student.branch}</p>
        <p>Restriction Date: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <p>This action has been taken due to ${reason}.</p>
      
      <p>If you believe this is an error or would like to discuss this matter further, please contact the placement office or your faculty advisor.</p>
      
      <p>Best regards,<br>NSEC Placement Portal Team</p>
      
      <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
    </body>
    </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Block notification email sent to ${student.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Failed to send block notification email to ${student.email}:`, error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendOTPEmail,
  sendFacultyWelcomeEmail,
  sendBlockNotificationEmail,
  sendNOCNotificationEmail,
  transporter
};
