# AI Resume Analyzer Setup & Usage Guide

## Overview

The AI Resume Analyzer is a powerful feature that analyzes student resumes against job descriptions using Hugging Face's AI models. It provides:

- **ATS Score (0-100)**: Measures how well the resume matches applicant tracking systems
- **Missing Keywords**: Identifies important keywords from job descriptions that are missing in the resume
- **Improvement Suggestions**: Provides categorized suggestions to improve the resume
- **Optimized Resume**: Generates an AI-optimized version of the resume
- **PDF Download**: Allows downloading the optimized resume as a PDF

## Prerequisites

1. **Hugging Face Account**: You need a Hugging Face account and API token
2. **Node.js Dependencies**: Additional packages are installed automatically
3. **MongoDB**: For storing analysis data

## Setup Instructions

### 1. Install Backend Dependencies

The following packages have been automatically installed:
```bash
npm install @huggingface/inference pdf-parse mammoth pdfkit
```

### 2. Install Frontend Dependencies

The following packages have been automatically installed:
```bash
npm install react-circular-progressbar file-saver
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory with the following variables:

```env
# Existing variables (keep your current values)
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password

# New variable for Resume Analyzer
HUGGINGFACE_API_KEY=your_huggingface_api_token_here
```

### 4. Get Hugging Face API Token

1. Go to [Hugging Face](https://huggingface.co/)
2. Create an account or log in
3. Go to Settings → Access Tokens
4. Create a new token with "Read" permissions
5. Copy the token and add it to your `.env` file

## File Structure

### Backend Files Created/Modified:
```
server/
├── models/ResumeAnalysis.js          # MongoDB model for storing analysis data
├── controllers/resumeAnalysisController.js  # Main controller with AI logic
├── middleware/resumeUpload.js        # Multer configuration for file uploads
├── routes/resumeAnalysisRoutes.js    # API routes
├── uploads/
│   ├── resumes/                      # Uploaded resume files
│   └── optimized_resumes/            # Generated optimized PDFs
└── index.js                          # Updated with new routes
```

### Frontend Files Created/Modified:
```
client/src/
├── components/
│   ├── ResumeAnalyzer.jsx           # Main analyzer component
│   └── ResumeAnalysisHistory.jsx    # History viewing component
├── pages/
│   ├── ResumeAnalyzerPage.jsx       # Page wrapper with tabs
│   └── StudentDashboard.jsx         # Updated with analyzer card
└── App.jsx                          # Updated with new route
```

## Features

### 1. Resume Upload
- Supports PDF and DOCX files
- Maximum file size: 10MB
- Drag-and-drop interface
- File validation

### 2. AI Analysis
- Uses Hugging Face text generation models
- Parses resume text from uploaded files
- Compares against provided job descriptions
- Generates structured JSON responses

### 3. Results Display
- **ATS Score**: Visual circular progress bar
- **Missing Keywords**: Color-coded keyword tags
- **Suggestions**: Categorized by priority (high/medium/low)
- **Optimized Resume**: Full-text preview and PDF download

### 4. History Management
- Stores all analysis results in MongoDB
- Paginated history view
- Detailed analysis viewing
- Status tracking (processing/completed/failed)

## API Endpoints

### Resume Analysis Routes
All routes require authentication and student role:

```
POST /api/resume-analysis/upload
- Upload and analyze resume
- Body: FormData with 'resume' file and 'jobDescription' text

GET /api/resume-analysis/history?page=1&limit=10
- Get analysis history for current student

GET /api/resume-analysis/:analysisId
- Get specific analysis details

GET /api/resume-analysis/download-optimized/:fileName
- Download optimized resume PDF
```

## Database Schema

### ResumeAnalysis Model
```javascript
{
  student: ObjectId,              // Reference to Student
  resumeFile: {
    filename: String,             // Stored filename
    originalName: String,         // Original filename
    filePath: String,            // File storage path
    fileSize: Number,            // File size in bytes
    mimeType: String             // MIME type
  },
  extractedText: String,         // Parsed resume text
  jobDescription: String,        // Job description provided
  analysis: {
    atsScore: Number,            // Score 0-100
    missingKeywords: [String],   // Array of missing keywords
    suggestions: [{
      category: String,          // Suggestion category
      suggestion: String,        // Suggestion text
      priority: String          // high/medium/low
    }],
    optimizedResume: String     // Optimized resume text
  },
  status: String,               // processing/completed/failed
  processingTime: Number,       // Processing time in ms
  errorMessage: String,         // Error message if failed
  timestamps: true              // createdAt, updatedAt
}
```

## Usage Instructions

### For Students:

1. **Navigate to Resume Analyzer**
   - Go to Student Dashboard
   - Click on "AI Resume Analyzer" card
   - Or use the sidebar menu

2. **Upload Resume**
   - Drag and drop PDF/DOCX file
   - Or click "Choose File" to browse

3. **Provide Job Description**
   - Paste the job description in the text area
   - Include relevant keywords and requirements

4. **Analyze Resume**
   - Click "Analyze Resume" button
   - Wait for AI processing (usually 10-30 seconds)

5. **Review Results**
   - Check ATS score and improvement areas
   - Review missing keywords
   - Read improvement suggestions
   - Preview optimized resume

6. **Download Optimized Resume**
   - Click "Download Optimized Resume (PDF)"
   - Save the improved version

7. **View History**
   - Switch to "Analysis History" tab
   - View past analyses and results
   - Click "View Details" for full analysis

## Technical Notes

### AI Model Information
- Uses Hugging Face Inference API
- Primary model: `microsoft/DialoGPT-large`
- Fallback: Rule-based analysis if AI fails
- JSON-structured prompts for consistent responses

### File Processing
- PDF parsing: `pdf-parse` library
- DOCX parsing: `mammoth` library
- PDF generation: `pdfkit` library
- File storage: Local filesystem with organized directories

### Error Handling
- Comprehensive error handling throughout
- Fallback analysis if AI service fails
- User-friendly error messages
- Automatic status tracking

### Security Features
- Student-only access control
- File type and size validation
- Secure file storage
- Input sanitization

## Troubleshooting

### Common Issues:

1. **"Failed to analyze resume"**
   - Check Hugging Face API key in `.env`
   - Verify internet connection
   - Check server logs for detailed errors

2. **File upload fails**
   - Ensure file is PDF or DOCX
   - Check file size (max 10MB)
   - Verify uploads directory permissions

3. **Missing environment variables**
   - Ensure `HUGGINGFACE_API_KEY` is set in `.env`
   - Restart server after adding environment variables

4. **PDF download not working**
   - Check `uploads/optimized_resumes` directory exists
   - Verify file permissions
   - Check browser download settings

## Future Enhancements

Potential improvements for future versions:
- Support for more file formats (RTF, TXT)
- Job description templates
- Resume scoring history graphs
- Bulk analysis capabilities
- Integration with job boards
- Machine learning model fine-tuning
- Resume template suggestions
- ATS compatibility checking for specific companies

## Support

For technical issues:
1. Check server and browser console logs
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Check file permissions for upload directories

The Resume Analyzer is now fully integrated and ready for use by students to improve their job application success rates!

