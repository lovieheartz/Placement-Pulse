const express = require("express");
const router = express.Router();
const { login, me, registerStudent, verifyOTP, resendOTP, generateOTP, verifyAccount } = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const { sendOTPEmail } = require("../services/mailService");
const upload = require("../middleware/upload_multer");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const path = require("path");

router.post("/login", login);
router.get("/me", authenticateToken, me);
router.post("/register-student", registerStudent);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/verify-account", verifyAccount);

// Token refresh endpoint for production
router.post("/refresh-token", authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const jwt = require('jsonwebtoken');

    // Generate new token with extended expiry
    const newToken = jwt.sign(
      { id, role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // 24 hours for long interviews
    );

    console.log(`✅ Token refreshed for user: ${id}`);

    res.json({
      success: true,
      token: newToken,
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ message: 'Failed to refresh token' });
  }
});

// Avatar upload route
router.post("/upload-avatar", authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { role, id } = req.user;
    const avatarPath = `/uploads/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`;

    // Update user avatar based on role
    let user;
    switch (role) {
      case 'student':
        user = await Student.findByIdAndUpdate(id, { avatar: avatarPath }, { new: true });
        break;
      case 'faculty':
        user = await Faculty.findByIdAndUpdate(id, { avatar: avatarPath }, { new: true });
        break;
      case 'admin':
        user = await Admin.findByIdAndUpdate(id, { avatar: avatarPath }, { new: true });
        break;
      default:
        return res.status(400).json({ message: 'Invalid user role' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarPath,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

// Endpoint to check and fix verification status
router.get("/check-verification/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log(`Checking verification status for: ${email}`);
    
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    console.log(`Current verification status: ${student.isVerified}`);
    
    // Force set verification to true if needed
    if (!student.isVerified) {
      student.isVerified = true;
      await student.save();
      console.log(`Fixed verification status for ${email}`);
    }
    
    res.json({ 
      email: student.email,
      isVerified: student.isVerified,
      message: "Verification status checked and fixed if needed"
    });
  } catch (error) {
    console.error("Verification check error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/send-otp", async (req, res) => {
  try {
    // This endpoint is needed for the initial OTP sending
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!email.endsWith('@nsec.ac.in')) {
      return res.status(400).json({ message: 'Email must be from @nsec.ac.in domain' });
    }
    
    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent && existingStudent.isVerified) {
      return res.status(400).json({ message: 'Email is already registered and verified. Please login.' });
    }
    
    // Generate OTP and store in memory
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store OTP in memory
    const { otpStore } = require('../controllers/authController');
    otpStore.set(email, { otp, expiry: otpExpiry });
    
    console.log(`Generated OTP for ${email}: ${otp}, expires at ${otpExpiry}`);
    console.log(`OTP Store size: ${otpStore.size}`);
    
    // Send OTP via email
    await sendOTPEmail(email, otp);
    
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

module.exports = router;
