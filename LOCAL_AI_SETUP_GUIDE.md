# Local AI Setup Guide for Resume Analyzer

This guide helps you set up offline AI-powered resume analysis using local Hugging Face models.

## 🎯 Overview

The Resume Analyzer now includes a **local AI service** that:
- ✅ Runs completely offline (no API keys needed)
- ✅ Uses lightweight Hugging Face models (FLAN-T5, RoBERTa)
- ✅ Provides intelligent resume analysis and optimization
- ✅ Integrates seamlessly with your existing MERN stack

## 🔧 Quick Setup (5 minutes)

### Step 1: Ensure Python is Installed
```bash
python --version
# Should show Python 3.8 or higher
```

If Python isn't installed:
- **Windows**: Download from [python.org](https://python.org)
- **Mac**: `brew install python` or download from python.org
- **Linux**: `sudo apt install python3 python3-pip`

### Step 2: Set Up AI Service
```bash
cd server/ai_service
setup.bat           # Windows
# or
./setup.sh          # Linux/Mac (create similar script)
```

This will:
- Create Python virtual environment
- Install AI dependencies (transformers, torch, flask)
- Download required NLTK data

### Step 3: Start Everything
```bash
# From project root
start_resume_analyzer.bat    # Windows

# Or manually start each service:
# Terminal 1: AI Service
cd server/ai_service && start_ai_service.bat

# Terminal 2: Node.js Server  
cd server && npm start

# Terminal 3: React Client
cd client && npm run dev
```

## 📋 System Requirements

### Minimum Requirements:
- **RAM**: 4GB (6GB+ recommended)
- **Storage**: 3GB free space
- **CPU**: Any modern CPU (GPU not required)
- **Python**: 3.8 or higher

### First Run:
- **Time**: 2-5 minutes (downloading AI models)
- **Internet**: Required for initial model download
- **Subsequent runs**: Fully offline, starts in ~30 seconds

## 🧪 Testing the Setup

### Test AI Service Only:
```bash
cd server/ai_service
python test_ai_service.py
```

### Test Full Integration:
1. Start all services
2. Go to Student Dashboard → Resume Analyzer
3. Upload a resume and job description
4. Verify you get detailed AI analysis

## 🔍 How It Works

### Architecture:
```
React Frontend (port 5173)
    ↓
Node.js API (port 3001)
    ↓
Python AI Service (port 5000)
    ↓
Local Hugging Face Models
```

### AI Analysis Process:
1. **File Upload**: Resume (PDF/DOCX) uploaded via React
2. **Text Extraction**: Node.js extracts text using pdf-parse/mammoth
3. **AI Analysis**: Python service analyzes using local models:
   - **FLAN-T5**: For text generation and optimization
   - **RoBERTa**: For sentiment and content analysis
   - **TF-IDF**: For semantic similarity scoring
4. **Results**: Comprehensive analysis returned to frontend

### Fallback Strategy:
```
Local AI Service (preferred)
    ↓ (if unavailable)
Hugging Face API (if API key exists)
    ↓ (if unavailable)
Rule-based Analysis (always works)
```

## 🎛️ Service Management

### Start AI Service:
```bash
cd server/ai_service
start_ai_service.bat
```

### Check AI Service Status:
```bash
curl http://localhost:5000/health
```

### Stop All Services:
Press `Ctrl+C` in each terminal window

### Restart After Changes:
The AI service doesn't need restart unless you modify Python code. Node.js server auto-restarts with nodemon.

## 🔧 Configuration

### AI Service Settings (`ai_server.py`):
```python
# Change port if 5000 is in use
app.run(host='0.0.0.0', port=5001, debug=False)

# Use different models for better performance/quality
model_name = "google/flan-t5-base"  # Larger model (more RAM needed)
# or
model_name = "google/flan-t5-small"  # Smaller model (default)
```

### Node.js Integration (`resumeAnalysisController.js`):
```javascript
// Change AI service URL if needed
const healthResponse = await axios.get('http://localhost:5001/health')
```

## 📊 Performance Expectations

### Analysis Speed:
- **First analysis**: 10-30 seconds (model loading)
- **Subsequent analyses**: 2-8 seconds
- **Large resumes**: +2-5 seconds

### Resource Usage:
- **Memory**: 2-3GB during analysis
- **CPU**: Moderate during analysis, minimal when idle
- **Storage**: ~3GB for models and dependencies

### Quality Comparison:
- **Local AI**: Advanced analysis, contextual suggestions
- **Hugging Face API**: Similar quality, requires API key
- **Rule-based Fallback**: Good analysis, keyword-focused

## 🐛 Troubleshooting

### "Cannot connect to AI service"
1. Check if Python service is running: `curl http://localhost:5000/health`
2. Start AI service: `cd server/ai_service && start_ai_service.bat`
3. Check Python installation: `python --version`

### "Models not loading"
1. Check internet connection (first run only)
2. Verify 3GB+ free disk space
3. Check Python virtual environment is activated
4. Try: `cd server/ai_service && python ai_server.py`

### "Out of memory" errors
1. Close other applications
2. Use smaller model in `ai_server.py`:
   ```python
   model_name = "google/flan-t5-small"
   ```
3. Increase system virtual memory

### "Port 5000 already in use"
1. Change port in `ai_server.py`
2. Update port in Node.js controller
3. Or stop other service using port 5000

### Dependencies not installing
1. Update pip: `python -m pip install --upgrade pip`
2. Use specific versions: `pip install torch==1.9.0`
3. Clear pip cache: `pip cache purge`

## 🚀 Advanced Usage

### Custom Models:
Replace model in `ai_server.py`:
```python
# For better quality (needs more RAM):
model_name = "google/flan-t5-base"

# For specialized tasks:
model_name = "microsoft/DialoGPT-medium"
```

### API Integration:
The AI service provides a REST API:
```bash
# Health check
GET http://localhost:5000/health

# Analyze resume
POST http://localhost:5000/analyze
{
  "resume_text": "...",
  "job_description": "..."
}
```

### Batch Processing:
The AI service can handle multiple requests, but processes them sequentially for memory efficiency.

## 🎉 Success Indicators

✅ **Setup Complete When**:
- Python service starts without errors
- Health check returns `"models_loaded": true`
- Test analysis completes in <30 seconds
- Resume Analyzer shows AI-powered results

✅ **Working Correctly When**:
- ATS scores vary based on content (not always same number)
- Missing keywords are relevant to job description
- Suggestions are specific and actionable
- Optimized resume includes improvements

## 📞 Support

If you encounter issues:

1. **Check logs**: Each service shows detailed logs in its terminal
2. **Run tests**: Use `test_ai_service.py` for diagnostics
3. **Verify setup**: Ensure all dependencies installed correctly
4. **Check resources**: Monitor RAM and disk usage
5. **Restart services**: Sometimes a fresh start helps

The local AI service provides powerful offline resume analysis without requiring any external API keys or internet connection after initial setup!

---

**Happy Resume Analyzing! 🎯**

