const prisma = require("../lib/prisma");

// Calculate profile completion percentage from a plain profile object.
// Ported from the former StudentProfile.calculateCompletion() Mongoose method.
function calculateCompletion(profile) {
  const fields = [
    'firstName', 'lastName', 'gender', 'dateOfBirth', 'primaryMobile', 'primaryEmail',
    'course', 'stream', 'universityRoll', 'yearOfEntry', 'yearOfPassOut',
    'classX.examName', 'classX.boardName', 'classX.yearOfPassing', 'classX.standardPercentage',
    'classXII.examName', 'classXII.boardName', 'classXII.yearOfPassing', 'classXII.standardPercentage',
    'father.name', 'mother.name', 'permanentAddress.address', 'presentAddress.address'
  ];

  let filledFields = 0;
  fields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), profile);
    if (value) filledFields++;
  });

  return Math.round((filledFields / fields.length) * 100);
}

// Get student profile
exports.getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    let profile = await prisma.studentProfile.findUnique({ where: { studentId } });

    if (!profile) {
      // Create new profile if doesn't exist
      const student = await prisma.student.findUnique({ where: { id: studentId } });

      const baseData = {
        studentId,
        fullName: student?.name,
        primaryEmail: student?.email,
        course: student?.course,
        stream: student?.branch,
        yearOfPassOut: student?.passoutYear != null ? String(student.passoutYear) : undefined,
      };

      profile = await prisma.studentProfile.create({
        data: {
          ...baseData,
          completionPercentage: calculateCompletion(baseData),
        },
      });
    } else {
      const completionPercentage = calculateCompletion(profile);
      profile = await prisma.studentProfile.update({
        where: { studentId },
        data: { completionPercentage },
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// Update student profile
exports.updateStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const updateData = { ...req.body };

    // studentId is the immutable key; never let the body overwrite it.
    delete updateData.studentId;

    const existing = await prisma.studentProfile.findUnique({ where: { studentId } });

    const merged = { ...(existing || {}), ...updateData };
    const completionPercentage = calculateCompletion(merged);

    const profile = await prisma.studentProfile.upsert({
      where: { studentId },
      create: { studentId, ...updateData, completionPercentage },
      update: { ...updateData, completionPercentage },
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Add subject to class X or XII
exports.addSubject = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classType, subject } = req.body; // classType: 'classX' or 'classXII'

    const profile = await prisma.studentProfile.findUnique({ where: { studentId } });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const classGroup = profile[classType] || { subjects: [] };
    if (!Array.isArray(classGroup.subjects)) {
      classGroup.subjects = [];
    }
    classGroup.subjects.push(subject);

    const merged = { ...profile, [classType]: classGroup };
    const completionPercentage = calculateCompletion(merged);

    const updated = await prisma.studentProfile.update({
      where: { studentId },
      data: { [classType]: classGroup, completionPercentage },
    });

    res.status(200).json({
      success: true,
      message: 'Subject added successfully',
      data: updated
    });
  } catch (error) {
    console.error('Add subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add subject',
      error: error.message
    });
  }
};

// Remove subject
exports.removeSubject = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { classType, subjectId } = req.params;

    const profile = await prisma.studentProfile.findUnique({ where: { studentId } });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const classGroup = profile[classType] || { subjects: [] };
    const subjects = Array.isArray(classGroup.subjects) ? classGroup.subjects : [];
    classGroup.subjects = subjects.filter(
      (s) => s && s.id !== subjectId
    );

    const merged = { ...profile, [classType]: classGroup };
    const completionPercentage = calculateCompletion(merged);

    const updated = await prisma.studentProfile.update({
      where: { studentId },
      data: { [classType]: classGroup, completionPercentage },
    });

    res.status(200).json({
      success: true,
      message: 'Subject removed successfully',
      data: updated
    });
  } catch (error) {
    console.error('Remove subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove subject',
      error: error.message
    });
  }
};
