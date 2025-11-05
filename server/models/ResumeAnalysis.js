const mongoose = require("mongoose");

const ResumeAnalysisSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  resumeFile: {
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    }
  },
  extractedText: {
    type: String,
    required: true,
    default: ''
  },
  jobDescription: {
    type: String,
    required: true
  },
  analysis: {
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    missingKeywords: [{
      type: String
    }],
    suggestions: [{
      category: {
        type: String,
        enum: ['technical_skills', 'experience', 'education', 'keywords', 'formatting', 'general']
      },
      suggestion: {
        type: String,
        required: true
      },
      priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
      }
    }],
    optimizedResume: {
      type: String,
      required: true,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
ResumeAnalysisSchema.index({ student: 1, createdAt: -1 });
ResumeAnalysisSchema.index({ status: 1 });

// Virtual for formatted ATS score
ResumeAnalysisSchema.virtual('formattedAtsScore').get(function() {
  return `${this.analysis.atsScore}%`;
});

// Method to update analysis status
ResumeAnalysisSchema.methods.updateStatus = function(status, errorMessage = null) {
  this.status = status;
  if (errorMessage) {
    this.errorMessage = errorMessage;
  }
  return this.save();
};

// Static method to get student's recent analyses
ResumeAnalysisSchema.statics.getRecentAnalyses = function(studentId, limit = 10) {
  return this.find({ student: studentId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('student', 'name email');
};

const ResumeAnalysis = mongoose.model("ResumeAnalysis", ResumeAnalysisSchema);
module.exports = ResumeAnalysis;
