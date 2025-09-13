const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // ⬅️ Add JWT

const AdminSchema = new mongoose.Schema({
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
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+\d{10,15}$/, 'Please enter a valid phone number with country code'],
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
    default: 'admin',
    enum: ['admin'],
  },
  facultyManaged: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
    },
  ],
  resetToken: String,
  resetTokenExpiry: Date,
}, {
  timestamps: true,
});

// 🔐 Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔁 Compare password method
AdminSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🔑 Generate JWT token
AdminSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;
