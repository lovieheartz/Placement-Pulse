const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { sendFacultyWelcomeEmail, transporter } = require("../services/mailService");
const storageService = require("../services/storageService");

exports.createFaculty = async (req, res) => {
  try {
    const { name, email, password, phone, course, department, createdBy } = req.body;

    if (!name || !email || !password || !phone || !course || !department || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "All fields are required, including createdBy.",
      });
    }

    console.log(`Creating faculty with email: ${email}, password: ${password.substring(0, 3)}***`);

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

    // Hash the password (no more pre-save hook in Prisma)
    const hashedPassword = await bcrypt.hash(password, 10);

    let savedFaculty = await prisma.faculty.create({
      data: {
        name,
        email,
        phone,
        course,
        department,
        password: hashedPassword,
        role: "faculty",
        avatar: avatarPath,
        createdBy,
        createdByModel: 'Admin', // Faculty created by admin
      },
    });

    console.log(`Faculty saved successfully: ${savedFaculty.email}`);
    console.log(`Saved password hash: ${savedFaculty.password.substring(0, 20)}...`);

    // Test password comparison
    const testPassword = password;
    const passwordMatch = await bcrypt.compare(testPassword, savedFaculty.password);
    console.log(`Password comparison test: ${passwordMatch ? 'SUCCESS' : 'FAILED'}`);

    // Send welcome email with password reset link
    try {
      // Generate email with reset token
      const { mailOptions, resetToken, resetTokenExpiry } = await sendFacultyWelcomeEmail(savedFaculty, password);

      // Update faculty with reset token
      savedFaculty = await prisma.faculty.update({
        where: { id: savedFaculty.id },
        data: { resetToken, resetTokenExpiry },
      });

      // Send the email
      await transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to faculty: ${savedFaculty.email}`);
    } catch (emailError) {
      console.error(`Failed to send welcome email to faculty: ${savedFaculty.email}`, emailError);
      // Continue even if email fails
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

exports.getAllFaculties = async (req, res) => {
  try {
    const faculties = await prisma.faculty.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        avatar: true,
        course: true,
        department: true,
      },
    });
    res.status(200).json({
      success: true,
      count: faculties.length,
      data: faculties
    });
  } catch (err) {
    console.error("Get all faculties error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty data",
      error: err.message
    });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    await prisma.faculty.delete({ where: { id: req.params.id } });

    if (faculty.avatar) {
      await storageService.remove(faculty.avatar);
    }

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

exports.getFacultyProfile = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      omit: { password: true },
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    res.status(200).json({
      success: true,
      data: faculty
    });
  } catch (err) {
    console.error("Get faculty profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: err.message
    });
  }
};

exports.updateFacultyProfile = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { name, email, phone, course, department } = req.body;

    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (course) updateData.course = course;
    if (department) updateData.department = department;

    const updatedFaculty = await prisma.faculty.update({
      where: { id: facultyId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedFaculty
    });
  } catch (err) {
    console.error("Update faculty profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: err.message
    });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const facultyId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded."
      });
    }

    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    if (faculty.avatar) {
      await storageService.remove(faculty.avatar);
    }

    const { publicUrl: avatarPath } = await storageService.uploadMulterFile(
      req.file,
      storageService.FOLDERS.AVATAR_FACULTY
    );
    await prisma.faculty.update({
      where: { id: facultyId },
      data: { avatar: avatarPath },
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
// GET SINGLE FACULTY BY ID
exports.getSingleFaculty = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.params.id },
      omit: { password: true },
    });
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }
    res.status(200).json({ success: true, data: faculty });
  } catch (err) {
    console.error("Get single faculty error:", err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
};

// UPDATE FACULTY BY ID
exports.updateFacultyById = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    const updateData = {};

    // ✅ Defensive checks: Only update if value is provided
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.course !== undefined) updateData.course = req.body.course;
    if (req.body.department !== undefined) updateData.department = req.body.department;

    // ✅ Handle avatar upload safely
    if (req.file) {
      // Delete old avatar
      if (faculty.avatar) {
        await storageService.remove(faculty.avatar);
      }

      const { publicUrl } = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.AVATAR_FACULTY
      );
      updateData.avatar = publicUrl;
    }

    const updated = await prisma.faculty.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.status(200).json({ success: true, message: "Faculty updated", data: updated });
  } catch (err) {
    console.error("Update faculty error:", err);
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
};

// GET ALL STUDENTS (Faculty access - filtered by faculty's course and department)
exports.getAllStudents = async (req, res) => {
  try {
    const facultyId = req.user.id;

    // Get faculty details to filter students
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Find students with same course and branch as faculty's department
    const students = await prisma.student.findMany({
      where: {
        isVerified: true,
        course: faculty.course,
        branch: faculty.department
      },
      omit: { password: true },
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

// Block a student (Faculty can block students in their department)
exports.blockStudent = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const studentId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reason for blocking is required"
      });
    }

    // Get faculty details
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Find the student
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check if student belongs to faculty's course and department
    if (student.course !== faculty.course || student.branch !== faculty.department) {
      return res.status(403).json({
        success: false,
        message: "You can only block students from your course and department"
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
        blockedBy: facultyId,
        blockedByModel: 'Faculty',
        blockedAt: new Date(),
      },
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
    const facultyId = req.user.id;
    const studentId = req.params.id;

    // Get faculty details
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check if student belongs to faculty's course and department
    if (student.course !== faculty.course || student.branch !== faculty.department) {
      return res.status(403).json({
        success: false,
        message: "You can only unblock students from your course and department"
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
        blockedAt: null,
      },
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

// Get blocked students in faculty's department
exports.getBlockedStudents = async (req, res) => {
  try {
    const facultyId = req.user.id;

    // Get faculty details
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    const blockedStudents = await prisma.student.findMany({
      where: {
        isBlocked: true,
        isVerified: true,
        course: faculty.course,
        branch: faculty.department
      },
      omit: { password: true },
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
