const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: String,
  marksScored: Number,
  totalMarks: Number
});

const StudentProfileSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  
  // Basic Info
  firstName: String,
  middleName: String,
  lastName: String,
  fullName: String,
  gender: String,
  dateOfBirth: Date,
  bloodGroup: String,
  category: String,
  religion: String,
  nationality: String,
  placeOfDomicile: String,
  
  // Contact Info
  primaryMobile: String,
  alternativeMobile: String,
  guardianMobile: String,
  primaryEmail: String,
  secondaryEmail: String,
  
  // Academic Info
  course: String,
  stream: String,
  universityRoll: String,
  universityRegistration: String,
  yearOfEntry: Number,
  yearOfPassOut: Number,
  mediumOfInstruction: String,
  
  // Class X Details
  classX: {
    examName: String,
    boardName: String,
    schoolName: String,
    mediumOfInstruction: String,
    yearOfPassing: Number,
    standardPercentage: Number,
    actualPercentage: Number,
    totalMarksObtained: Number,
    totalMarksOfExam: Number,
    subjects: [SubjectSchema]
  },
  
  // Class XII Details
  classXII: {
    examName: String,
    boardName: String,
    schoolName: String,
    mediumOfInstruction: String,
    yearOfPassing: Number,
    standardPercentage: Number,
    actualPercentage: Number,
    totalMarksObtained: Number,
    totalMarksOfExam: Number,
    subjects: [SubjectSchema]
  },
  
  // Diploma Details
  diploma: {
    stream: String,
    university: String,
    instituteName: String,
    mediumOfInstruction: String,
    yearOfPassing: Number,
    aggregatePercentage: Number
  },
  
  // Entrance Exam
  entranceExam: {
    name: String,
    overallRank: Number,
    stateRank: Number,
    yearOfExam: Number
  },
  
  // Semester Marks
  semesterMarks: {
    sem1: Number,
    sem2: Number,
    sem3: Number,
    sem4: Number,
    sem5: Number,
    sem6: Number,
    sem7: Number,
    sem8: Number,
    cgpa: Number
  },
  
  // Academic Status
  hasBacklogs: Boolean,
  numberOfBacklogs: Number,
  hasYearGap: Boolean,
  totalYearGap: Number,
  yearGapDuration: String,
  
  // Skills & Experience
  computerLanguages: [String],
  technicalStrength: String,
  projectTitle: String,
  organizationName: String,
  projectDuration: String,
  seminarsAttended: String,
  workExperience: String,
  workOrganization: String,
  
  // Achievements & Certifications
  academicAchievements: String,
  nonAcademicAchievements: String,
  academicCertifications: String,
  nonAcademicCertifications: String,
  
  // Family Details
  father: {
    name: String,
    occupation: String,
    organization: String,
    designation: String
  },
  mother: {
    name: String,
    occupation: String,
    organization: String,
    designation: String
  },
  guardian: {
    name: String,
    occupation: String,
    organization: String,
    designation: String,
    relationship: String
  },
  
  // Address
  permanentAddress: {
    address: String,
    place: String,
    district: String,
    state: String,
    pinCode: String
  },
  presentAddress: {
    address: String,
    place: String,
    district: String,
    state: String,
    pinCode: String
  },
  
  // Placement Status
  finalOffered: String,
  placedIn: String,
  offerLetterStatus: String,
  photoStatus: String,
  updatedStatus: String,
  tcsReference: String,
  codingPlatform: String,
  codingPlatformId: String,
  
  // CV Upload
  cvPath: String,
  
  // Profile Completion
  completionPercentage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate completion percentage
StudentProfileSchema.methods.calculateCompletion = function() {
  const fields = [
    'firstName', 'lastName', 'gender', 'dateOfBirth', 'primaryMobile', 'primaryEmail',
    'course', 'stream', 'universityRoll', 'yearOfEntry', 'yearOfPassOut',
    'classX.examName', 'classX.boardName', 'classX.yearOfPassing', 'classX.standardPercentage',
    'classXII.examName', 'classXII.boardName', 'classXII.yearOfPassing', 'classXII.standardPercentage',
    'father.name', 'mother.name', 'permanentAddress.address', 'presentAddress.address'
  ];
  
  let filledFields = 0;
  fields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    if (value) filledFields++;
  });
  
  this.completionPercentage = Math.round((filledFields / fields.length) * 100);
  return this.completionPercentage;
};

module.exports = mongoose.model('StudentProfile', StudentProfileSchema);