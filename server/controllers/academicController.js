const prisma = require('../lib/prisma');
const { extractMarksheet } = require('../services/academicExtractionService');
const { calculateCompletion } = require('./studentProfileController');

// Recompute cumulative CGPA across all stored semesters.
// Weighted by credits: Σ(credit×points)/Σ(credit). Falls back to a plain
// average of SGPAs when credit data is missing.
function computeCgpa(semesters) {
  let creditPointsSum = 0;
  let creditSum = 0;

  for (const sem of semesters) {
    const subjects = Array.isArray(sem.subjects) ? sem.subjects : [];
    for (const s of subjects) {
      const credit = Number(s.credit);
      const points = Number(s.points);
      if (Number.isFinite(credit) && Number.isFinite(points)) {
        creditPointsSum += credit * points;
        creditSum += credit;
      }
    }
  }

  if (creditSum > 0) {
    return Math.round((creditPointsSum / creditSum) * 100) / 100;
  }

  // Fallback: average of available SGPAs.
  const sgpas = semesters
    .map((s) => Number(s.sgpa))
    .filter((n) => Number.isFinite(n));
  if (sgpas.length === 0) return null;
  const avg = sgpas.reduce((a, b) => a + b, 0) / sgpas.length;
  return Math.round(avg * 100) / 100;
}

// POST /student-profile/extract-result
// Upload a marksheet (PDF/image) -> AI extracts structured JSON. Does NOT save.
// Optional form field `kind`: 'semester' (default) | 'board' (Class X / XII).
exports.extractResult = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document uploaded.' });
    }

    const kind = req.body?.kind === 'board' ? 'board' : 'semester';
    const { data, method } = await extractMarksheet(req.file.buffer, req.file.mimetype, kind);

    if (!data || !Array.isArray(data.subjects) || data.subjects.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Could not read subjects from this document. Please try a clearer scan or a different file.',
      });
    }

    res.status(200).json({ success: true, data, method });
  } catch (error) {
    console.error('Extract result error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract marksheet.',
    });
  }
};

// POST /student-profile/profile/semester
// Body: { semester: {...}, header?: { universityRoll, universityRegistration, course, stream } }
// Upserts the semester (by semesterNumber) into semesterMarks.semesters, recomputes CGPA
// and completion, and applies any provided scalar header fields.
exports.saveSemester = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { semester, header = {} } = req.body;

    if (!semester || semester.semesterNumber == null) {
      return res.status(400).json({
        success: false,
        message: 'A semester with a semesterNumber is required.',
      });
    }

    // Auto-create the profile row if the student hasn't saved one yet, so saving a
    // semester never fails just because the profile was never opened.
    const profile = await prisma.studentProfile.findUnique({ where: { studentId } });

    const current = (profile?.semesterMarks && typeof profile.semesterMarks === 'object')
      ? profile.semesterMarks
      : {};
    const semesters = Array.isArray(current.semesters) ? [...current.semesters] : [];

    const semNo = Number(semester.semesterNumber);
    const idx = semesters.findIndex((s) => Number(s.semesterNumber) === semNo);
    if (idx >= 0) {
      semesters[idx] = { ...semester, semesterNumber: semNo };
    } else {
      semesters.push({ ...semester, semesterNumber: semNo });
    }
    semesters.sort((a, b) => Number(a.semesterNumber) - Number(b.semesterNumber));

    const cgpa = computeCgpa(semesters);
    const semesterMarks = { ...current, semesters, cgpa };

    // Only apply header fields that are non-empty; never overwrite with blanks.
    const allowedHeader = ['universityRoll', 'universityRegistration', 'course', 'stream'];
    const headerData = {};
    for (const key of allowedHeader) {
      if (header[key] != null && String(header[key]).trim() !== '') {
        headerData[key] = String(header[key]).trim();
      }
    }

    const merged = { ...(profile || {}), ...headerData, semesterMarks };
    const completionPercentage = calculateCompletion(merged);

    const updated = await prisma.studentProfile.upsert({
      where: { studentId },
      create: { studentId, ...headerData, semesterMarks, completionPercentage },
      update: { ...headerData, semesterMarks, completionPercentage },
    });

    res.status(200).json({
      success: true,
      message: 'Semester result saved successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Save semester error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save semester result.',
    });
  }
};

// DELETE /student-profile/profile/semester/:semesterNumber
exports.deleteSemester = async (req, res) => {
  try {
    const studentId = req.user.id;
    const semNo = Number(req.params.semesterNumber);

    const profile = await prisma.studentProfile.findUnique({ where: { studentId } });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const current = (profile.semesterMarks && typeof profile.semesterMarks === 'object')
      ? profile.semesterMarks
      : {};
    const semesters = (Array.isArray(current.semesters) ? current.semesters : [])
      .filter((s) => Number(s.semesterNumber) !== semNo);

    const cgpa = computeCgpa(semesters);
    const semesterMarks = { ...current, semesters, cgpa };

    const merged = { ...profile, semesterMarks };
    const completionPercentage = calculateCompletion(merged);

    const updated = await prisma.studentProfile.update({
      where: { studentId },
      data: { semesterMarks, completionPercentage },
    });

    res.status(200).json({
      success: true,
      message: 'Semester removed successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('Delete semester error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete semester.',
    });
  }
};
