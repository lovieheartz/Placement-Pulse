const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
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
    
    // Try to find the user in different tables
    let user = await prisma.student.findUnique({ where: { email } });
    let userType = 'student';
    let delegate = 'student';

    if (!user) {
      user = await prisma.faculty.findUnique({ where: { email } });
      userType = 'faculty';
      delegate = 'faculty';
    }

    if (!user) {
      user = await prisma.admin.findUnique({ where: { email } });
      userType = 'admin';
      delegate = 'admin';
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update verification status (only students have this column)
    if (delegate === 'student') {
      await prisma.student.update({ where: { id: user.id }, data: { isVerified: true } });
    }
    
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
    { delegate: "admin", role: "admin" },
    { delegate: "hOD", role: "hod" },
    { delegate: "faculty", role: "faculty" },
    { delegate: "student", role: "student" },
  ];

  for (let { delegate, role } of models) {
    const user = await prisma[delegate].findUnique({ where: { email } });
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
      const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, {
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
    const delegateByRole = { student: 'student', faculty: 'faculty', hod: 'hOD', admin: 'admin' };
    const delegate = delegateByRole[role];
    if (!delegate) {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    const user = await prisma[delegate].findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      course: user.course,
      branch: user.branch,
      department: user.department
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
    const existingStudent = await prisma.student.findUnique({ where: { email } });
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

    // Hash the password (Mongoose used to do this in a pre-save hook)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student with verified status
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
        isVerified: true, // Set to true since OTP is verified
        role: 'student'
      }
    });
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
