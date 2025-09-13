const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const path = require("path");
const fs = require("fs");

// ✅ Verify student account
exports.verifyAccount = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    
    // Update verification status
    student.isVerified = true;
    await student.save();
    
    console.log(`Student ${email} verified successfully`);
    
    return res.status(200).json({
      success: true,
      message: 'Student account verified successfully',
    });
  } catch (error) {
    console.error('Verify account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during verification',
    });
  }
};

// ✅ Register student (no manual hashing)
exports.registerStudent = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingUser = await Student.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Student with this email already exists." });
    }

    const newStudent = new Student({
      name,
      email,
      password, // password hashed by pre-save hook
      phone,
      role: "student",
    });

    await newStudent.save();

    res.status(201).json({
      message: "Student registered successfully.",
      user: {
        id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email,
        phone: newStudent.phone,
        role: newStudent.role,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error. Registration failed." });
  }
};

// ✅ Get logged-in student's profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ data: student });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update logged-in student's profile
exports.updateProfile = async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.name = name || student.name;
    student.email = email || student.email;
    student.phone = phone || student.phone;

    await student.save();

    res.json({ message: "Profile updated successfully." });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Upload student avatar (with deletion of previous file)
exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Delete the old avatar if exists
    if (student.avatar) {
      const oldPath = path.join(__dirname, "..", student.avatar);
      fs.unlink(oldPath, (err) => {
        if (err) {
          console.error("Error deleting previous avatar:", err.message);
        }
      });
    }

    // Save the new avatar path
    student.avatar = `/uploads/Avatar_Student/${req.file.filename}`;
    await student.save();

    res.json({
      message: "Avatar uploaded successfully.",
      avatar: student.avatar
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
