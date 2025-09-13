const StudentProfile = require('../models/StudentProfile');
const Student = require('../models/Student');

// Get student profile
exports.getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    let profile = await StudentProfile.findOne({ studentId }).populate('studentId', 'name email course branch');
    
    if (!profile) {
      // Create new profile if doesn't exist
      const student = await Student.findById(studentId);
      profile = new StudentProfile({
        studentId,
        fullName: student.name,
        primaryEmail: student.email,
        course: student.course,
        stream: student.branch,
        yearOfPassOut: student.passoutYear
      });
      profile.calculateCompletion();
      await profile.save();
    } else {
      profile.calculateCompletion();
      await profile.save();
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
    const updateData = req.body;
    
    let profile = await StudentProfile.findOne({ studentId });
    
    if (!profile) {
      profile = new StudentProfile({ studentId, ...updateData });
    } else {
      Object.assign(profile, updateData);
    }
    
    profile.calculateCompletion();
    await profile.save();
    
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
    
    const profile = await StudentProfile.findOne({ studentId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    if (!profile[classType]) {
      profile[classType] = { subjects: [] };
    }
    
    profile[classType].subjects.push(subject);
    profile.calculateCompletion();
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: 'Subject added successfully',
      data: profile
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
    
    const profile = await StudentProfile.findOne({ studentId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    profile[classType].subjects.id(subjectId).remove();
    profile.calculateCompletion();
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: 'Subject removed successfully',
      data: profile
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