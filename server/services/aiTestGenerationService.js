const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Initialize AI providers
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Call AI provider with fallback support
 * @param {string} prompt - The prompt to send
 * @param {string} preferredProvider - 'gemini' or 'openai'
 * @returns {Promise<string>} - AI response text
 */
async function callAI(prompt, preferredProvider = 'gemini') {
  let providers = [];

  // Set provider order based on preference and availability
  if (preferredProvider === 'gemini' && genAI) {
    providers = ['gemini', 'openai'];
  } else if (preferredProvider === 'openai' && openai) {
    providers = ['openai', 'gemini'];
  } else {
    // Use whatever is available
    if (genAI) providers.push('gemini');
    if (openai) providers.push('openai');
  }

  if (providers.length === 0) {
    throw new Error('No AI provider configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in environment variables.');
  }

  let lastError = null;

  // Try each provider in order
  for (const provider of providers) {
    try {
      console.log(`Attempting to generate with ${provider.toUpperCase()}...`);

      if (provider === 'gemini') {
        return await callGemini(prompt);
      } else if (provider === 'openai') {
        return await callOpenAI(prompt);
      }
    } catch (error) {
      console.error(`${provider.toUpperCase()} failed:`, error.message);
      lastError = error;
      // Continue to next provider
    }
  }

  // If all providers failed
  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Call Gemini AI
 */
async function callGemini(prompt) {
  if (!genAI) {
    throw new Error('Gemini AI not configured');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    }
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Call OpenAI
 */
async function callOpenAI(prompt) {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert aptitude test creator. Generate high-quality multiple-choice questions in valid JSON format only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' }
  });

  return completion.choices[0].message.content;
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
  aiProvider = 'gemini'
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

    const responseText = await callAI(prompt, aiProvider);

    // Clean up response
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedText.substring(0, 500));
      throw new Error('AI returned invalid JSON format');
    }

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
  aiProvider = 'gemini'
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

    const responseText = await callAI(prompt, aiProvider);
    let cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsedData = JSON.parse(cleanedText);
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
