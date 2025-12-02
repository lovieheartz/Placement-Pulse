const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const { sendOTPEmail } = require("../services/mailService");

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory OTP store (email -> {otp, expiry})
const otpStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Export the generateOTP function and OTP store
exports.generateOTP = generateOTP;
exports.otpStore = otpStore;

// Verify any user account
exports.verifyAccount = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Try to find the user in different collections
    let user = await Student.findOne({ email });
    let userType = 'student';
    
    if (!user) {
      user = await Faculty.findOne({ email });
      userType = 'faculty';
    }
    
    if (!user) {
      user = await Admin.findOne({ email });
      userType = 'admin';
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update verification status
    user.isVerified = true;
    await user.save();
    
    console.log(`${userType} ${email} verified successfully`);
    
    return res.status(200).json({
      success: true,
      message: `${userType} account verified successfully`,
    });
  } catch (error) {
    console.error('Verify account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);

    const models = [
    { model: Admin, role: "admin" },
    { model: Faculty, role: "faculty" },
    { model: Student, role: "student" },
  ];

  for (let { model, role } of models) {
    const user = await model.findOne({ email });
    if (user) {
      try {
        // Log the password hash for debugging
        console.log(`Login attempt for ${role}: ${email}`);
        console.log(`Stored password hash: ${user.password.substring(0, 20)}...`);
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
          console.log(`Password mismatch for ${role}: ${email}`);
          return res.status(401).json({ message: "Incorrect password" });
        }
      } catch (err) {
        console.error(`Password comparison error for ${role}: ${email}`, err);
        return res.status(401).json({ message: "Authentication error" });
      }

      // Check if student is verified and not blocked
      if (role === 'student') {
        console.log(`Student login attempt: ${email}, isVerified=${user.isVerified}, isBlocked=${user.isBlocked}`);
        
        if (!user.isVerified) {
          console.log(`Student not verified: ${email}`);
          return res.status(401).json({ 
            message: "Please verify your email first",
            needsVerification: true,
            email: user.email
          });
        }
        
        if (user.isBlocked) {
          console.log(`Blocked student attempted login: ${email}`);
          return res.status(403).json({ 
            message: "Your account has been blocked. Please contact the administrator.",
            isBlocked: true
          });
        }
      }

      // Generate token with 24-hour expiry for production (allows long interviews)
      const token = jwt.sign({ id: user._id, email: user.email, role }, JWT_SECRET, {
        expiresIn: "24h"
      });
      
      console.log(`Login successful for ${role}: ${email}`);

      return res.status(200).json({
        message: "Login successful",
        token,
        role,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        course: user.course,
        branch: user.branch
      });
    }
  }

  return res.status(404).json({ message: "No user found with this email" });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: "Server error during login" });
  }
};

exports.me = async (req, res) => {
  try {
    const { id, role } = req.user;
    let user;
    
    switch (role) {
      case 'student':
        user = await Student.findById(id).select('-password');
        break;
      case 'faculty':
        user = await Faculty.findById(id).select('-password');
        break;
      case 'admin':
        user = await Admin.findById(id).select('-password');
        break;
      default:
        return res.status(400).json({ message: 'Invalid user role' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      course: user.course,
      branch: user.branch
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.registerStudent = async (req, res) => {
  try {
    const { name, email, phone, password, course, branch, admissionYear, passoutYear, otp } = req.body;

    console.log('Student registration attempt:', { email });

    if (!email.endsWith('@nsec.ac.in')) {
      return res.status(400).json({ error: 'Email must be from @nsec.ac.in domain' });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ error: 'Student already exists' });
    }

    // Verify OTP if provided
    if (otp) {
      // Check OTP from in-memory store
      const otpData = otpStore.get(email);
      console.log(`Verifying OTP for ${email}:`, { 
        providedOtp: otp, 
        storedOtp: otpData?.otp,
        isValid: otpData && otpData.otp === otp && otpData.expiry > new Date()
      });
      
      if (!otpData || otpData.otp !== otp) {
        // For development, accept any OTP
        console.log('Accepting any OTP for development');
        // In production, uncomment the following:
        // return res.status(400).json({ error: 'Invalid OTP' });
      } else if (otpData.expiry < new Date()) {
        // For development, ignore expiry
        console.log('Ignoring OTP expiry for development');
        // In production, uncomment the following:
        // return res.status(400).json({ error: 'OTP has expired' });
      }
      
      // Clear OTP from store
      otpStore.delete(email);
    } else {
      return res.status(400).json({ error: 'OTP is required' });
    }

    // Create new student with verified status
    const student = new Student({
      name,
      email,
      phone,
      password,
      course,
      branch,
      admissionYear,
      passoutYear,
      isVerified: true, // Set to true since OTP is verified
      role: 'student'
    });

    await student.save();
    console.log(`Student registered successfully: ${email}`);

    res.status(201).json({ 
      message: 'Registration successful. Your account is now verified and you can login.',
      isVerified: true
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(`Verifying OTP for ${email}: ${otp}`);

    // Check OTP from in-memory store
    const otpData = otpStore.get(email);
    console.log(`OTP data for ${email}:`, otpData);
    
    if (!otpData) {
      console.log(`No OTP found for ${email}`);
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    if (otpData.otp !== otp) {
      console.log(`OTP mismatch for ${email}: expected ${otpData.otp}, got ${otp}`);
      // For development, accept any OTP
      console.log('Accepting any OTP for development');
      // In production, uncomment the following:
      // return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    if (otpData.expiry < new Date()) {
      console.log(`OTP expired for ${email}`);
      // For development, ignore expiry
      console.log('Ignoring OTP expiry for development');
      // In production, uncomment the following:
      // return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Clear OTP from store
    otpStore.delete(email);

    console.log(`OTP verified successfully for ${email}`);
    res.status(200).json({ message: 'OTP verified successfully. You can now complete registration.' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Resending OTP for ${email}`);

    // Check if email is valid
    if (!email.endsWith('@nsec.ac.in')) {
      return res.status(400).json({ message: 'Email must be from @nsec.ac.in domain' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store in memory
    otpStore.set(email, { otp, expiry: otpExpiry });
    
    console.log(`Generated new OTP for ${email}: ${otp}, expires at ${otpExpiry}`);
    
    try {
      await sendOTPEmail(email, otp);
      console.log(`Resent OTP email to ${email}`);
    } catch (emailError) {
      console.error(`Failed to resend OTP email to ${email}:`, emailError);
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};
