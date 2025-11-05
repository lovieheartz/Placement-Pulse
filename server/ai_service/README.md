# Local AI Service for Resume Analyzer

This service provides offline AI-powered resume analysis using Hugging Face transformers.

## Features

- **Offline Operation**: No API keys required, runs completely locally
- **Lightweight Models**: Uses FLAN-T5-small and RoBERTa for efficient local processing
- **REST API**: Simple HTTP interface for integration with Node.js backend
- **Comprehensive Analysis**: 
  - ATS scoring based on keyword and semantic analysis
  - Missing keyword identification
  - Improvement suggestions
  - Optimized resume generation

## Setup Instructions

### 1. Install Python
Ensure Python 3.8+ is installed on your system:
```bash
python --version
```

### 2. Run Setup
Double-click `setup.bat` or run:
```bash
cd server/ai_service
setup.bat
```

This will:
- Create a Python virtual environment
- Install required dependencies (transformers, flask, torch, etc.)
- Download necessary NLTK data

### 3. Start the Service
Double-click `start_ai_service.bat` or run:
```bash
start_ai_service.bat
```

The service will start on `http://localhost:5000`

**Note**: First startup may take 2-5 minutes as AI models are downloaded and loaded.

## API Endpoints

### Health Check
```http
GET http://localhost:5000/health
```

Response:
```json
{
  "status": "healthy",
  "models_loaded": true,
  "service": "Resume AI Analysis Service"
}
```

### Analyze Resume
```http
POST http://localhost:5000/analyze
Content-Type: application/json

{
  "resume_text": "Your resume content here...",
  "job_description": "Job description content here..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "ats_score": 75,
    "missing_keywords": ["python", "machine learning", "sql"],
    "suggestions": [
      {
        "category": "keywords",
        "suggestion": "Include relevant keywords from the job description",
        "priority": "high"
      }
    ],
    "optimized_resume": "Enhanced resume text with suggestions...",
    "analysis_details": {
      "keyword_score": 60.5,
      "semantic_score": 45.2,
      "common_keywords_count": 12
    }
  }
}
```

### Load Models (if not auto-loaded)
```http
POST http://localhost:5000/load-models
```

## Models Used

1. **FLAN-T5-small**: For text generation and optimization suggestions
2. **RoBERTa-base-sentiment**: For content analysis and scoring
3. **TF-IDF + Cosine Similarity**: For semantic text comparison
4. **NLTK**: For text processing and keyword extraction

## System Requirements

- **RAM**: 4GB+ recommended (models require ~2GB)
- **Storage**: ~3GB for models and dependencies
- **CPU**: Any modern CPU (GPU not required)
- **Python**: 3.8 or higher

## Troubleshooting

### Models Not Loading
- Ensure stable internet connection for initial model download
- Check available disk space (3GB+ required)
- Verify Python virtual environment is activated

### Port 5000 Already in Use
Edit `ai_server.py` and change the port:
```python
app.run(host='0.0.0.0', port=5001, debug=False)  # Use different port
```

Then update the Node.js integration accordingly.

### Memory Issues
If experiencing memory issues, you can:
1. Reduce batch size in model loading
2. Use even smaller models (modify `ai_server.py`)
3. Increase system virtual memory

## Integration with Node.js

The Node.js backend automatically detects and uses this local AI service when available. No configuration changes needed in the main application.

## Offline Capability

Once models are downloaded (first run), the service works completely offline. Models are cached locally in:
- `~/.cache/huggingface/transformers/` (Windows)
- `~/.cache/huggingface/hub/` (Linux/Mac)

## Performance

- **First Analysis**: 10-30 seconds (model loading)
- **Subsequent Analyses**: 2-5 seconds
- **Memory Usage**: ~2-3GB during operation
- **CPU Usage**: Moderate during analysis, low when idle

