const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.warn('⚠️  Gemini API key not configured. Using fallback analysis.');
      this.genAI = null;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
      this.model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });
      console.log(`✅ Gemini AI initialized successfully with model: ${modelName}`);
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error.message);
      this.genAI = null;
    }
  }

  async analyzeResume(resumeText, jobDescription) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured. Please add GEMINI_API_KEY to .env file');
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer and career consultant.

**Resume:**
${resumeText}

**Job Description:**
${jobDescription}

**Task:**
Perform a comprehensive analysis of this resume against the job description and provide detailed, actionable feedback.

**Response Format (MUST be valid JSON):**
{
  "atsScore": <number 0-100>,
  "scoreBreakdown": {
    "keywordMatching": <number 0-100>,
    "skillAlignment": <number 0-100>,
    "experienceRelevance": <number 0-100>,
    "formatCompatibility": <number 0-100>,
    "industryAlignment": <number 0-100>,
    "semanticRelevance": <number 0-100>
  },
  "detectedIndustry": "<industry name>",
  "matchedKeywords": ["keyword1", "keyword2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "suggestions": [
    {
      "title": "Suggestion Title",
      "suggestion": "Detailed suggestion text",
      "priority": "high|medium|low",
      "impact": "Expected improvement description"
    }
  ],
  "skillGapAnalysis": {
    "presentSkills": ["skill1", "skill2"],
    "missingSkills": ["skill1", "skill2"],
    "recommendations": ["Learn X", "Get certified in Y"]
  }
}

**Important:**
1. Be precise and realistic with scores
2. Provide actionable, specific suggestions
3. Focus on both content and ATS compatibility
4. Return ONLY valid JSON, no markdown or additional text`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up the response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const analysisData = JSON.parse(text);

      // Validate the response structure
      if (!analysisData.atsScore || !analysisData.scoreBreakdown) {
        throw new Error('Invalid response structure from Gemini');
      }

      console.log('✅ Gemini analysis completed successfully');
      return analysisData;

    } catch (error) {
      console.error('❌ Gemini analysis error:', error.message);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async generateInterviewQuestions(topic, level, count = 10) {
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    const prompt = `Generate ${count} ${level}-level interview questions for ${topic} topic.
Return as JSON array: [{"question": "...", "expectedAnswer": "...", "difficulty": "..."}]`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error('Gemini interview generation error:', error);
      throw error;
    }
  }

  isAvailable() {
    return this.genAI !== null;
  }
}

module.exports = new GeminiService();
