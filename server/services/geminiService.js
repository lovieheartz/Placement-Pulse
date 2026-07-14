const aiProvider = require('./aiProvider');
const { Type } = aiProvider;

const pct = { type: Type.INTEGER, description: '0-100' };

const RESUME_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    atsScore: pct,
    scoreBreakdown: {
      type: Type.OBJECT,
      properties: {
        keywordMatching: pct,
        skillAlignment: pct,
        experienceRelevance: pct,
        formatCompatibility: pct,
        industryAlignment: pct,
        semanticRelevance: pct,
      },
      required: [
        'keywordMatching', 'skillAlignment', 'experienceRelevance',
        'formatCompatibility', 'industryAlignment', 'semanticRelevance',
      ],
    },
    detectedIndustry: { type: Type.STRING },
    matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          impact: { type: Type.STRING },
        },
        required: ['title', 'suggestion', 'priority', 'impact'],
      },
    },
    skillGapAnalysis: {
      type: Type.OBJECT,
      properties: {
        presentSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['presentSkills', 'missingSkills', 'recommendations'],
    },
  },
  required: [
    'atsScore', 'scoreBreakdown', 'detectedIndustry', 'matchedKeywords',
    'missingKeywords', 'suggestions', 'skillGapAnalysis',
  ],
};

/**
 * Resume / interview helpers.
 *
 * All model selection lives in aiProvider — this file only owns the prompts.
 * (It used to pin gemini-2.0-flash-exp, which Google has since deleted, so
 * every call here was failing.)
 */
class GeminiService {
  async analyzeResume(resumeText, jobDescription) {
    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer and career consultant.

**Resume:**
${resumeText}

**Job Description:**
${jobDescription}

**Task:**
Analyze this resume against the job description and give detailed, actionable feedback.

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
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": [
    {
      "title": "Suggestion Title",
      "suggestion": "Detailed suggestion text",
      "priority": "high|medium|low",
      "impact": "Expected improvement description"
    }
  ],
  "skillGapAnalysis": {
    "presentSkills": ["skill1"],
    "missingSkills": ["skill1"],
    "recommendations": ["Learn X", "Get certified in Y"]
  }
}

Be precise and realistic with scores. Make every suggestion specific and actionable.`;

    const analysis = await aiProvider.generateJSON(prompt, {
      schema: RESUME_SCHEMA,
      temperature: 0.7,
      maxTokens: 16384,
    });

    console.log(`✅ Resume analyzed: ATS score ${analysis.atsScore}`);
    return analysis;
  }

  async generateInterviewQuestions(topic, level, count = 10) {
    const prompt = `Generate ${count} ${level}-level interview questions for the topic "${topic}".
Return a JSON array: [{"question": "...", "expectedAnswer": "...", "difficulty": "..."}]`;

    return aiProvider.generateJSON(prompt, { temperature: 0.8, maxTokens: 4096 });
  }

  /** Free-form structured generation for callers that own their own prompt. */
  async generateJSON(prompt, options = {}) {
    return aiProvider.generateJSON(prompt, { temperature: 0.7, maxTokens: 4096, ...options });
  }

  isAvailable() {
    return aiProvider.isAvailable();
  }
}

module.exports = new GeminiService();
