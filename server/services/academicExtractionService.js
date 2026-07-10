// Extracts structured semester-result data from an uploaded grade card.
// - Text PDFs   -> pdf-parse text  -> aiService (Gemini/OpenRouter) JSON extraction
// - Images/scans -> Gemini vision (multimodal) JSON extraction
//
// Returns a plain object matching the schema documented in EXTRACT_INSTRUCTIONS.
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const aiService = require('./aiService');

const EXTRACT_INSTRUCTIONS = `You are an accurate academic transcript parser. Extract the semester grade card
into STRICT, MINIFIED JSON. Return ONLY the JSON object, no markdown, no commentary.

Schema:
{
  "studentName": string,
  "rollNumber": string,
  "registrationNumber": string,
  "program": string,          // e.g. "Bachelor of Technology in Artificial Intelligence and Machine Learning"
  "college": string,
  "university": string,
  "semesterNumber": number,   // integer 1-8, infer from text like "7th Semester" / "Fourth Year First Semester"
  "semesterName": string,     // human label as printed, e.g. "Fourth Year First Semester (Odd 7th) 2025-26"
  "subjects": [
    {
      "code": string,         // subject code, e.g. "PECAIML701B"
      "name": string,         // subject title, e.g. "Computer Vision"
      "grade": string,        // letter grade, e.g. "A", "E", "O"
      "points": number,       // grade points (per subject), e.g. 8
      "credit": number,       // credit for the subject, e.g. 3.0
      "creditPoints": number  // credit x points, e.g. 24
    }
  ],
  "totalCredits": number,     // total credits for the semester
  "sgpa": number,             // SGPA for THIS semester (a number like 8.71)
  "result": string            // e.g. "P" (Pass) / "F"
}

Rules:
- Output numbers as JSON numbers, never strings.
- Omit any field you cannot find rather than guessing; never invent subjects or marks.
- "sgpa" is the semester GPA (SGPA), NOT the cumulative CGPA. If only a "Total" credit row exists, use it for totalCredits.
- Keep subject rows in the order printed. Exclude the "Total" summary row from the subjects array.`;

const BOARD_INSTRUCTIONS = `You are an accurate school marksheet parser. Extract this board examination
marksheet (Class 10 / Class X, or Class 12 / Class XII) into STRICT, MINIFIED JSON.
Return ONLY the JSON object, no markdown, no commentary.

Schema:
{
  "examName": string,          // e.g. "Secondary Examination", "Higher Secondary", "CBSE Class X", "ISC"
  "boardName": string,         // e.g. "CBSE", "ICSE", "WBBSE", "WBCHSE"
  "schoolName": string,        // institution/school name if present
  "rollNumber": string,        // board roll / registration number if present
  "yearOfPassing": number,     // 4-digit year, e.g. 2020
  "standardPercentage": number,// overall percentage/aggregate, a number like 92.4 (omit if only CGPA given)
  "subjects": [
    {
      "name": string,          // subject name, e.g. "Mathematics"
      "marksScored": number,   // marks obtained, e.g. 95
      "totalMarks": number     // maximum marks, e.g. 100
    }
  ]
}

Rules:
- Output numbers as JSON numbers, never strings.
- Omit any field you cannot find rather than guessing; never invent subjects or marks.
- Include every subject row; exclude "Total"/"Grand Total"/"Aggregate" summary rows from the subjects array.
- If the sheet shows a CGPA/grade instead of percentage, put the aggregate you can read into standardPercentage only if it is clearly a percentage, otherwise omit it.`;

const INSTRUCTIONS = { semester: EXTRACT_INSTRUCTIONS, board: BOARD_INSTRUCTIONS };

function getVisionModel() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Gemini vision is not configured (missing GEMINI_API_KEY) — cannot read image/scanned grade cards.');
  }
  const genAI = new GoogleGenerativeAI(geminiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
  });
}

// Parse a marksheet supplied as an image (or scanned PDF page) using Gemini vision.
async function extractFromImage(buffer, mimeType, instructions) {
  const model = getVisionModel();
  const result = await model.generateContent([
    { inlineData: { data: buffer.toString('base64'), mimeType } },
    instructions
  ]);
  const text = result.response.text();
  return aiService.parseResponse(text, 'json');
}

// Parse a text-based PDF: pull text then let the text LLM extract the JSON.
async function extractFromText(text, instructions) {
  const prompt = `${instructions}\n\nMARKSHEET TEXT:\n"""\n${text}\n"""`;
  return aiService.generate(prompt, {
    responseFormat: 'json',
    temperature: 0.1,
    maxTokens: 4096
  });
}

/**
 * Extract structured data from an uploaded marksheet buffer.
 * @param {Buffer} buffer
 * @param {string} mimeType  e.g. "application/pdf", "image/png", "image/jpeg"
 * @param {'semester'|'board'} kind  which marksheet schema to use (default 'semester')
 * @returns {Promise<{ data: object, method: 'pdf-text'|'vision' }>}
 */
async function extractMarksheet(buffer, mimeType, kind = 'semester') {
  const instructions = INSTRUCTIONS[kind] || EXTRACT_INSTRUCTIONS;
  const isPdf = mimeType === 'application/pdf';

  if (isPdf) {
    let extractedText = '';
    try {
      const parsed = await pdfParse(buffer);
      extractedText = (parsed.text || '').trim();
    } catch (err) {
      console.warn('pdf-parse failed, falling back to vision:', err.message);
    }

    // A real text PDF yields meaningful content; scanned PDFs come back nearly empty.
    if (extractedText.length >= 40) {
      const data = await extractFromText(extractedText, instructions);
      return { data, method: 'pdf-text' };
    }

    // Scanned PDF with no selectable text -> send the whole PDF to Gemini vision.
    const data = await extractFromImage(buffer, 'application/pdf', instructions);
    return { data, method: 'vision' };
  }

  // Image upload (JPG/PNG photo or screenshot).
  const data = await extractFromImage(buffer, mimeType, instructions);
  return { data, method: 'vision' };
}

// Backward-compatible wrapper.
const extractSemesterResult = (buffer, mimeType) => extractMarksheet(buffer, mimeType, 'semester');

module.exports = { extractMarksheet, extractSemesterResult };
