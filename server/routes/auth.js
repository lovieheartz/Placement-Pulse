const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');

const { sendPasswordResetEmail, sendOTPEmail } = require('../services/mailService');

const JWT_SECRET = process.env.JWT_SECRET;

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to get the Prisma delegate name by role
const getDelegateByRole = (role) => {
  switch (role) {
    case 'admin': return 'admin';
    case 'faculty': return 'faculty';
    case 'hod': return 'hOD';
    case 'student': return 'student';
    default: return null;
  }
};

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const userTypes = [
    { delegate: 'admin', role: 'admin' },
    { delegate: 'faculty', role: 'faculty' },
    { delegate: 'hOD', role: 'hod' },
    { delegate: 'student', role: 'student' },
  ];

  try {
    for (const { delegate, role } of userTypes) {
      const user = await prisma[delegate].findUnique({ where: { email } });
      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          // Check if student is verified
          if (role === 'student' && !user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email first' });
          }
          const token = jwt.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '1h' });
          return res.json({ token, role, name: user.name });
        } else {
          console.warn(`Password mismatch for ${role}: ${email}`);
        }
      }
    }

    return res.status(401).json({ message: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
  const { token, password, type } = req.body;

  if (!token || !password || !type) {
    return res.status(400).json({ message: 'Token, password, and user type are required.' });
  }

  const delegate = getDelegateByRole(type);
  if (!delegate) {
    return res.status(400).json({ message: 'Invalid user type.' });
  }

  try {
    const user = await prisma[delegate].findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    // No pre-save hook anymore: hash the new password explicitly
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma[delegate].update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    let user = null;
    let userType = null;
    let delegate = null;

    user = await prisma.admin.findUnique({ where: { email } });
    if (user) { userType = 'Admin'; delegate = 'admin'; }

    if (!user) {
      user = await prisma.faculty.findUnique({ where: { email } });
      if (user) { userType = 'Faculty'; delegate = 'faculty'; }
    }

    if (!user) {
      user = await prisma.hOD.findUnique({ where: { email } });
      if (user) { userType = 'HOD'; delegate = 'hOD'; }
    }

    if (!user) {
      user = await prisma.student.findUnique({ where: { email } });
      if (user) { userType = 'Student'; delegate = 'student'; }
    }

    if (!user) {
      return res.status(404).json({ message: 'If this email exists, we will send a reset link' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma[delegate].update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await sendPasswordResetEmail(email, resetToken, userType);

    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Error processing request:', error.message);
    res.status(500).json({ message: 'Error processing your request' });
  }
});

// Send OTP Route
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email.endsWith('@nsec.ac.in')) {
      return res.status(400).json({ error: 'Email must be from @nsec.ac.in domain' });
    }

    const existingStudent = await prisma.student.findUnique({ where: { email } });
    if (existingStudent && existingStudent.isVerified) {
      return res.status(400).json({ error: 'Student already exists' });
    }

    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    global.otpStore = global.otpStore || {};
    global.otpStore[email] = {
      otp,
      expiry: Date.now() + 10 * 60 * 1000
    };

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register Student Route
router.post('/register-student', async (req, res) => {
  try {
    const { name, email, phone, password, course, branch, admissionYear, passoutYear, otp } = req.body;

    const storedOTP = global.otpStore?.[email];
    if (!storedOTP || storedOTP.otp !== otp || storedOTP.expiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const existingStudent = await prisma.student.findUnique({ where: { email } });
    if (existingStudent && existingStudent.isVerified) {
      return res.status(400).json({ error: 'Student already exists' });
    }

    // No pre-save hook anymore: hash the password explicitly
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.student.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        course,
        branch,
        admissionYear: parseInt(admissionYear, 10),
        passoutYear: parseInt(passoutYear, 10),
        isVerified: true,
        role: 'student'
      }
    });
    delete global.otpStore[email];

    res.status(201).json({ message: 'Registration successful. You can now login.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Resend OTP Route
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    global.otpStore = global.otpStore || {};
    global.otpStore[email] = {
      otp,
      expiry: Date.now() + 10 * 60 * 1000
    };

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Direct link to create first admin
router.get('/create-admin', async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await prisma.admin.findFirst({});
    if (adminExists) {
      return res.send('Admin already exists');
    }

    // Create password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin
    await prisma.admin.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '+919471531830',
        password: hashedPassword,
        role: 'admin'
      }
    });
    res.send('Admin created successfully! Email: admin@example.com, Password: admin123');
  } catch (error) {
    res.status(500).send('Error creating admin: ' + error.message);
  }
});

module.exports = router;
