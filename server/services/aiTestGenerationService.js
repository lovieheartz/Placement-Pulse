const aiProvider = require('./aiProvider');
const { Type } = aiProvider;

const SYSTEM_PROMPT =
  'You are an expert aptitude test creator. Generate high-quality multiple-choice questions.';

// Passed to Gemini as a responseSchema, which constrains the output grammar —
// the model physically cannot return a half-written question or a 3-option MCQ.
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
          correctAnswer: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Label(s) of the correct option, e.g. ["B"]',
          },
          explanation: { type: Type.STRING },
          marks: { type: Type.INTEGER },
          difficultyLevel: { type: Type.STRING },
          category: { type: Type.STRING },
          topic: { type: Type.STRING },
        },
        required: ['questionText', 'options', 'correctAnswer', 'explanation', 'category', 'topic'],
      },
    },
  },
  required: ['questions'],
};

async function callAIForJSON(prompt) {
  return aiProvider.generateJSON(prompt, {
    system: SYSTEM_PROMPT,
    schema: QUESTION_SET_SCHEMA,
    temperature: 0.7,
    // Question sets are long; the budget is shared with the model's thinking.
    maxTokens: 32768,
  });
}

/**
 * Generate aptitude test questions based on company/pattern
 * @param {Object} params - Generation parameters
 * @returns {Promise<Array>} - Array of generated questions
 */
exports.generateTestFromCompany = async ({
  companyName,
  numberOfQuestions,
  difficulty = 'medium',
  topics = [],
  questionTypes = ['aptitude', 'logical', 'verbal'],
}) => {
  try {
    const topicsText = topics.length > 0 ? topics.join(', ') : 'General Aptitude, Logical Reasoning, Verbal Ability';
    const typesText = questionTypes.join(', ');

    const prompt = `
Generate ${numberOfQuestions} multiple-choice questions for a placement test similar to ${companyName} recruitment pattern.

REQUIREMENTS:
- Create exactly ${numberOfQuestions} questions
- Difficulty level: ${difficulty}
- Topics to cover: ${topicsText}
- Question types: ${typesText}
- Each question MUST have exactly 4 options (A, B, C, D)
- Mark the correct answer
- Make questions realistic and similar to actual ${companyName} placement tests
- Include a mix of: quantitative aptitude, logical reasoning, verbal ability, technical concepts
- Questions should be challenging but fair

OUTPUT FORMAT (STRICT JSON):
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "If a train travels 60 km in 45 minutes, what is its speed in km/h?",
      "options": [
        { "optionLabel": "A", "optionText": "60 km/h" },
        { "optionLabel": "B", "optionText": "80 km/h" },
        { "optionLabel": "C", "optionText": "90 km/h" },
        { "optionLabel": "D", "optionText": "100 km/h" }
      ],
      "correctAnswer": ["B"],
      "explanation": "Speed = Distance/Time = 60/(45/60) = 60/(3/4) = 80 km/h",
      "marks": 1,
      "difficultyLevel": "${difficulty}",
      "category": "Quantitative Aptitude",
      "topic": "Time, Speed & Distance"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no additional text, no markdown code blocks.
`;

    const parsedData = await callAIForJSON(prompt);

    // Extract questions array
    const questions = parsedData.questions || parsedData;

    if (!Array.isArray(questions)) {
      throw new Error('AI response is not an array of questions');
    }

    // Validate and clean questions
    const validatedQuestions = questions.map((q, index) => ({
      questionNumber: q.questionNumber || index + 1,
      questionText: q.questionText || '',
      questionType: 'single-choice',
      options: validateOptions(q.options),
      correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : [],
      explanation: q.explanation || '',
      marks: q.marks || 1,
      negativeMarks: 0,
      difficultyLevel: q.difficultyLevel || difficulty,
      category: q.category || 'General',
      topic: q.topic || 'General'
    }));

    console.log(`Successfully generated ${validatedQuestions.length} questions`);
    return validatedQuestions;

  } catch (error) {
    console.error('Error generating test from AI:', error);
    throw new Error(`Failed to generate test: ${error.message}`);
  }
};

/**
 * Generate questions based on previous year pattern
 * @param {Object} params - Pattern parameters
 * @returns {Promise<Array>} - Array of generated questions
 */
exports.generateFromPreviousYear = async ({
  year,
  companyName,
  numberOfQuestions,
  difficulty = 'medium',
}) => {
  try {
    const prompt = `
Generate ${numberOfQuestions} aptitude test questions based on ${companyName} ${year} placement pattern.

Create questions similar to what ${companyName} asked in ${year} recruitment:
- Quantitative Aptitude (40%)
- Logical Reasoning (30%)
- Verbal Ability (20%)
- Technical Basics (10%)

REQUIREMENTS:
- Exactly ${numberOfQuestions} questions
- Difficulty: ${difficulty}
- Each question with 4 options (A, B, C, D)
- Mark correct answer
- Add explanation for each question

Return ONLY valid JSON with this structure:
{
  "questions": [{
    "questionNumber": 1,
    "questionText": "...",
    "options": [
      {"optionLabel": "A", "optionText": "..."},
      {"optionLabel": "B", "optionText": "..."},
      {"optionLabel": "C", "optionText": "..."},
      {"optionLabel": "D", "optionText": "..."}
    ],
    "correctAnswer": ["A"],
    "explanation": "...",
    "marks": 1,
    "difficultyLevel": "${difficulty}",
    "category": "Quantitative Aptitude",
    "topic": "Number Systems"
  }]
}

No markdown, no extra text, just pure JSON.
`;

    const parsedData = await callAIForJSON(prompt);
    const questions = parsedData.questions || parsedData;

    const validatedQuestions = questions.map((q, i) => ({
      questionNumber: i + 1,
      questionText: q.questionText,
      questionType: 'single-choice',
      options: validateOptions(q.options),
      correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : [],
      explanation: q.explanation || '',
      marks: 1,
      negativeMarks: 0,
      difficultyLevel: q.difficultyLevel || difficulty,
      category: q.category || 'General',
      topic: q.topic || ''
    }));

    console.log(`Successfully generated ${validatedQuestions.length} previous year pattern questions`);
    return validatedQuestions;

  } catch (error) {
    console.error('Error generating previous year test:', error);
    throw new Error(`Failed to generate test: ${error.message}`);
  }
};

/**
 * Validate options structure
 */
function validateOptions(options) {
  if (!Array.isArray(options) || options.length !== 4) {
    return [
      { optionLabel: 'A', optionText: 'Option A' },
      { optionLabel: 'B', optionText: 'Option B' },
      { optionLabel: 'C', optionText: 'Option C' },
      { optionLabel: 'D', optionText: 'Option D' }
    ];
  }

  const labels = ['A', 'B', 'C', 'D'];
  return labels.map((label, index) => {
    const existingOption = options.find(opt => opt.optionLabel === label);
    if (existingOption && existingOption.optionText) {
      return {
        optionLabel: label,
        optionText: existingOption.optionText
      };
    }
    return {
      optionLabel: label,
      optionText: options[index]?.optionText || `Option ${label}`
    };
  });
}

module.exports = exports;
