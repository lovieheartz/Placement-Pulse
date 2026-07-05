const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const pdf = require('pdf-parse');
const fs = require('fs').promises;

// Initialize AI providers
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Call AI provider with fallback support
 */
async function callAI(prompt, preferredProvider = 'gemini') {
  let providers = [];

  if (preferredProvider === 'gemini' && genAI) {
    providers = ['gemini', 'openai'];
  } else if (preferredProvider === 'openai' && openai) {
    providers = ['openai', 'gemini'];
  } else {
    if (genAI) providers.push('gemini');
    if (openai) providers.push('openai');
  }

  if (providers.length === 0) {
    throw new Error('No AI provider configured');
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      console.log(`Using ${provider.toUpperCase()} for PDF extraction...`);

      if (provider === 'gemini') {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          }
        });
        const result = await model.generateContent(prompt);
        return (await result.response).text();
      } else if (provider === 'openai') {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You extract questions from text and return valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 8000,
          response_format: { type: 'json_object' }
        });
        return completion.choices[0].message.content;
      }
    } catch (error) {
      console.error(`${provider.toUpperCase()} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All AI providers failed: ${lastError?.message}`);
}

/**
 * Extract questions from PDF using AI.
 * Accepts an in-memory Buffer (multer memoryStorage) or, for backward compatibility,
 * a file path string.
 */
exports.extractQuestionsFromPDF = async (pdfInput) => {
  try {
    const dataBuffer = Buffer.isBuffer(pdfInput) ? pdfInput : await fs.readFile(pdfInput);
    const pdfData = await pdf(dataBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    const questions = await extractQuestionsWithAI(pdfText);
    return questions;

  } catch (error) {
    console.error('Error extracting questions from PDF:', error);
    throw new Error(`Failed to extract questions: ${error.message}`);
  }
};

/**
 * Use AI to parse questions from text
 */
async function extractQuestionsWithAI(text) {
  try {
    const prompt = `
Extract ALL multiple-choice questions from this text.

RULES:
1. Extract EVERY question you find
2. Each question MUST have exactly 4 options (A, B, C, D)
3. Identify correct answer if marked
4. If correct answer unclear, use empty array []
5. Clean formatting issues
6. Number questions starting from 1

Output Format (STRICT JSON):
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "What is 2+2?",
      "options": [
        { "optionLabel": "A", "optionText": "3" },
        { "optionLabel": "B", "optionText": "4" },
        { "optionLabel": "C", "optionText": "5" },
        { "optionLabel": "D", "optionText": "6" }
      ],
      "correctAnswer": ["B"],
      "marks": 1,
      "difficultyLevel": "easy"
    }
  ]
}

TEXT TO ANALYZE:
${text}

Return ONLY valid JSON, no additional text.
`;

    const responseText = await callAI(prompt);
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedText);
      throw new Error('AI returned invalid JSON format');
    }

    const questions = parsedData.questions || parsedData;

    if (!Array.isArray(questions)) {
      throw new Error('AI response is not an array');
    }

    const validatedQuestions = questions.map((q, index) => ({
      questionNumber: q.questionNumber || index + 1,
      questionText: q.questionText || '',
      questionType: 'single-choice',
      options: validateOptions(q.options),
      correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : [],
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks || 0,
      difficultyLevel: q.difficultyLevel || 'medium',
      category: q.category || 'General'
    }));

    return validatedQuestions;

  } catch (error) {
    console.error('Error in AI question extraction:', error);
    throw error;
  }
}

/**
 * Validate options structure
 */
function validateOptions(options) {
  if (!Array.isArray(options)) {
    return generateDefaultOptions();
  }

  const labels = ['A', 'B', 'C', 'D'];
  const validatedOptions = labels.map((label, index) => {
    const existingOption = options.find(opt => opt.optionLabel === label);

    if (existingOption && existingOption.optionText) {
      return {
        optionLabel: label,
        optionText: existingOption.optionText
      };
    }

    if (options[index] && options[index].optionText) {
      return {
        optionLabel: label,
        optionText: options[index].optionText
      };
    }

    return {
      optionLabel: label,
      optionText: `Option ${label}`
    };
  });

  return validatedOptions;
}

/**
 * Generate default options
 */
function generateDefaultOptions() {
  return [
    { optionLabel: 'A', optionText: 'Option A' },
    { optionLabel: 'B', optionText: 'Option B' },
    { optionLabel: 'C', optionText: 'Option C' },
    { optionLabel: 'D', optionText: 'Option D' }
  ];
}

/**
 * Re-extract with feedback
 */
exports.reExtractWithFeedback = async (pdfPath, feedback) => {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdf(dataBuffer);
    const pdfText = pdfData.text;

    const prompt = `
Re-extract questions from this text with these corrections:
${JSON.stringify(feedback)}

TEXT: ${pdfText}

Return ONLY a JSON object with questions array.
`;

    const responseText = await callAI(prompt);
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsedData = JSON.parse(cleanedText);
    const questions = parsedData.questions || parsedData;

    return questions.map((q, i) => ({
      ...q,
      questionNumber: i + 1,
      questionType: 'single-choice',
      options: validateOptions(q.options)
    }));

  } catch (error) {
    console.error('Error in re-extraction:', error);
    throw error;
  }
};

module.exports = exports;
