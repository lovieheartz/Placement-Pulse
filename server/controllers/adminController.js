const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");

// ✅ Check if any admin exists
exports.checkAdminExists = async (req, res) => {
  try {
    const adminExists = await Admin.exists({});
    res.json({ exists: !!adminExists });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Create the very first admin
exports.createFirstAdmin = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin user already exists" });
    }

    const emailUsed = await Admin.findOne({ email });
    if (emailUsed) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const newAdmin = new Admin({ name, email, phone, password, role: "admin" });
    await newAdmin.save();

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: newAdmin._id,
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
    const existingAdmin = await Admin.findOne({ email: existingAdminEmail });

    if (!existingAdmin || !(await bcrypt.compare(existingAdminPassword, existingAdmin.password))) {
      return res.status(401).json({ message: "Invalid existing admin credentials" });
    }

    const duplicate = await Admin.findOne({ email });
    if (duplicate) {
      return res.status(400).json({ message: "Admin email already exists" });
    }

    const newAdmin = new Admin({ name, email, phone, password, role: "admin" });
    await newAdmin.save();

    res.status(201).json({
      message: "Admin user created successfully",
      user: {
        id: newAdmin._id,
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
    const admin = await Admin.findById(adminId).select("-password");

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

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;

    const updatedAdmin = await admin.save();

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

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Delete the previous avatar if it exists
    if (admin.avatar) {
      const previousPath = path.join(__dirname, "..", admin.avatar);
      fs.unlink(previousPath, (err) => {
        if (err) {
          console.error("Error deleting previous avatar:", err.message);
        }
      });
    }

    // Save the new avatar
    admin.avatar = `/uploads/Avatar_Admin/${req.file.filename}`;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      data: { avatar: admin.avatar },
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

    const existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty email already exists" });
    }

    const newFaculty = new Faculty({
      name,
      email,
      phone,
      password,
      specialization,
      createdBy: adminId
    });

    await newFaculty.save();

    // Add to admin's managed faculty list
    await Admin.findByIdAndUpdate(adminId, {
      $push: { facultyManaged: newFaculty._id }
    });

    res.status(201).json({
      message: "Faculty created successfully",
      faculty: {
        id: newFaculty._id,
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
    const faculty = await Faculty.find({ createdBy: adminId }).select("-password");
    res.status(200).json({ success: true, data: faculty });
  } catch (err) {
    console.error("Get managed faculty error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all students (for admin view)
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().select("-password");
    res.status(200).json({ success: true, data: students });
  } catch (err) {
    console.error("Get all students error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get blocked students
exports.getBlockedStudents = async (req, res) => {
  try {
    const students = await Student.find({ isBlocked: true }).select("-password");
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
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    
    // Get reason from request body or use default
    const { reason } = req.body;
    
    student.isBlocked = true;
    student.blockedAt = new Date();
    await student.save();
    
    // Send email notification
    try {
      await sendBlockNotificationEmail(student, reason || 'policy violation');
      console.log(`Block notification email sent to ${student.email}`);
    } catch (emailError) {
      console.error(`Failed to send block notification email: ${emailError.message}`);
      // Continue with the response even if email fails
    }
    
    res.status(200).json({ 
      success: true, 
      message: "Student blocked successfully",
      data: { id: student._id, name: student.name }
    });
  } catch (err) {
    console.error("Block student error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Unblock a student
exports.unblockStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    
    student.isBlocked = false;
    student.blockedAt = null;
    await student.save();
    
    res.status(200).json({ 
      success: true, 
      message: "Student unblocked successfully",
      data: { id: student._id, name: student.name }
    });
  } catch (err) {
    console.error("Unblock student error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get first admin (for faculty creation)
exports.getFirstAdmin = async (req, res) => {
  try {
    const admin = await Admin.findOne().select('_id name email');
    
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
    const admins = await Admin.find().select('-password');
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
    const requestingAdmin = await Admin.findById(adminId);
    if (!requestingAdmin) {
      return res.status(403).json({ message: "Only admins can create other admins" });
    }

    const duplicate = await Admin.findOne({ email });
    if (duplicate) {
      return res.status(400).json({ message: "Admin email already exists" });
    }

    const newAdmin = new Admin({ name, email, phone, password, role: "admin" });
    await newAdmin.save();

    res.status(201).json({
      message: "Admin created successfully",
      user: {
        id: newAdmin._id,
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
    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Optionally, remove the avatar from disk
    if (admin.avatar) {
      const avatarPath = path.join(__dirname, "..", admin.avatar);
      fs.unlink(avatarPath, (err) => {
        if (err) {
          console.error("Error deleting avatar during admin deletion:", err.message);
        }
      });
    }

    res.status(200).json({
      message: "Admin deleted successfully",
      data: { id: admin._id, name: admin.name },
    });
  } catch (err) {
    console.error("Delete admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
