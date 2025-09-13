const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // 🔑 Required for token generation

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+\d{10,15}$/, 'Please enter a valid phone number with country code'],
  },
  specialization: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    default: "faculty",
  },
  resetToken: String,
  resetTokenExpiry: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true
  },
}, {
  timestamps: true
});

// 🔐 Hash password before save
facultySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log(`Password hashed for faculty ${this.email}: ${this.password.substring(0, 20)}...`);
    next();
  } catch (err) {
    console.error(`Error hashing password for faculty ${this.email}:`, err);
    next(err);
  }
});

// 🔁 Compare password method
facultySchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🔑 Generate JWT token method
facultySchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

module.exports = mongoose.model("Faculty", facultySchema);
