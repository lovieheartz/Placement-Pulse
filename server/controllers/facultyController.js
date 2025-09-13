const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const { sendFacultyWelcomeEmail, transporter } = require("../services/mailService");

exports.createFaculty = async (req, res) => {
  try {
    const { name, email, password, phone, specialization, createdBy } = req.body;

    if (!name || !email || !password || !phone || !specialization || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "All fields are required, including createdBy.",
      });
    }

    console.log(`Creating faculty with email: ${email}, password: ${password.substring(0, 3)}***`);

    const duplicate = await Faculty.findOne({ email });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Faculty email already exists.",
      });
    }

    let avatarPath = null;
    if (req.file) {
      avatarPath = `/uploads/Avatar_Faculty/${req.file.filename}`;
    }

    // Don't hash the password here, let the model's pre-save hook handle it
    const newFaculty = new Faculty({
      name,
      email,
      phone,
      specialization,
      password, // Use the plain password, the model will hash it
      role: "faculty",
      avatar: avatarPath,
      createdBy,
    });
    
    console.log(`Faculty object created, about to save: ${newFaculty.email}`);


    const savedFaculty = await newFaculty.save();
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
      savedFaculty.resetToken = resetToken;
      savedFaculty.resetTokenExpiry = resetTokenExpiry;
      await savedFaculty.save();
      
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
        id: savedFaculty._id,
        name: savedFaculty.name,
        email: savedFaculty.email,
        specialization: savedFaculty.specialization,
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
    const faculties = await Faculty.find({}, 'name email specialization phone createdAt avatar');
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
    const faculty = await Faculty.findByIdAndDelete(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    if (faculty.avatar) {
      const avatarPath = path.join(__dirname, "..", faculty.avatar);
      fs.unlink(avatarPath, (err) => {
        if (err) {
          console.error("Error deleting avatar during faculty deletion:", err.message);
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Faculty deleted successfully",
      data: {
        id: faculty._id,
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

    const faculty = await Faculty.findById(facultyId).select("-password");

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
    const { name, email, phone, specialization } = req.body;

    const faculty = await Faculty.findById(facultyId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    if (name) faculty.name = name;
    if (email) faculty.email = email;
    if (phone) faculty.phone = phone;
    if (specialization) faculty.specialization = specialization;

    const updatedFaculty = await faculty.save();

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

    const faculty = await Faculty.findById(facultyId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    if (faculty.avatar) {
      const oldPath = path.join(__dirname, "..", faculty.avatar);
      fs.unlink(oldPath, (err) => {
        if (err) {
          console.error("Error deleting previous avatar:", err.message);
        }
      });
    }

    const avatarPath = `/uploads/Avatar_Faculty/${req.file.filename}`;
    faculty.avatar = avatarPath;
    await faculty.save();

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
    const faculty = await Faculty.findById(req.params.id).select("-password");
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
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    // ✅ Defensive checks: Only update if value is provided
    if (req.body.name !== undefined) faculty.name = req.body.name;
    if (req.body.email !== undefined) faculty.email = req.body.email;
    if (req.body.phone !== undefined) faculty.phone = req.body.phone;
    if (req.body.specialization !== undefined) faculty.specialization = req.body.specialization;

    // ✅ Handle avatar upload safely
    if (req.file) {
      const newAvatarPath = `/uploads/Avatar_Faculty/${req.file.filename}`;

      // Delete old avatar
      if (faculty.avatar) {
        const oldPath = path.join(__dirname, "..", faculty.avatar);
        fs.unlink(oldPath, (err) => {
          if (err) console.error("Error deleting old avatar:", err.message);
        });
      }

      faculty.avatar = newAvatarPath;
    }

    const updated = await faculty.save();
    res.status(200).json({ success: true, message: "Faculty updated", data: updated });
  } catch (err) {
    console.error("Update faculty error:", err);
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
};

// GET ALL STUDENTS (Faculty access)
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({ isVerified: true }).select("-password -otp -otpExpiry");
    res.status(200).json({ success: true, data: students });
  } catch (err) {
    console.error("Get all students error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


