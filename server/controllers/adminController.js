const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { sendFacultyWelcomeEmail, transporter } = require("../services/mailService");
const storageService = require("../services/storageService");

// ✅ Check if any admin exists
exports.checkAdminExists = async (req, res) => {
  try {
    const adminExists = await prisma.admin.findFirst({ select: { id: true } });
    res.json({ exists: !!adminExists });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Create the very first admin
exports.createFirstAdmin = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingAdmin = await prisma.admin.findFirst();
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin user already exists" });
    }

    const emailUsed = await prisma.admin.findUnique({ where: { email } });
    if (emailUsed) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: { name, email, phone, password: hashedPassword, role: "admin" },
    });

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (err) {
    console.error("Create admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Create admin by another admin
exports.createAdminByAdmin = async (req, res) => {
  const { name, email, phone, password, existingAdminEmail, existingAdminPassword } = req.body;

  try {
    const existingAdmin = await prisma.admin.findUnique({ where: { email: existingAdminEmail } });

    if (!existingAdmin || !(await bcrypt.compare(existingAdminPassword, existingAdmin.password))) {
      return res.status(401).json({ message: "Invalid existing admin credentials" });
    }

    const duplicate = await prisma.admin.findUnique({ where: { email } });
    if (duplicate) {
      return res.status(400).json({ message: "Admin email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: { name, email, phone, password: hashedPassword, role: "admin" },
    });

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (err) {
    console.error("Create admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get current admin profile
exports.getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      omit: { password: true },
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({ success: true, data: admin });
  } catch (err) {
    console.error("Get admin profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update current admin profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, email, phone } = req.body;

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (phone) data.phone = phone;

    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedAdmin,
    });
  } catch (err) {
    console.error("Update admin profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Upload admin avatar (with old file deletion)
exports.uploadAdminAvatar = async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Delete the previous avatar from Supabase Storage if it exists
    if (admin.avatar) {
      await storageService.remove(admin.avatar);
    }

    // Upload the new avatar to Supabase Storage and store its public URL
    const { publicUrl } = await storageService.uploadMulterFile(
      req.file,
      storageService.FOLDERS.AVATAR_ADMIN
    );
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: { avatar: publicUrl },
    });

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      data: { avatar: updatedAdmin.avatar },
    });
  } catch (err) {
    console.error("Upload admin avatar error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Create Faculty (Placement Officer only)
exports.createFaculty = async (req, res) => {
  try {
    const { name, email, phone, password, specialization } = req.body;
    const adminId = req.user.id;

    const existingFaculty = await prisma.faculty.findUnique({ where: { email } });
    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newFaculty = await prisma.faculty.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        specialization,
        createdBy: adminId,
      },
    });

    // Add to admin's managed faculty list
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (admin) {
      const facultyManaged = Array.isArray(admin.facultyManaged) ? admin.facultyManaged : [];
      await prisma.admin.update({
        where: { id: adminId },
        data: { facultyManaged: [...facultyManaged, newFaculty.id] },
      });
    }

    res.status(201).json({
      message: "Faculty created successfully",
      faculty: {
        id: newFaculty.id,
        name: newFaculty.name,
        email: newFaculty.email,
        specialization: newFaculty.specialization
      }
    });
  } catch (err) {
    console.error("Create faculty error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all faculty managed by admin
exports.getManagedFaculty = async (req, res) => {
  try {
    const adminId = req.user.id;
    const faculty = await prisma.faculty.findMany({
      where: { createdBy: adminId },
      omit: { password: true },
    });
    res.status(200).json({ success: true, data: faculty });
  } catch (err) {
    console.error("Get managed faculty error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all students (for admin view)
exports.getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({ omit: { password: true } });
    res.status(200).json({ success: true, data: students });
  } catch (err) {
    console.error("Get all students error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get blocked students
exports.getBlockedStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { isBlocked: true },
      omit: { password: true },
    });
    res.status(200).json({ success: true, data: students });
  } catch (err) {
    console.error("Get blocked students error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const { sendBlockNotificationEmail } = require('../services/mailService');

// Block a student
exports.blockStudent = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Get reason from request body or use default
    const { reason } = req.body;

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.id },
      data: { isBlocked: true, blockedAt: new Date() },
    });

    // Send email notification
    try {
      await sendBlockNotificationEmail(updatedStudent, reason || 'policy violation');
      console.log(`Block notification email sent to ${updatedStudent.email}`);
    } catch (emailError) {
      console.error(`Failed to send block notification email: ${emailError.message}`);
      // Continue with the response even if email fails
    }

    res.status(200).json({
      success: true,
      message: "Student blocked successfully",
      data: { id: updatedStudent.id, name: updatedStudent.name }
    });
  } catch (err) {
    console.error("Block student error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Unblock a student
exports.unblockStudent = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: req.params.id },
      data: { isBlocked: false, blockedAt: null },
    });

    res.status(200).json({
      success: true,
      message: "Student unblocked successfully",
      data: { id: updatedStudent.id, name: updatedStudent.name }
    });
  } catch (err) {
    console.error("Unblock student error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get first admin (for faculty creation)
exports.getFirstAdmin = async (req, res) => {
  try {
    const admin = await prisma.admin.findFirst({
      select: { id: true, name: true, email: true },
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: "No admin found" });
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (err) {
    console.error("Get first admin error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({ omit: { password: true } });
    res.status(200).json({ success: true, data: admins });
  } catch (err) {
    console.error("Get all admins error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create admin by authenticated admin (no credentials needed)
exports.createAdminByAuthenticatedAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const adminId = req.user.id;

    // Check if the requesting user is an admin
    const requestingAdmin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!requestingAdmin) {
      return res.status(403).json({ message: "Only admins can create other admins" });
    }

    const duplicate = await prisma.admin.findUnique({ where: { email } });
    if (duplicate) {
      return res.status(400).json({ message: "Admin email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin.create({
      data: { name, email, phone, password: hashedPassword, role: "admin" },
    });

    res.status(201).json({
      message: "Admin created successfully",
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (err) {
    console.error("Create admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete admin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.params.id } });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    await prisma.admin.delete({ where: { id: req.params.id } });

    // Remove the avatar from Supabase Storage
    if (admin.avatar) {
      await storageService.remove(admin.avatar);
    }

    res.status(200).json({
      message: "Admin deleted successfully",
      data: { id: admin.id, name: admin.name },
    });
  } catch (err) {
    console.error("Delete admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== HOD Management ====================

// Create HOD by Admin
exports.createHOD = async (req, res) => {
  try {
    const { name, email, password, phone, course, department } = req.body;
    const adminId = req.user.id;

    if (!name || !email || !password || !phone || !course || !department) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    console.log(`Admin creating HOD with email: ${email}`);

    const duplicate = await prisma.hOD.findUnique({ where: { email } });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "HOD email already exists.",
      });
    }

    let avatarPath = null;
    if (req.file) {
      const uploaded = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.AVATAR_HOD
      );
      avatarPath = uploaded.publicUrl;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let savedHOD = await prisma.hOD.create({
      data: {
        name,
        email,
        phone,
        course,
        department,
        password: hashedPassword,
        role: "hod",
        avatar: avatarPath,
        createdBy: adminId,
      },
    });

    console.log(`HOD saved successfully: ${savedHOD.email}`);

    // Send welcome email
    try {
      const { mailOptions, resetToken, resetTokenExpiry } = await sendFacultyWelcomeEmail(savedHOD, password);

      savedHOD = await prisma.hOD.update({
        where: { id: savedHOD.id },
        data: { resetToken, resetTokenExpiry },
      });

      await transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to HOD: ${savedHOD.email}`);
    } catch (emailError) {
      console.error(`Failed to send welcome email to HOD: ${savedHOD.email}`, emailError);
    }

    res.status(201).json({
      success: true,
      message: "HOD created successfully",
      data: {
        id: savedHOD.id,
        name: savedHOD.name,
        email: savedHOD.email,
        course: savedHOD.course,
        department: savedHOD.department,
        avatar: savedHOD.avatar,
      },
    });
  } catch (err) {
    console.error("Create HOD error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

// Get all HODs
exports.getAllHODs = async (req, res) => {
  try {
    const hods = await prisma.hOD.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        course: true,
        department: true,
        phone: true,
        createdAt: true,
        avatar: true,
      },
    });
    res.status(200).json({
      success: true,
      count: hods.length,
      data: hods
    });
  } catch (err) {
    console.error("Get all HODs error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch HOD data",
      error: err.message
    });
  }
};

// Get single HOD by ID
exports.getHODById = async (req, res) => {
  try {
    const hod = await prisma.hOD.findUnique({
      where: { id: req.params.id },
      omit: { password: true },
    });

    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    res.status(200).json({ success: true, data: hod });
  } catch (err) {
    console.error("Get HOD by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};

// Update HOD by ID
exports.updateHOD = async (req, res) => {
  try {
    const hod = await prisma.hOD.findUnique({ where: { id: req.params.id } });

    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.email !== undefined) data.email = req.body.email;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    if (req.body.course !== undefined) data.course = req.body.course;
    if (req.body.department !== undefined) data.department = req.body.department;

    if (req.file) {
      if (hod.avatar) {
        await storageService.remove(hod.avatar);
      }

      const { publicUrl } = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.AVATAR_HOD
      );
      data.avatar = publicUrl;
    }

    const updated = await prisma.hOD.update({
      where: { id: req.params.id },
      data,
    });
    res.status(200).json({
      success: true,
      message: "HOD updated successfully",
      data: updated
    });
  } catch (err) {
    console.error("Update HOD error:", err);
    res.status(500).json({
      success: false,
      message: "Update failed",
      error: err.message
    });
  }
};

// Delete HOD
exports.deleteHOD = async (req, res) => {
  try {
    const hod = await prisma.hOD.findUnique({ where: { id: req.params.id } });

    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    if (hod.avatar) {
      await storageService.remove(hod.avatar);
    }

    await prisma.hOD.delete({ where: { id: req.params.id } });

    res.status(200).json({
      success: true,
      message: "HOD deleted successfully",
      data: {
        id: hod.id,
        name: hod.name
      }
    });
  } catch (err) {
    console.error("Delete HOD error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete HOD",
      error: err.message
    });
  }
};
