const prisma = require('../lib/prisma');
const storageService = require('../services/storageService');
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

// POST /student-profile/extract-result   (student, multipart 'document')
// AUTO-DETECT: the AI decides whether this is a Class X / Class XII / semester document,
// extracts the matching fields, and we persist the original file so it can be viewed later.
// Does NOT save the record — the student reviews first.
exports.extractResult = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document uploaded.' });
    }

    const { data, method } = await extractMarksheet(req.file.buffer, req.file.mimetype, 'auto');

    const type = data?.documentType;
    const subjects = type === 'semester' ? data?.semesterSubjects : data?.boardSubjects;

    if (!type || type === 'unknown' || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Couldn't read this document. Please upload a clearer scan of a Class X / XII marksheet or a semester grade card.",
      });
    }

    // Keep the original file so the student AND the placement cell can open it later.
    let fileUrl = null;
    let fileName = req.file.originalname;
    try {
      const uploaded = await storageService.uploadMulterFile(req.file, storageService.FOLDERS.MARKSHEET);
      fileUrl = uploaded.publicUrl;
    } catch (e) {
      console.error('Marksheet upload failed (continuing without file):', e.message);
    }

    res.status(200).json({
      success: true,
      documentType: type,
      data,
      fileUrl,
      fileName,
      method,
    });
  } catch (error) {
    console.error('Extract result error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract marksheet.',
    });
  }
};

// ---------------------------------------------------------------------------
// Records lock once saved. A student must be granted permission to edit again.
// The lock lives inside the record JSON, so no schema migration is needed.
// ---------------------------------------------------------------------------

function isLocked(record) {
  return !!record && record.locked === true;
}

// POST /student-profile/academic-record   (student)
// Body: { documentType, record, fileUrl?, fileName? }
// Auto-routes to classX / classXII / semesterMarks and LOCKS the saved record.
exports.saveAcademicRecord = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { documentType, record, fileUrl, fileName, header = {} } = req.body;

    if (!documentType || !record) {
      return res.status(400).json({ success: false, message: 'documentType and record are required.' });
    }

    const profile = await prisma.studentProfile.findUnique({ where: { studentId } });

    const stamp = {
      fileUrl: fileUrl || undefined,
      fileName: fileName || undefined,
      locked: true,                 // read-only until an admin grants edit permission
      editRequest: null,            // clear any previous request
      savedAt: new Date().toISOString(),
    };

    // ---------- Class X / Class XII ----------
    if (documentType === 'classX' || documentType === 'classXII') {
      const existing = profile?.[documentType];
      if (isLocked(existing)) {
        return res.status(403).json({
          success: false,
          code: 'LOCKED',
          message: 'This record is locked. Request edit permission from the placement cell to change it.',
        });
      }

      const merged = { ...profile, [documentType]: { ...record, ...stamp } };
      const completionPercentage = calculateCompletion(merged);

      const updated = await prisma.studentProfile.upsert({
        where: { studentId },
        create: { studentId, [documentType]: { ...record, ...stamp }, completionPercentage },
        update: { [documentType]: { ...record, ...stamp }, completionPercentage },
      });
      return res.status(200).json({ success: true, message: 'Marksheet saved and locked.', data: updated });
    }

    // ---------- Semester ----------
    if (documentType === 'semester') {
      const semNo = Number(record.semesterNumber);
      if (!Number.isFinite(semNo)) {
        return res.status(400).json({ success: false, message: 'A valid semesterNumber is required.' });
      }

      const current = (profile?.semesterMarks && typeof profile.semesterMarks === 'object')
        ? profile.semesterMarks
        : {};
      const semesters = Array.isArray(current.semesters) ? [...current.semesters] : [];
      const idx = semesters.findIndex((s) => Number(s.semesterNumber) === semNo);

      if (idx >= 0 && isLocked(semesters[idx])) {
        return res.status(403).json({
          success: false,
          code: 'LOCKED',
          message: `Semester ${semNo} is locked. Request edit permission from the placement cell to change it.`,
        });
      }

      const entry = { ...record, semesterNumber: semNo, ...stamp };
      if (idx >= 0) semesters[idx] = entry; else semesters.push(entry);
      semesters.sort((a, b) => Number(a.semesterNumber) - Number(b.semesterNumber));

      const cgpa = computeCgpa(semesters);
      const semesterMarks = { ...current, semesters, cgpa };

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
      return res.status(200).json({ success: true, message: `Semester ${semNo} saved and locked.`, data: updated });
    }

    return res.status(400).json({ success: false, message: `Unsupported documentType: ${documentType}` });
  } catch (error) {
    console.error('Save academic record error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to save record.' });
  }
};

// POST /student-profile/academic-record/request-edit   (student)
// Body: { recordType: 'classX'|'classXII'|'semester', semesterNumber?, reason? }
exports.requestEdit = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { recordType, semesterNumber, reason } = req.body;

    const profile = await prisma.studentProfile.findUnique({ where: { studentId } });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const request = {
      status: 'pending',
      reason: reason || '',
      requestedAt: new Date().toISOString(),
    };

    if (recordType === 'classX' || recordType === 'classXII') {
      const rec = profile[recordType];
      if (!rec) return res.status(404).json({ success: false, message: 'No saved record to edit.' });
      const updated = await prisma.studentProfile.update({
        where: { studentId },
        data: { [recordType]: { ...rec, editRequest: request } },
      });
      return res.status(200).json({ success: true, message: 'Edit permission requested.', data: updated });
    }

    if (recordType === 'semester') {
      const current = profile.semesterMarks || {};
      const semesters = Array.isArray(current.semesters) ? [...current.semesters] : [];
      const idx = semesters.findIndex((s) => Number(s.semesterNumber) === Number(semesterNumber));
      if (idx < 0) return res.status(404).json({ success: false, message: 'Semester not found.' });

      semesters[idx] = { ...semesters[idx], editRequest: request };
      const updated = await prisma.studentProfile.update({
        where: { studentId },
        data: { semesterMarks: { ...current, semesters } },
      });
      return res.status(200).json({ success: true, message: 'Edit permission requested.', data: updated });
    }

    return res.status(400).json({ success: false, message: 'Invalid recordType.' });
  } catch (error) {
    console.error('Request edit error:', error);
    res.status(500).json({ success: false, message: 'Failed to request edit permission.' });
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

// ---------------------------------------------------------------------------
// ADMIN / STAFF: edit-permission queue
// ---------------------------------------------------------------------------

// Collect every pending edit request across all student profiles.
function collectRequests(profile, student) {
  const out = [];
  const base = { studentId: profile.studentId, studentName: student?.name, studentEmail: student?.email };

  for (const t of ['classX', 'classXII']) {
    const rec = profile[t];
    if (rec?.editRequest?.status === 'pending') {
      out.push({
        ...base,
        recordType: t,
        label: t === 'classX' ? 'Class X (10th)' : 'Class XII (12th)',
        reason: rec.editRequest.reason,
        requestedAt: rec.editRequest.requestedAt,
        fileUrl: rec.fileUrl || null,
      });
    }
  }

  const semesters = profile.semesterMarks?.semesters || [];
  for (const s of semesters) {
    if (s?.editRequest?.status === 'pending') {
      out.push({
        ...base,
        recordType: 'semester',
        semesterNumber: s.semesterNumber,
        label: s.semesterName || `Semester ${s.semesterNumber}`,
        reason: s.editRequest.reason,
        requestedAt: s.editRequest.requestedAt,
        fileUrl: s.fileUrl || null,
      });
    }
  }
  return out;
}

// GET /student-profile/edit-requests   (admin/hod/faculty)
exports.listEditRequests = async (req, res) => {
  try {
    const profiles = await prisma.studentProfile.findMany();
    const ids = profiles.map((p) => p.studentId);
    const students = ids.length
      ? await prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
      : [];
    const sMap = new Map(students.map((s) => [s.id, s]));

    const requests = profiles.flatMap((p) => collectRequests(p, sMap.get(p.studentId)));
    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error('List edit requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to load edit requests.' });
  }
};

// POST /student-profile/edit-requests/resolve   (admin/hod/faculty)
// Body: { studentId, recordType, semesterNumber?, approve: boolean }
// Approving UNLOCKS the record so the student can edit it once; it re-locks on save.
exports.resolveEditRequest = async (req, res) => {
  try {
    const { studentId, recordType, semesterNumber, approve } = req.body;
    const profile = await prisma.studentProfile.findUnique({ where: { studentId } });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const decision = {
      status: approve ? 'approved' : 'denied',
      resolvedAt: new Date().toISOString(),
      resolvedBy: req.user.id,
    };

    if (recordType === 'classX' || recordType === 'classXII') {
      const rec = profile[recordType];
      if (!rec) return res.status(404).json({ success: false, message: 'Record not found.' });
      const next = {
        ...rec,
        locked: approve ? false : true,                       // unlock only on approval
        editRequest: { ...(rec.editRequest || {}), ...decision },
      };
      const updated = await prisma.studentProfile.update({
        where: { studentId },
        data: { [recordType]: next },
      });
      return res.status(200).json({
        success: true,
        message: approve ? 'Edit permission granted.' : 'Edit request denied.',
        data: updated,
      });
    }

    if (recordType === 'semester') {
      const current = profile.semesterMarks || {};
      const semesters = Array.isArray(current.semesters) ? [...current.semesters] : [];
      const idx = semesters.findIndex((s) => Number(s.semesterNumber) === Number(semesterNumber));
      if (idx < 0) return res.status(404).json({ success: false, message: 'Semester not found.' });

      semesters[idx] = {
        ...semesters[idx],
        locked: approve ? false : true,
        editRequest: { ...(semesters[idx].editRequest || {}), ...decision },
      };
      const updated = await prisma.studentProfile.update({
        where: { studentId },
        data: { semesterMarks: { ...current, semesters } },
      });
      return res.status(200).json({
        success: true,
        message: approve ? 'Edit permission granted.' : 'Edit request denied.',
        data: updated,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid recordType.' });
  } catch (error) {
    console.error('Resolve edit request error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve edit request.' });
  }
};
