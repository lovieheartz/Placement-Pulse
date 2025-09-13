const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+\d{10,15}$/, 'Please enter a valid phone number with country code'] // basic validation
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'faculty', 'student'],
    default: 'student'
  }
}, {
  timestamps: true
});

const EmployeeModel = mongoose.model('Employee', EmployeeSchema);

module.exports = EmployeeModel;
