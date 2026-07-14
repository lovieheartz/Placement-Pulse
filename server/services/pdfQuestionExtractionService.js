const aiProvider = require('./aiProvider');
const fs = require('fs').promises;
const { Type } = aiProvider;

const EXTRACT_RULES = `Extract EVERY multiple-choice question from this question paper.

RULES:
1. Extract EVERY question you find — do not stop early or summarise.
2. Each question must have exactly 4 options, labelled A, B, C and D.
3. If the paper marks the correct answer, put its label in correctAnswer, e.g. ["B"].
4. If the correct answer is not indicated, use an empty array [].
5. Transcribe the question text faithfully; fix only obvious OCR/formatting noise.
6. Number the questions from 1 in the order they appear.
7. Never invent questions that are not in the document.`;

const QUESTION_SET_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          questionText: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                optionLabel: { type: Type.STRING, description: 'A, B, C or D' },
                optionText: { type: Type.STRING },
              },
              required: ['optionLabel', 'optionText'],
            },
          },
          correctAnswer: { type: Type.ARRAY, items: { type: Type.STRING } },
          marks: { type: Type.INTEGER },
          difficultyLevel: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ['questionText', 'options', 'correctAnswer'],
      },
    },
  },
  required: ['questions'],
};

/**
 * Extract questions from a question-paper PDF.
 *
 * The PDF goes to Gemini as raw bytes rather than being run through a text
 * extractor first. Gemini reads PDFs natively, which keeps option layout and
 * tables intact, works on scanned/handwritten papers, and sidesteps pdf-parse
 * choking on perfectly valid files ("bad XRef entry").
 *
 * @param {Buffer|string} pdfInput in-memory buffer, or a path for older callers
 */
exports.extractQuestionsFromPDF = async (pdfInput) => {
  try {
    const buffer = Buffer.isBuffer(pdfInput) ? pdfInput : await fs.readFile(pdfInput);

    const parsedData = await aiProvider.generateVision(
      [
        aiProvider.filePart(buffer, 'application/pdf'),
        { text: EXTRACT_RULES },
      ],
      { json: true, schema: QUESTION_SET_SCHEMA, temperature: 0.2, maxTokens: 32768, tier: 'parsing' },
    );

    const questions = parsedData.questions || parsedData;
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions could be found in that PDF');
    }

    return questions.map(normalizeQuestion);
  } catch (error) {
    console.error('Error extracting questions from PDF:', error.message);
    throw new Error(`Failed to extract questions: ${error.message}`);
  }
};

function normalizeQuestion(q, index) {
  return {
    questionNumber: q.questionNumber || index + 1,
    questionText: q.questionText || '',
    questionType: 'single-choice',
    options: validateOptions(q.options),
    correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : [],
    marks: q.marks || 1,
    negativeMarks: q.negativeMarks || 0,
    difficultyLevel: q.difficultyLevel || 'medium',
    category: q.category || 'General',
  };
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
 * Re-run extraction with reviewer corrections applied.
 * @param {Buffer|string} pdfInput in-memory buffer, or a path for older callers
 */
exports.reExtractWithFeedback = async (pdfInput, feedback) => {
  try {
    const buffer = Buffer.isBuffer(pdfInput) ? pdfInput : await fs.readFile(pdfInput);

    const parsedData = await aiProvider.generateVision(
      [
        aiProvider.filePart(buffer, 'application/pdf'),
        {
          text: `${EXTRACT_RULES}\n\nApply these reviewer corrections to your extraction:\n${JSON.stringify(feedback)}`,
        },
      ],
      { json: true, schema: QUESTION_SET_SCHEMA, temperature: 0.2, maxTokens: 32768, tier: 'parsing' },
    );

    const questions = parsedData.questions || parsedData;
    if (!Array.isArray(questions)) throw new Error('Re-extraction returned no questions');

    return questions.map(normalizeQuestion);
  } catch (error) {
    console.error('Error in re-extraction:', error.message);
    throw error;
  }
};

module.exports = exports;
