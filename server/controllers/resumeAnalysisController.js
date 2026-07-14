const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const aiService = require('../services/aiService');
const storageService = require('../services/storageService');

class ResumeAnalysisController {
  
  // Extract text from an uploaded resume buffer (multer memoryStorage)
  static async extractTextFromFile(fileBuffer, mimeType) {
    try {
      if (mimeType === 'application/pdf') {
        const data = await pdfParse(fileBuffer);
        return data.text;
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
      } else {
        throw new Error('Unsupported file format. Please upload PDF or DOCX files only.');
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      throw new Error('Failed to extract text from resume file');
    }
  }

  // Generate AI analysis using Gemini -> Fallback
  static async generateAIAnalysis(resumeText, jobDescription) {
    console.log('Starting AI analysis...');

    // 1ST PRIORITY: Gemini
    if (aiService.isAvailable()) {
      try {
        console.log('🚀 Attempting AI analysis (Gemini)...');
        const geminiResult = await aiService.analyzeResume(resumeText, jobDescription);
        console.log('✅ AI analysis successful!');

        // Convert Gemini format to our expected format
        return {
          ats_score: geminiResult.atsScore,
          score_breakdown: geminiResult.scoreBreakdown,
          detected_industry: geminiResult.detectedIndustry,
          matched_keywords: geminiResult.matchedKeywords || [],
          missing_keywords: geminiResult.missingKeywords || [],
          suggestions: geminiResult.suggestions || [],
          optimized_resume: resumeText, // Keep original for now
          analysis_metadata: geminiResult.skillGapAnalysis
        };
      } catch (error) {
        console.log('⚠️  Gemini AI failed, trying fallback:', error.message);
      }
    } else {
      console.log('⚠️  Gemini API not configured, using fallback');
    }

    // 2ND PRIORITY: Try local AI service
    try {
      console.log('Attempting to use local AI service...');
      const localAIResult = await ResumeAnalysisController.callLocalAIService(resumeText, jobDescription);
      if (localAIResult) {
        console.log('Local AI analysis successful');
        return localAIResult;
      }
    } catch (error) {
      console.log('Local AI service not available:', error.message);
    }

    // Last resort: keyword/rule-based scoring so the feature still returns
    // something useful if Gemini is unreachable.
    console.log('Using fallback rule-based analysis');
    return ResumeAnalysisController.generateFallbackAnalysis(resumeText, jobDescription);
  }

  // Call local AI service
  static async callLocalAIService(resumeText, jobDescription) {
    const axios = require('axios');
    
    try {
      // First check if the service is available
      const healthResponse = await axios.get('http://localhost:5000/health', {
        timeout: 5000
      });
      
      if (!healthResponse.data.models_loaded) {
        console.log('Local AI service found but models not loaded');
        // Try to load models
        try {
          await axios.post('http://localhost:5000/load-models', {}, { timeout: 60000 });
          console.log('Models loaded successfully');
        } catch (loadError) {
          console.log('Failed to load models:', loadError.message);
          return null;
        }
      }
      
      // Make analysis request
      const response = await axios.post('http://localhost:5000/analyze', {
        resume_text: resumeText,
        job_description: jobDescription
      }, {
        timeout: 30000,  // 30 second timeout for analysis
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        
        // Convert to expected format
        return {
          ats_score: data.ats_score,
          missing_keywords: data.missing_keywords || [],
          suggestions: data.suggestions || [],
          optimized_resume: data.optimized_resume || resumeText
        };
      } else {
        console.log('Local AI service returned error:', response.data.error);
        return null;
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('Local AI service not running on port 5000');
      } else if (error.code === 'ENOTFOUND') {
        console.log('Cannot connect to local AI service');
      } else {
        console.log('Local AI service error:', error.message);
      }
      return null;
    }
  }

  // Fallback analysis method
  static generateFallbackAnalysis(resumeText, jobDescription) {
    console.log('Generating fallback analysis...');
    
    try {
      const resumeWords = new Set(resumeText.toLowerCase().split(/\W+/).filter(word => word.length > 2));
      const jobWords = new Set(jobDescription.toLowerCase().split(/\W+/).filter(word => word.length > 2));
      
      // Calculate basic keyword overlap
      const commonWords = [...resumeWords].filter(word => 
        jobWords.has(word) && word.length > 3
      );
      
      console.log('Common words found:', commonWords.length);
      
      // Calculate ATS score based on keyword overlap
      const totalImportantJobWords = [...jobWords].filter(word => word.length > 4).length;
      const atsScore = Math.min(100, Math.max(20, (commonWords.length / Math.max(totalImportantJobWords * 0.3, 1)) * 100));
      
      // Find missing keywords (important ones from job description)
      const importantJobWords = [...jobWords]
        .filter(word => word.length > 4 && !resumeWords.has(word))
        .filter(word => !['the', 'and', 'for', 'with', 'you', 'will', 'are', 'have', 'this', 'that', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'into', 'than', 'only', 'over', 'also', 'after', 'first', 'work', 'where', 'much', 'then', 'them', 'these', 'many', 'some', 'what', 'made', 'when', 'more', 'very', 'most', 'such', 'about', 'would', 'there', 'could', 'other', 'years', 'people', 'between', 'through', 'during', 'before', 'should', 'never', 'being', 'against', 'without', 'having', 'might', 'while', 'where', 'those'].includes(word))
        .slice(0, 15);

      // Generate practical suggestions
      const suggestions = [
        {
          category: 'keywords',
          suggestion: 'Include more relevant technical keywords from the job description to improve ATS compatibility',
          priority: 'high'
        },
        {
          category: 'formatting',
          suggestion: 'Use clear section headers like "Experience", "Skills", "Education" for better ATS parsing',
          priority: 'medium'
        },
        {
          category: 'technical_skills',
          suggestion: 'Highlight specific technical skills mentioned in the job requirements',
          priority: 'high'
        },
        {
          category: 'experience',
          suggestion: 'Quantify your achievements with specific numbers and metrics where possible',
          priority: 'medium'
        }
      ];

      // Create an optimized version with keyword suggestions
      const keywordSuggestion = importantJobWords.length > 0 
        ? `\n\n--- OPTIMIZATION SUGGESTIONS ---\nConsider incorporating these relevant keywords from the job description:\n${importantJobWords.slice(0, 8).join(', ')}\n\nReview the job requirements and ensure your experience aligns with the key responsibilities mentioned.`
        : '\n\n--- OPTIMIZATION SUGGESTIONS ---\nYour resume already contains most relevant keywords from the job description.';

      const result = {
        ats_score: Math.round(atsScore),
        missing_keywords: importantJobWords.slice(0, 10),
        suggestions: suggestions,
        optimized_resume: resumeText + keywordSuggestion
      };

      console.log('Fallback analysis result:', {
        ats_score: result.ats_score,
        missing_keywords_count: result.missing_keywords.length,
        suggestions_count: result.suggestions.length
      });

      return result;
    } catch (error) {
      console.error('Error in fallback analysis:', error);
      // Basic fallback if even this fails
      return {
        ats_score: 50,
        missing_keywords: ['skills', 'experience', 'requirements'],
        suggestions: [
          {
            category: 'general',
            suggestion: 'Review your resume and ensure it matches the job requirements',
            priority: 'medium'
          }
        ],
        optimized_resume: resumeText + '\n\n--- Note: Please review and optimize your resume based on the job description requirements.'
      };
    }
  }

  // Validate analysis result
  static validateAnalysisResult(result) {
    return {
      ats_score: Math.max(0, Math.min(100, parseInt(result.ats_score) || 0)),
      missing_keywords: Array.isArray(result.missing_keywords) ? result.missing_keywords.slice(0, 20) : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 10).map(s => ({
        category: ['technical_skills', 'experience', 'education', 'keywords', 'formatting', 'general'].includes(s.category) ? s.category : 'general',
        suggestion: String(s.suggestion || '').substring(0, 500),
        priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium'
      })) : [],
      optimized_resume: String(result.optimized_resume || '').substring(0, 5000)
    };
  }

  // Generate a PDF from the optimized resume text, upload it to Supabase Storage,
  // and return its public URL.
  static async generateOptimizedResumePDF(optimizedText, originalFilename) {
    try {
      const fileName = `optimized_${Date.now()}_${originalFilename.replace(/\.[^/.]+$/, '')}.pdf`;

      // Render the PDF into an in-memory buffer (no disk writes)
      const pdfBuffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(16).text('Optimized Resume', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(optimizedText, { align: 'left' });
        doc.end();
      });

      const { publicUrl } = await storageService.uploadBuffer(pdfBuffer, {
        folder: storageService.FOLDERS.OPTIMIZED_RESUME,
        originalName: fileName,
        mimetype: 'application/pdf',
        fieldName: 'optimized',
      });

      return { fileName, publicUrl };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate optimized resume PDF');
    }
  }

  // Upload and analyze resume
  static async uploadAndAnalyze(req, res) {
    const startTime = Date.now();
    let analysisRecord = null;
    
    try {
      console.log('=== Resume Analysis Request Started ===');
      console.log('File uploaded:', req.file ? 'Yes' : 'No');
      console.log('User ID:', req.user?.id);
      
      // Validate request
      if (!req.file) {
        console.log('Error: No file uploaded');
        return res.status(400).json({
          success: false,
          message: 'No resume file uploaded'
        });
      }

      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const { jobDescription } = req.body;
      if (!jobDescription || jobDescription.trim().length === 0) {
        console.log('Error: No job description provided');
        return res.status(400).json({
          success: false,
          message: 'Job description is required'
        });
      }

      console.log('Job description length:', jobDescription.trim().length);

      // Get student from auth middleware
      const studentId = req.user.id;
      console.log('Looking for student with ID:', studentId);
      
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        console.log('Error: Student not found');
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      console.log('Student found:', student.name);

      console.log('Extracting text from file first...');
      // Extract text from the in-memory resume buffer BEFORE creating the record
      const extractedText = await ResumeAnalysisController.extractTextFromFile(req.file.buffer, req.file.mimetype);
      console.log('Text extracted, length:', extractedText.length);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Could not extract text from the uploaded file. Please ensure it\'s a valid PDF or DOCX file.');
      }

      console.log('Generating AI analysis...');
      // Generate AI analysis BEFORE creating the record
      const aiAnalysis = await ResumeAnalysisController.generateAIAnalysis(extractedText, jobDescription);
      console.log('AI analysis completed:', aiAnalysis);

      // Transform suggestions if they're plain strings
      const transformedSuggestions = Array.isArray(aiAnalysis.suggestions)
        ? aiAnalysis.suggestions.map(suggestion => {
            // If it's already an object with the right structure, keep it
            if (typeof suggestion === 'object' && suggestion.suggestion) {
              return {
                category: suggestion.category || 'general',
                suggestion: String(suggestion.suggestion).substring(0, 500),
                priority: suggestion.priority || 'medium'
              };
            }
            // If it's a plain string, convert it
            return {
              category: 'general',
              suggestion: String(suggestion).substring(0, 500),
              priority: 'medium'
            };
          })
        : [];

      console.log('Transformed suggestions:', transformedSuggestions.length);

      // Upload the original resume to Supabase Storage
      const uploadedResume = await storageService.uploadMulterFile(
        req.file,
        storageService.FOLDERS.RESUME
      );

      // Create analysis record with all required fields
      analysisRecord = await prisma.resumeAnalysis.create({
        data: {
          student: studentId,
          resumeFile: {
            filename: uploadedResume.path.split('/').pop(),
            originalName: req.file.originalname,
            filePath: uploadedResume.publicUrl,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
          },
          extractedText: extractedText,
          jobDescription: jobDescription.trim(),
          analysis: {
            atsScore: aiAnalysis.ats_score || 0,
            missingKeywords: aiAnalysis.missing_keywords || [],
            suggestions: transformedSuggestions,
            optimizedResume: aiAnalysis.optimized_resume || extractedText
          },
          status: 'completed',
          processingTime: Date.now() - startTime
        }
      });
      console.log('Analysis record saved successfully');

      console.log('Generating optimized resume PDF...');
      // Generate optimized resume PDF
      const pdfResult = await ResumeAnalysisController.generateOptimizedResumePDF(
        aiAnalysis.optimized_resume,
        req.file.originalname
      );
      console.log('PDF generated:', pdfResult.fileName);

      // Return response with enhanced structure
      res.status(200).json({
        success: true,
        message: 'Resume analysis completed successfully',
        data: {
          analysisId: analysisRecord.id,
          atsScore: aiAnalysis.ats_score,
          score_breakdown: aiAnalysis.score_breakdown || {},
          detected_industry: aiAnalysis.detected_industry || 'general',
          missing_keywords: aiAnalysis.missing_keywords || [],
          matched_keywords: aiAnalysis.matched_keywords || [],
          missingKeywords: aiAnalysis.missing_keywords || [], // Legacy support
          suggestions: aiAnalysis.suggestions || [],
          optimizedResume: aiAnalysis.optimized_resume,
          optimizedPdfUrl: pdfResult.publicUrl,
          processingTime: analysisRecord.processingTime,
          analysis_metadata: aiAnalysis.analysis_metadata || {}
        }
      });

    } catch (error) {
      console.error('Error in uploadAndAnalyze:', error);
      
      // Update analysis record with error
      if (analysisRecord) {
        await prisma.resumeAnalysis.update({
          where: { id: analysisRecord.id },
          data: {
            status: 'failed',
            errorMessage: error.message,
            processingTime: Date.now() - startTime
          }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to analyze resume',
        error: error.message
      });
    }
  }

  // Get analysis history for student
  static async getAnalysisHistory(req, res) {
    try {
      const studentId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const analyses = await prisma.resumeAnalysis.findMany({
        where: { student: studentId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10),
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        omit: { extractedText: true } // Exclude large text field
      });

      const total = await prisma.resumeAnalysis.count({ where: { student: studentId } });

      // Transform data to match frontend expectations
      const transformedAnalyses = analyses.map(analysis => ({
        _id: analysis.id,
        atsScore: analysis.analysis?.atsScore || 0,
        score_breakdown: analysis.analysis?.scoreBreakdown || {},
        detected_industry: analysis.analysis?.detectedIndustry || 'general',
        matched_keywords: analysis.analysis?.matchedKeywords || [],
        missing_keywords: analysis.analysis?.missingKeywords || [],
        suggestions: analysis.analysis?.suggestions || [],
        resumeFileName: analysis.resumeFile?.originalName || 'Unknown',
        createdAt: analysis.createdAt,
        processingTime: analysis.processingTime
      }));

      res.status(200).json({
        success: true,
        data: transformedAnalyses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error getting analysis history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analysis history',
        error: error.message
      });
    }
  }

  // Get specific analysis
  static async getAnalysis(req, res) {
    try {
      const { analysisId } = req.params;
      const studentId = req.user.id;

      const analysis = await prisma.resumeAnalysis.findFirst({
        where: {
          id: analysisId,
          student: studentId
        }
      });

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not found'
        });
      }

      res.status(200).json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('Error getting analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analysis',
        error: error.message
      });
    }
  }

  // Download optimized resume PDF
  static async downloadOptimizedPDF(req, res) {
    try {
      const { fileName } = req.params;
      const filePath = path.join(__dirname, '../uploads/optimized_resumes', fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Optimized resume file not found'
        });
      }

      res.download(filePath, fileName);

    } catch (error) {
      console.error('Error downloading optimized PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download optimized resume',
        error: error.message
      });
    }
  }

  // Delete analysis
  static async deleteAnalysis(req, res) {
    try {
      const { analysisId } = req.params;
      const studentId = req.user.id;

      const analysis = await prisma.resumeAnalysis.findFirst({
        where: {
          id: analysisId,
          student: studentId
        }
      });

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not found'
        });
      }

      // Delete associated resume file from Supabase Storage
      if (analysis.resumeFile?.filePath) {
        await storageService.remove(analysis.resumeFile.filePath);
      }

      // Delete the analysis record
      await prisma.resumeAnalysis.delete({ where: { id: analysisId } });

      res.status(200).json({
        success: true,
        message: 'Analysis deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete analysis',
        error: error.message
      });
    }
  }
}

module.exports = ResumeAnalysisController;
