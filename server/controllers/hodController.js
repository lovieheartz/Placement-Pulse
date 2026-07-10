const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { sendFacultyWelcomeEmail, transporter } = require("../services/mailService");
const storageService = require("../services/storageService");

// Get HOD profile
exports.getHODProfile = async (req, res) => {
  try {
    const hodId = req.user.id;
    const hod = await prisma.hOD.findUnique({
      where: { id: hodId },
      omit: { password: true }
    });

    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    res.status(200).json({
      success: true,
      data: hod
    });
  } catch (err) {
    console.error("Get HOD profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: err.message
    });
  }
};

// Update HOD profile
exports.updateHODProfile = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { name, email, phone, course, department } = req.body;

    const hod = await prisma.hOD.findUnique({ where: { id: hodId } });

    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (phone) data.phone = phone;
    if (course) data.course = course;
    if (department) data.department = department;

    const updatedHOD = await prisma.hOD.update({
      where: { id: hodId },
      data
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedHOD
    });
  } catch (err) {
    console.error("Update HOD profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: err.message
    });
  }
};

// Upload HOD avatar
exports.updateAvatar = async (req, res) => {
  try {
    const hodId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded."
      });
    }

    const hod = await prisma.hOD.findUnique({ where: { id: hodId } });

    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    if (hod.avatar) {
      await storageService.remove(hod.avatar);
    }

    const { publicUrl: avatarPath } = await storageService.uploadMulterFile(
      req.file,
      storageService.FOLDERS.AVATAR_HOD
    );
    await prisma.hOD.update({
      where: { id: hodId },
      data: { avatar: avatarPath }
    });

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      avatarPath
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
      error: err.message
    });
  }
};

// Create faculty under HOD's department
exports.createFaculty = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Get HOD details to get department
    const hod = await prisma.hOD.findUnique({ where: { id: hodId } });
    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    console.log(`HOD ${hod.email} creating faculty with email: ${email}`);

    const duplicate = await prisma.faculty.findUnique({ where: { email } });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Faculty email already exists.",
      });
    }

    let avatarPath = null;
    if (req.file) {
      const uploaded = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.AVATAR_FACULTY
      );
      avatarPath = uploaded.publicUrl;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create faculty linked to HOD
    const savedFaculty = await prisma.faculty.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "faculty",
        avatar: avatarPath,
        createdBy: hodId,
        createdByModel: 'HOD',
        hodId: hodId,
        course: hod.course,
        department: hod.department,
      }
    });

    console.log(`Faculty saved successfully: ${savedFaculty.email}`);

    // Send welcome email
    try {
      const { mailOptions, resetToken, resetTokenExpiry } = await sendFacultyWelcomeEmail(savedFaculty, password);

      await prisma.faculty.update({
        where: { id: savedFaculty.id },
        data: { resetToken, resetTokenExpiry }
      });

      await transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to faculty: ${savedFaculty.email}`);
    } catch (emailError) {
      console.error(`Failed to send welcome email to faculty: ${savedFaculty.email}`, emailError);
    }

    res.status(201).json({
      success: true,
      message: "Faculty created successfully",
      data: {
        id: savedFaculty.id,
        name: savedFaculty.name,
        email: savedFaculty.email,
        course: savedFaculty.course,
        department: savedFaculty.department,
        avatar: savedFaculty.avatar,
      },
    });
  } catch (err) {
    console.error("Create faculty error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

// Get all faculties under this HOD's department
exports.getMyFaculties = async (req, res) => {
  try {
    const hodId = req.user.id;

    const faculties = await prisma.faculty.findMany({
      where: { hodId: hodId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        avatar: true,
        course: true,
        department: true,
        hodId: true
      }
    });

    // Manually attach HOD details (replacing populate('hodId', ...))
    const hod = await prisma.hOD.findUnique({
      where: { id: hodId },
      select: { id: true, name: true, email: true, department: true }
    });
    faculties.forEach((f) => {
      f.hodId = hod;
    });

    res.status(200).json({
      success: true,
      count: faculties.length,
      data: faculties
    });
  } catch (err) {
    console.error("Get my faculties error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty data",
      error: err.message
    });
  }
};

// Get single faculty by ID (only if under this HOD)
exports.getSingleFaculty = async (req, res) => {
  try {
    const hodId = req.user.id;
    const faculty = await prisma.faculty.findFirst({
      where: {
        id: req.params.id,
        hodId: hodId
      },
      omit: { password: true }
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found or not under your department"
      });
    }

    res.status(200).json({ success: true, data: faculty });
  } catch (err) {
    console.error("Get single faculty error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};

// Update faculty by ID (only if under this HOD)
exports.updateFaculty = async (req, res) => {
  try {
    const hodId = req.user.id;
    const faculty = await prisma.faculty.findFirst({
      where: {
        id: req.params.id,
        hodId: hodId
      }
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found or not under your department"
      });
    }

    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.email !== undefined) data.email = req.body.email;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    if (req.body.course !== undefined) data.course = req.body.course;
    if (req.body.department !== undefined) data.department = req.body.department;

    if (req.file) {
      if (faculty.avatar) {
        await storageService.remove(faculty.avatar);
      }

      const { publicUrl } = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.AVATAR_FACULTY
      );
      data.avatar = publicUrl;
    }

    const updated = await prisma.faculty.update({
      where: { id: faculty.id },
      data
    });
    res.status(200).json({
      success: true,
      message: "Faculty updated successfully",
      data: updated
    });
  } catch (err) {
    console.error("Update faculty error:", err);
    res.status(500).json({
      success: false,
      message: "Update failed",
      error: err.message
    });
  }
};

// Delete faculty (only if under this HOD)
exports.deleteFaculty = async (req, res) => {
  try {
    const hodId = req.user.id;
    const faculty = await prisma.faculty.findFirst({
      where: {
        id: req.params.id,
        hodId: hodId
      }
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found or not under your department"
      });
    }

    if (faculty.avatar) {
      await storageService.remove(faculty.avatar);
    }

    await prisma.faculty.delete({ where: { id: req.params.id } });

    res.status(200).json({
      success: true,
      message: "Faculty deleted successfully",
      data: {
        id: faculty.id,
        name: faculty.name
      }
    });
  } catch (err) {
    console.error("Delete faculty error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete faculty",
      error: err.message
    });
  }
};

// Get all students (HOD access)
exports.getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { isVerified: true },
      omit: { password: true, otp: true, otpExpiry: true }
    });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (err) {
    console.error("Get all students error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Get a single student's full profile (incl. semesterMarks / CGPA) for HOD view.
exports.getStudentProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id }, omit: { password: true } });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const profile = await prisma.studentProfile.findUnique({ where: { studentId: id } });
    res.status(200).json({ success: true, data: { student, profile: profile || null } });
  } catch (err) {
    console.error("HOD get student profile by id error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Block a student (HOD can block students in their department)
exports.blockStudent = async (req, res) => {
  try {
    const hodId = req.user.id;
    const studentId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reason for blocking is required"
      });
    }

    // Get HOD details to check department
    const hod = await prisma.hOD.findUnique({ where: { id: hodId } });
    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    // Find the student and check if they belong to HOD's department
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check if student belongs to HOD's course and department
    if (student.course !== hod.course || student.branch !== hod.department) {
      return res.status(403).json({
        success: false,
        message: "You can only block students from your department"
      });
    }

    if (student.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Student is already blocked"
      });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        isBlocked: true,
        blockReason: reason,
        blockedBy: hodId,
        blockedByModel: 'HOD',
        blockedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: "Student blocked successfully",
      data: updatedStudent
    });
  } catch (err) {
    console.error("Block student error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to block student",
      error: err.message
    });
  }
};

// Unblock a student
exports.unblockStudent = async (req, res) => {
  try {
    const hodId = req.user.id;
    const studentId = req.params.id;

    // Get HOD details to check department
    const hod = await prisma.hOD.findUnique({ where: { id: hodId } });
    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check if student belongs to HOD's course and department
    if (student.course !== hod.course || student.branch !== hod.department) {
      return res.status(403).json({
        success: false,
        message: "You can only unblock students from your department"
      });
    }

    if (!student.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Student is not blocked"
      });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        isBlocked: false,
        blockReason: null,
        blockedBy: null,
        blockedByModel: null,
        blockedAt: null
      }
    });

    res.status(200).json({
      success: true,
      message: "Student unblocked successfully",
      data: updatedStudent
    });
  } catch (err) {
    console.error("Unblock student error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to unblock student",
      error: err.message
    });
  }
};

// Get blocked students in HOD's department
exports.getBlockedStudents = async (req, res) => {
  try {
    const hodId = req.user.id;

    // Get HOD details to filter by department
    const hod = await prisma.hOD.findUnique({ where: { id: hodId } });
    if (!hod) {
      return res.status(404).json({
        success: false,
        message: "HOD not found"
      });
    }

    const blockedStudents = await prisma.student.findMany({
      where: {
        isBlocked: true,
        isVerified: true,
        course: hod.course,
        branch: hod.department
      },
      omit: { password: true, otp: true, otpExpiry: true }
    });

    res.status(200).json({
      success: true,
      count: blockedStudents.length,
      data: blockedStudents
    });
  } catch (err) {
    console.error("Get blocked students error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blocked students",
      error: err.message
    });
  }
};
