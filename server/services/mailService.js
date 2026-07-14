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

/**
 * Send a student their score right after they submit an aptitude test.
 * @param {object} student  { name, email }
 * @param {object} test     { title, totalMarks, passPercentage }
 * @param {object} attempt  { score, percentage, passed, rank, totalCorrect, totalWrong, totalSkipped, timeTaken, submittedAt }
 */
const sendTestScoreEmail = async (student, test, attempt) => {
  const passed = !!attempt.passed;
  const accent = passed ? '#16a34a' : '#dc2626';
  const badge = passed ? 'PASSED' : 'NOT PASSED';
  const pct = Number(attempt.percentage || 0).toFixed(2);
  const frontend = process.env.FRONTEND_URL || '';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: student.email,
    subject: `Your Score — ${test.title} | NSEC Placement Portal`,
    html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Arial,sans-serif;">
      <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,.08);">

        <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:24px 28px;color:#fff;">
          <h1 style="margin:0;font-size:20px;">Test Result</h1>
          <p style="margin:6px 0 0;opacity:.9;font-size:14px;">${test.title}</p>
        </div>

        <div style="padding:28px;">
          <p style="margin:0 0 18px;color:#0f172a;font-size:15px;">Hi <strong>${student.name || 'Student'}</strong>, your test has been evaluated.</p>

          <div style="text-align:center;padding:22px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
            <div style="font-size:40px;font-weight:700;color:${accent};line-height:1;">${attempt.score} <span style="font-size:20px;color:#64748b;font-weight:600;">/ ${test.totalMarks}</span></div>
            <div style="margin-top:6px;font-size:16px;color:#334155;font-weight:600;">${pct}%</div>
            <div style="display:inline-block;margin-top:12px;padding:6px 16px;border-radius:999px;background:${accent};color:#fff;font-size:12px;font-weight:700;letter-spacing:.5px;">${badge}</div>
          </div>

          <table style="width:100%;margin-top:22px;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:9px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Correct</td><td style="padding:9px 0;text-align:right;color:#16a34a;font-weight:600;border-bottom:1px solid #f1f5f9;">${attempt.totalCorrect ?? 0}</td></tr>
            <tr><td style="padding:9px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Wrong</td><td style="padding:9px 0;text-align:right;color:#dc2626;font-weight:600;border-bottom:1px solid #f1f5f9;">${attempt.totalWrong ?? 0}</td></tr>
            <tr><td style="padding:9px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Skipped</td><td style="padding:9px 0;text-align:right;color:#334155;font-weight:600;border-bottom:1px solid #f1f5f9;">${attempt.totalSkipped ?? 0}</td></tr>
            ${attempt.rank ? `<tr><td style="padding:9px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Rank</td><td style="padding:9px 0;text-align:right;color:#2563eb;font-weight:700;border-bottom:1px solid #f1f5f9;">#${attempt.rank}</td></tr>` : ''}
            <tr><td style="padding:9px 0;color:#64748b;">Time Taken</td><td style="padding:9px 0;text-align:right;color:#334155;font-weight:600;">${Math.round(Number(attempt.timeTaken || 0))} min</td></tr>
          </table>

          <p style="margin:20px 0 0;color:#64748b;font-size:13px;">Passing mark for this test is <strong>${test.passPercentage}%</strong>.</p>

          ${frontend ? `<div style="text-align:center;margin-top:24px;">
            <a href="${frontend}/student/test-history" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:600;font-size:14px;">View Detailed Result</a>
          </div>` : ''}
        </div>

        <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;text-align:center;">
          This is an automated message from the NSEC Placement Portal. Please do not reply.
        </div>
      </div>
    </body>
    </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Test score email sent to ${student.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Failed to send test score email to ${student.email}:`, error.message);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendOTPEmail,
  sendFacultyWelcomeEmail,
  sendBlockNotificationEmail,
  sendNOCNotificationEmail,
  sendTestScoreEmail,
  transporter
};
