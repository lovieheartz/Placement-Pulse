// Extracts structured semester-result data from an uploaded grade card.
// PDFs (text or scanned) and photos all go straight to Gemini, which reads them
// natively — no text-extraction step in front.
//
// Returns a plain object matching the schema documented in EXTRACT_INSTRUCTIONS.
const aiProvider = require('./aiProvider');
const { Type } = aiProvider;

// Subject rows: only "name" is required, so a sheet that prints just a name and
// a grade still yields a usable row instead of being dropped.
const SUBJECT_ITEM = {
  type: Type.OBJECT,
  properties: {
    code: { type: Type.STRING },
    name: { type: Type.STRING },
    grade: { type: Type.STRING },
    points: { type: Type.NUMBER },
    credit: { type: Type.NUMBER },
    creditPoints: { type: Type.NUMBER },
    marksScored: { type: Type.NUMBER },
    totalMarks: { type: Type.NUMBER },
  },
  required: ['name'],
};

// One schema covering every document family we accept. Passing it to Gemini as
// a responseSchema constrains the output grammar — without it, gemini-3.5-flash
// intermittently returns truncated or malformed JSON.
//
// It must declare EVERY key the prompts can produce: a responseSchema is a
// whitelist, so an undeclared key simply cannot be emitted. The live prompt is
// AUTO_INSTRUCTIONS, which splits rows into semesterSubjects / boardSubjects;
// `subjects` is kept for the older semester/board prompts.
//
// Only documentType is required. The prompts tell the model to omit fields it
// cannot read, so marking more as required would force it to invent marks.
const MARKSHEET_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING, enum: ['semester', 'classX', 'classXII', 'unknown'] },

    studentName: { type: Type.STRING },
    rollNumber: { type: Type.STRING },

    // ---- university semester grade card ----
    registrationNumber: { type: Type.STRING },
    program: { type: Type.STRING, description: 'e.g. "B.Tech in Artificial Intelligence and Machine Learning"' },
    college: { type: Type.STRING },
    university: { type: Type.STRING },
    semesterNumber: { type: Type.INTEGER, description: 'Integer 1-8. "First Semester" -> 1, "Odd 7th" -> 7' },
    semesterName: { type: Type.STRING, description: 'The semester label exactly as printed' },
    sgpa: { type: Type.NUMBER, description: 'SGPA for THIS semester — not the cumulative CGPA' },
    totalCredits: { type: Type.NUMBER },
    result: { type: Type.STRING, description: '"P" (pass) or "F" (fail)' },
    // ---- school board marksheet ----
    examName: { type: Type.STRING, description: 'e.g. "Secondary Examination", "Higher Secondary"' },
    boardName: { type: Type.STRING, description: 'e.g. "CBSE", "ICSE", "WBBSE", "WBCHSE"' },
    schoolName: { type: Type.STRING },
    yearOfPassing: { type: Type.INTEGER, description: '4-digit year, e.g. 2020' },
    standardPercentage: { type: Type.NUMBER, description: 'Overall percentage; omit if the sheet prints only grades' },
    cgpa: { type: Type.NUMBER, description: 'Overall CGPA, if given instead of a percentage' },

    // ONE array for every document type, and it is required.
    //
    // This used to be two optional arrays (semesterSubjects / boardSubjects).
    // With both optional the model reliably filled NEITHER — it would read a
    // grade card perfectly and still return just {documentType}, because an
    // almost-empty object satisfied the schema. A single required array gives
    // it nowhere to hide. The caller-facing split back into
    // semesterSubjects/boardSubjects happens in code below, where it is exact.
    subjects: {
      type: Type.ARRAY,
      items: SUBJECT_ITEM,
      description: 'Every subject row printed on the sheet, in order',
    },
  },
  required: ['documentType', 'subjects'],
};

// MARKSHEET_SCHEMA above is the contract — it goes to Gemini as a responseSchema,
// which constrains the output grammar so malformed or truncated JSON is impossible.
//
// This prompt therefore carries RULES ONLY and deliberately does NOT restate the
// shape. It previously embedded a second copy of the schema as pseudo-JSON (with
// "//" comments and "a | b" unions). With a real responseSchema also in play the
// model saw two conflicting contracts and collapsed to a near-empty object: it
// would read a grade card perfectly and still return only {documentType}.
// Field semantics now live in the schema's `description`s, where the model reads them.
const INSTRUCTIONS = `You are an accurate academic-document parser. Read the uploaded marksheet or grade card and extract it.

FIRST, classify the document and put the verdict in "documentType":
  "semester"  = a COLLEGE/UNIVERSITY semester grade card (subject CODES, letter grades, CREDITS,
                credit points, SGPA/CGPA — e.g. issued by a university such as MAKAUT).
  "classX"    = a Class 10 / Class X / Secondary school board marksheet.
  "classXII"  = a Class 12 / Class XII / Higher Secondary / Senior Secondary board marksheet.
  "unknown"   = anything else.
Judge by the document's own content. A sheet showing credits and SGPA issued by a university is
ALWAYS "semester", never "classX".

THEN extract it:
- Put EVERY subject row printed on the sheet into "subjects", in the order printed.
- Exclude "Total" / "Grand Total" / "Aggregate" summary rows from "subjects".

Accuracy rules:
- Omit any FIELD you cannot find rather than guessing. NEVER invent subjects, marks or grades.
- BUT never drop a subject ROW just because some of its columns are missing. If a row shows only
  a name and a grade, emit it with just "name" and "grade". Every subject you can see must appear.
- Many Indian boards print GRADES instead of numeric marks: fill "grade" and omit
  marksScored/totalMarks for that subject rather than fabricating numbers.
- If a max-marks column is missing but marks are clearly out of 100, set totalMarks to 100.`;

/**
 * Extract structured data from an uploaded marksheet buffer.
 *
 * The file goes to Gemini as raw bytes whether it is a text PDF, a scanned PDF
 * or a phone photo. Gemini reads all three natively, which preserves the grade
 * table's layout (a text extractor flattens it into ambiguous prose) and means
 * there is no pdf-parse step to fail first.
 *
 * The model classifies the document itself and fills the matching half of the
 * schema, so callers no longer pass a document kind — read `data.documentType`.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType  e.g. "application/pdf", "image/png", "image/jpeg"
 * @returns {Promise<{ data: object, method: 'vision' }>}
 */
async function extractMarksheet(buffer, mimeType) {
  const data = await aiProvider.generateVision(
    [aiProvider.filePart(buffer, mimeType), { text: INSTRUCTIONS }],
    {
      json: true,
      schema: MARKSHEET_SCHEMA,
      temperature: 0.1,
      maxTokens: 16384,
      tier: 'parsing', // grade cards need the pro model; flash drops subject rows
    },
  );

  // The model returns one "subjects" array; callers expect it split by document
  // type. Doing it here (rather than asking the model for two arrays) is both
  // exact and the only shape the model fills reliably.
  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const isSemester = data.documentType === 'semester';

  data.semesterSubjects = isSemester ? subjects : [];
  data.boardSubjects = isSemester ? [] : subjects;

  return { data, method: 'vision' };
}

// Backward-compatible wrapper.
const extractSemesterResult = (buffer, mimeType) => extractMarksheet(buffer, mimeType);

module.exports = { extractMarksheet, extractSemesterResult };
