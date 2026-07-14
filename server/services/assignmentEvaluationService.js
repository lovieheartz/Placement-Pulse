// Evaluates a student's handwritten (or typed) assignment submission with AI.
// - Reads the submission (image or PDF) with Gemini vision (handwriting OCR + grading in one pass).
// - Grades it against the assignment's instructions / questions / total marks.
// Returns { score, maxScore, percentage, feedback, breakdown, extractedText }.
const aiProvider = require('./aiProvider');
const { Type } = aiProvider;

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

// Constrains the model's output grammar, so a grade can never come back with a
// missing score or a half-written breakdown.
const GRADING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: 'Marks awarded' },
    maxScore: { type: Type.NUMBER },
    feedback: { type: Type.STRING, description: '2-4 constructive sentences' },
    breakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          q: { type: Type.STRING },
          awarded: { type: Type.NUMBER },
          max: { type: Type.NUMBER },
          comment: { type: Type.STRING },
        },
        required: ['q', 'awarded', 'max', 'comment'],
      },
    },
    extractedText: { type: Type.STRING, description: "Transcription of the student's answers" },
  },
  required: ['score', 'maxScore', 'feedback', 'breakdown', 'extractedText'],
};

/**
 * Evaluate a submission buffer against an assignment.
 *
 * The file (PDF or image) goes to Gemini as raw bytes — it reads handwriting
 * and PDFs natively, so there is no text-extraction step to fail first.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {object} assignment  { title, description, instructions, questions, totalMarks }
 * @returns {Promise<{score,maxScore,percentage,feedback,breakdown,extractedText,method}>}
 */
async function evaluateSubmission(buffer, mimeType, assignment) {
  const instructions = buildInstructions(assignment);
  const method = 'vision';

  const raw = await aiProvider.generateVision(
    [aiProvider.filePart(buffer, mimeType), { text: instructions }],
    {
      json: true,
      schema: GRADING_SCHEMA,
      temperature: 0.2,
      maxTokens: 16384,
      tier: 'parsing', // reading handwriting and grading it fairly needs the pro model
    },
  );

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
