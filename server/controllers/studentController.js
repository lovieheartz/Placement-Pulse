const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const path = require("path");
const fs = require("fs");
const storageService = require("../services/storageService");

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

    const student = await prisma.student.findUnique({ where: { email } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update verification status
    await prisma.student.update({
      where: { id: student.id },
      data: { isVerified: true },
    });

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

// ✅ Register student
exports.registerStudent = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingUser = await prisma.student.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Student with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = await prisma.student.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: "student",
      },
    });

    res.status(201).json({
      message: "Student registered successfully.",
      user: {
        id: newStudent.id,
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
    const student = await prisma.student.findUnique({
      where: { id: req.user.id },
      omit: { password: true },
    });
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
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        name: name || student.name,
        email: email || student.email,
        phone: phone || student.phone,
      },
    });

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
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Delete the old avatar from Supabase Storage if exists
    if (student.avatar) {
      await storageService.remove(student.avatar);
    }

    // Upload the new avatar to Supabase Storage and store its public URL
    const { publicUrl } = await storageService.uploadMulterFile(
      req.file,
      storageService.FOLDERS.AVATAR_STUDENT
    );

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { avatar: publicUrl },
    });

    res.json({
      message: "Avatar uploaded successfully.",
      avatar: updated.avatar
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
