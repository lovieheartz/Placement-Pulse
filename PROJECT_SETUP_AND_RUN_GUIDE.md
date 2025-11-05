# Placement College - Complete Setup & Run Guide

## 🎯 Project Overview

This is a full-stack **Placement Management System** with an AI-powered Resume Analyzer feature.

**Tech Stack:**
- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **AI Features**: Hugging Face API + Local AI Service (optional)

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** (Local or MongoDB Atlas) - [Download](https://www.mongodb.com/try/download/community)
3. **Git** - [Download](https://git-scm.com/)
4. **Python 3.8+** (Optional - for local AI service) - [Download](https://www.python.org/)

---

## 🚀 Quick Start Guide

### Step 1: Clone the Repository (if not already done)

```bash
# Navigate to your project directory
cd r:/Placement-College
```

### Step 2: Install Dependencies

#### Install Server Dependencies
```bash
cd server
npm install
```

#### Install Client Dependencies
```bash
cd ../client
npm install
```

### Step 3: Configure Environment Variables

#### Server Environment Setup

Create a `.env` file in the `server` directory if it doesn't exist:

```bash
cd ../server
```

Create/Edit `.env` file with the following content:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/placement-college
# OR use MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/placement-college

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (change this to a random string)
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Email Configuration (for notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Hugging Face API (Optional - for AI Resume Analysis)
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
# Get free API key from: https://huggingface.co/settings/tokens

# Local AI Service (Optional)
LOCAL_AI_SERVICE_URL=http://localhost:5000
```

**Important Notes:**
- Replace `your_super_secret_jwt_key_here_change_this_in_production` with a strong random string
- For email features, use Gmail App Password (not your regular password)
- Hugging Face API key is optional but recommended for better resume analysis

### Step 4: Start MongoDB

#### Option A: Local MongoDB
```bash
# Windows
mongod

# Linux/Mac
sudo systemctl start mongod
# OR
sudo service mongod start
```

#### Option B: MongoDB Atlas (Cloud)
- Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a cluster
- Get connection string and update `MONGO_URI` in `.env`

### Step 5: Start the Application

You need to run both **server** and **client** in separate terminals.

#### Terminal 1 - Start Backend Server
```bash
cd server
npm start
```

You should see:
```
✅ MongoDB connected
🚀 Server running on port 3001
```

#### Terminal 2 - Start Frontend Client
```bash
cd client
npm run dev
```

You should see:
```
VITE v6.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 6: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🔧 Project Structure

```
Placement-College/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   ├── ResumeAnalyzer.jsx          # Main analyzer component
│   │   │   ├── ResumeAnalysisHistory.jsx   # History viewer ✅ NEW
│   │   │   ├── StudentSidebar.jsx
│   │   │   ├── StudentHeader.jsx
│   │   │   └── ...
│   │   ├── pages/               # Page components
│   │   │   ├── ResumeAnalyzerPage.jsx      # Resume analyzer page
│   │   │   ├── StudentDashboard.jsx
│   │   │   └── ...
│   │   ├── context/             # React Context (Auth, etc.)
│   │   ├── App.jsx              # Main app component
│   │   └── main.jsx             # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Node.js Backend
│   ├── controllers/             # Business logic
│   │   ├── resumeAnalysisController.js  # Resume analysis logic
│   │   └── ...
│   ├── models/                  # MongoDB schemas
│   │   ├── ResumeAnalysis.js
│   │   ├── Student.js
│   │   └── ...
│   ├── routes/                  # API routes
│   │   ├── resumeAnalysisRoutes.js
│   │   └── ...
│   ├── middleware/              # Express middleware
│   │   ├── auth.js              # Authentication
│   │   ├── resumeUpload.js      # File upload handling
│   │   └── ...
│   ├── uploads/                 # Uploaded files
│   │   ├── resumes/             # Original resumes
│   │   └── optimized_resumes/   # AI-optimized resumes
│   ├── index.js                 # Server entry point
│   ├── package.json
│   └── .env                     # Environment variables
│
└── PROJECT_SETUP_AND_RUN_GUIDE.md  # This file
```

---

## 🎓 User Roles & Features

### 1. **Admin**
- Manage students and faculty
- View all placement activities
- Generate reports

### 2. **Faculty**
- Manage job postings
- Review student applications
- Track placement progress

### 3. **Student**
- Update profile
- Apply for jobs
- **AI Resume Analyzer** ✨ (NEW)
  - Upload resume (PDF/DOCX)
  - Get ATS compatibility score
  - Receive AI-powered suggestions
  - View analysis history
  - Download optimized resume

---

## 🤖 AI Resume Analyzer Features

### How It Works:
1. Student uploads resume (PDF or DOCX format)
2. Student provides job description
3. AI analyzes resume against job requirements
4. System generates:
   - **ATS Score** (0-100)
   - **Keyword Analysis** (matched/missing)
   - **Industry Detection**
   - **Detailed Score Breakdown**
   - **AI Recommendations**
   - **Optimized Resume**

### AI Service Options:

#### Option 1: Fallback Analysis (Default - No Setup Required)
- Built-in keyword matching algorithm
- No external dependencies
- Good for basic analysis

#### Option 2: Hugging Face API (Recommended)
- Free tier available
- Better AI analysis
- Setup:
  1. Create account at https://huggingface.co
  2. Generate API token at https://huggingface.co/settings/tokens
  3. Add to `.env`: `HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx`

#### Option 3: Local AI Service (Advanced)
- Best performance and privacy
- Requires Python and model downloads
- See `LOCAL_AI_SETUP_GUIDE.md` for setup

---

## 🐛 Troubleshooting

### Issue: "Failed to resolve import ResumeAnalysisHistory"
**✅ FIXED** - The component has been created at:
```
client/src/components/ResumeAnalysisHistory.jsx
```

### Issue: MongoDB Connection Error
**Solution:**
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Issue: Port 3001 or 5173 already in use
**Solution:**
```bash
# Windows - Kill process on port
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac - Kill process on port
lsof -ti:3001 | xargs kill -9
```

### Issue: "Module not found" errors
**Solution:**
```bash
# Clear node_modules and reinstall
cd client
rm -rf node_modules package-lock.json
npm install

cd ../server
rm -rf node_modules package-lock.json
npm install
```

### Issue: Resume upload fails
**Solution:**
- Ensure `server/uploads/resumes/` directory exists
- Check file size (must be < 10MB)
- Only PDF and DOCX formats supported

### Issue: AI analysis takes too long or fails
**Solution:**
- Fallback analysis will be used automatically
- Check Hugging Face API key if configured
- Ensure job description is provided

---

## 📝 API Endpoints

### Authentication
- `POST /login` - User login
- `POST /register` - Student registration
- `POST /logout` - User logout

### Resume Analysis
- `POST /api/resume-analysis/upload` - Upload and analyze resume
- `GET /api/resume-analysis/history` - Get analysis history
- `GET /api/resume-analysis/:analysisId` - Get specific analysis
- `DELETE /api/resume-analysis/:analysisId` - Delete analysis
- `GET /api/resume-analysis/download-optimized/:fileName` - Download optimized resume

### Student Routes
- `GET /student/:id` - Get student profile
- `PUT /student/:id` - Update student profile
- `GET /student/:id/applications` - Get job applications

---

## 🔒 Security Notes

1. **JWT Authentication**: All protected routes require valid JWT token
2. **Role-Based Access**: Resume analyzer is only accessible to students
3. **File Upload Security**:
   - Only PDF/DOCX allowed
   - 10MB file size limit
   - Files stored securely in uploads directory
4. **Environment Variables**: Never commit `.env` file to version control

---

## 🚢 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGO_URI=<your-production-mongodb-uri>
JWT_SECRET=<strong-random-secret>
PORT=3001
```

### Build Frontend
```bash
cd client
npm run build
```

### Deploy Backend
```bash
cd server
npm start
```

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or GitHub Pages
- **Backend**: Heroku, Railway, or DigitalOcean
- **Database**: MongoDB Atlas (cloud)

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/)

---

## 🆘 Need Help?

If you encounter any issues:

1. Check this guide thoroughly
2. Review error messages in both terminal windows
3. Check browser console for frontend errors
4. Verify all dependencies are installed
5. Ensure MongoDB is running
6. Confirm `.env` file is configured correctly

---

## ✅ Success Checklist

Before starting development, ensure:

- [ ] Node.js installed and working (`node --version`)
- [ ] MongoDB installed and running
- [ ] Server `.env` file configured
- [ ] Server dependencies installed (`npm install` in server/)
- [ ] Client dependencies installed (`npm install` in client/)
- [ ] Server running on port 3001
- [ ] Client running on port 5173
- [ ] Can access application at http://localhost:5173
- [ ] Can login/register users
- [ ] Can upload and analyze resume (for student users)

---

## 🎉 You're All Set!

Your Placement College system with AI Resume Analyzer is now ready to use!

**Default Test Credentials** (if seeded):
- Admin: Check your database or create via registration
- Student: Register new student account to test features

**Quick Start Commands:**
```bash
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend
cd client && npm run dev

# Access application
Open http://localhost:5173
```

---

**Last Updated**: 2025-01-06
**Version**: 1.0.0
