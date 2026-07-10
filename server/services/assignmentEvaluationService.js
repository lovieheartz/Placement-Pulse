// Evaluates a student's handwritten (or typed) assignment submission with AI.
// - Reads the submission (image or PDF) with Gemini vision (handwriting OCR + grading in one pass).
// - Grades it against the assignment's instructions / questions / total marks.
// Returns { score, maxScore, percentage, feedback, breakdown, extractedText }.
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiService = require('./aiService');

function getVisionModel() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini vision is not configured (missing GEMINI_API_KEY) — cannot read handwritten submissions.');
  }
  const genAI = new GoogleGenerativeAI(geminiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  });
}

// Build the grading instructions from the assignment definition.
function buildInstructions(assignment) {
  const total = assignment.totalMarks != null ? assignment.totalMarks : 100;
  let rubric = '';
  const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
  if (questions.length > 0) {
    rubric = '\nQuestions / rubric (grade each):\n' + questions
      .map((q, i) => `  ${i + 1}. ${q.q || q.question || q.text || ''}` +
        (q.maxMarks != null ? ` [${q.maxMarks} marks]` : '') +
        (q.rubric ? ` — rubric: ${q.rubric}` : ''))
      .join('\n');
  }

  return `You are a fair, rigorous teacher grading a student's assignment submission.
The submission may be HANDWRITTEN — read the handwriting carefully.

ASSIGNMENT: ${assignment.title || 'Assignment'}
${assignment.description ? `Description: ${assignment.description}\n` : ''}${assignment.instructions ? `Instructions to students: ${assignment.instructions}\n` : ''}Total marks: ${total}${rubric}

TASK:
1. Transcribe what the student wrote (their answers).
2. Grade it fairly against the assignment. Award marks out of ${total}.
3. Give concise, constructive feedback and a per-question breakdown when questions are listed.

Return STRICT, MINIFIED JSON only (no markdown, no commentary):
{
  "score": number,            // marks awarded, 0..${total}
  "maxScore": ${total},
  "feedback": string,         // 2-4 sentences, constructive
  "breakdown": [              // one entry per question if questions were listed; else summarise key points
    { "q": string, "awarded": number, "max": number, "comment": string }
  ],
  "extractedText": string     // your transcription of the student's answers
}

Rules:
- Output numbers as JSON numbers. "score" must be between 0 and ${total}.
- If the submission is blank, unreadable, or clearly unrelated to the assignment, give a low score and say so in feedback.
- Never invent answers the student did not write.`;
}

async function evaluateFromImage(buffer, mimeType, instructions) {
  const model = getVisionModel();
  const result = await model.generateContent([
    { inlineData: { data: buffer.toString('base64'), mimeType }, },
    instructions,
  ]);
  return aiService.parseResponse(result.response.text(), 'json');
}

async function evaluateFromText(text, instructions) {
  const prompt = `${instructions}\n\nSTUDENT SUBMISSION (typed text):\n"""\n${text}\n"""`;
  return aiService.generate(prompt, { responseFormat: 'json', temperature: 0.2, maxTokens: 4096 });
}

/**
 * Evaluate a submission buffer against an assignment.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {object} assignment  { title, description, instructions, questions, totalMarks }
 * @returns {Promise<{score,maxScore,percentage,feedback,breakdown,extractedText,method}>}
 */
async function evaluateSubmission(buffer, mimeType, assignment) {
  const instructions = buildInstructions(assignment);
  const isPdf = mimeType === 'application/pdf';
  let raw;
  let method = 'vision';

  if (isPdf) {
    let text = '';
    try {
      const parsed = await pdfParse(buffer);
      text = (parsed.text || '').trim();
    } catch (err) {
      console.warn('pdf-parse failed on submission, using vision:', err.message);
    }
    if (text.length >= 40) {
      raw = await evaluateFromText(text, instructions);
      method = 'pdf-text';
    } else {
      raw = await evaluateFromImage(buffer, 'application/pdf', instructions);
    }
  } else {
    raw = await evaluateFromImage(buffer, mimeType, instructions);
  }

  const maxScore = Number(raw?.maxScore) || Number(assignment.totalMarks) || 100;
  let score = Number(raw?.score);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(score, maxScore));
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

  return {
    score,
    maxScore,
    percentage,
    feedback: raw?.feedback || '',
    breakdown: Array.isArray(raw?.breakdown) ? raw.breakdown : [],
    extractedText: raw?.extractedText || '',
    method,
  };
}

module.exports = { evaluateSubmission };
