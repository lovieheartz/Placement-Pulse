const mongoose = require('mongoose');

const nocSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  universityRoll: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  personalEmail: {
    type: String,
    required: true
  },
  collegeEmail: {
    type: String,
    required: true
  },
  passoutYear: {
    type: Number,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  applicationText: {
    type: String,
    required: true,
    maxlength: 1000
  },
  attachment: {
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  },
  status: {
    type: String,
    enum: ['sent', 'read', 'reply_soon', 'completed'],
    default: 'sent'
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('NOC', nocSchema);