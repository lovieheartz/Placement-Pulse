  const mongoose = require("mongoose");
  const bcrypt = require("bcryptjs");
  const jwt = require("jsonwebtoken");

  const StudentSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email) {
          return email.endsWith('@nsec.ac.in');
        },
        message: 'Email must be from @nsec.ac.in domain'
      }
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+\d{10,15}$/, 'Please enter a valid phone number with country code'],
    },
    course: {
      type: String,
      required: true,
      enum: ['BTech', 'MTech', 'BCA', 'MCA', 'BBA', 'MBA', 'Diploma']
    },
    branch: {
      type: String,
      required: true,
      trim: true
    },
    admissionYear: {
      type: Number,
      required: true
    },
    passoutYear: {
      type: Number,
      required: true
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ['admin', 'faculty', 'student'],
      default: "student"
    },

    resetToken: String,
    resetTokenExpiry: Date,
    isVerified: {
      type: Boolean,
      default: false,
      required: true
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockedAt: {
      type: Date,
      default: null
    },
  }, {
    timestamps: true,
  });

  // 🔐 Hash password before saving
  StudentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (err) {
      next(err);
    }
  });
  
  // Log verification status changes
  StudentSchema.pre('save', function(next) {
    if (this.isModified('isVerified')) {
      console.log(`Student ${this.email} verification status changed to: ${this.isVerified}`);
    }
    next();
  });

  // 🔁 Compare password method
  StudentSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  // 🔑 Generate JWT token method
  StudentSchema.methods.generateToken = function () {
    return jwt.sign(
      { id: this._id, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  };

  const Student = mongoose.model("Student", StudentSchema);
  module.exports = Student;
