const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'form'],
    default: 'text',
    required: true,
  },
  formLink: {
    type: String,
    trim: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  expired: {
    type: Boolean,
    default: false,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  extraInfo: {
    type: String,
    trim: true,
  },
  attachment: {
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
  },
  recipients: {
    students: {
      all: {
        type: Boolean,
        default: false,
      },
      courses: [{
        type: String,
        enum: ['BTech', 'MTech', 'BCA', 'MCA', 'BBA', 'MBA', 'Diploma']
      }],
      branches: [{
        type: String,
      }],
      passoutYears: [{
        type: Number,
      }],
    },
    faculty: {
      all: {
        type: Boolean,
        default: false,
      },
      specializations: [{
        type: String,
      }],
    },
    admins: {
      all: {
        type: Boolean,
        default: false,
      },
      names: [{
        type: String,
      }],
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    required: true,
  },
  createdByModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Faculty'],
  },
  isRead: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      enum: ['Admin', 'Faculty', 'Student'],
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;