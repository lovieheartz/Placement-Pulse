// Department/Branch mappings based on courses (same as Signup form)
export const courseOptions = {
  'BTech': ['CSE', 'CSE(AIML)', 'CSE-DS', 'CSE-IOT', 'BME', 'IT', 'CSBS', 'CE', 'EE', 'ME', 'ECE'],
  'MTech': ['CSE', 'CI', 'ECE&PS'],
  'Diploma': ['EE', 'EEEVT', 'CE', 'CSE'],
  'BCA': ['BCA'],
  'MCA': ['MCA'],
  'BBA': ['BBA'],
  'MBA': ['MBA']
};

// Branch to Department full name mapping
export const branchToDepartment = {
  'CSE': 'Computer Science and Engineering (CSE)',
  'CSE(AIML)': 'Computer Science - Artificial Intelligence and Machine Learning (CSE-AIML)',
  'CSE-DS': 'Computer Science - Data Science (CSE-DS)',
  'CSE-IOT': 'Computer Science - Internet of Things (CSE-IOT)',
  'IT': 'Information Technology (IT)',
  'CSBS': 'Computer Science and Business Systems (CSBS)',
  'BME': 'Biomedical Engineering (BME)',
  'ECE': 'Electronics and Communication Engineering (ECE)',
  'EE': 'Electrical Engineering (EE)',
  'ME': 'Mechanical Engineering (ME)',
  'CE': 'Civil Engineering (CE)',
  'CI': 'Construction and Infrastructure (CI)',
  'ECE&PS': 'Electronics, Communication and Power Systems (ECE&PS)',
  'EEEVT': 'Electrical Engineering - Electric Vehicle Technology (EEEVT)',
  'BCA': 'Bachelor of Computer Applications (BCA)',
  'MCA': 'Master of Computer Applications (MCA)',
  'BBA': 'Bachelor of Business Administration (BBA)',
  'MBA': 'Master of Business Administration (MBA)'
};

// Course to Department mapping - EXACTLY like Signup form (uses branch codes, not full names)
// For HOD/Faculty forms, "department" field stores the branch code (CSE, EE, etc.)
export const courseToDepartments = courseOptions;

// All unique departments (for backward compatibility)
export const allDepartments = [
  'Computer Science and Engineering (CSE)',
  'Computer Science - Artificial Intelligence and Machine Learning (CSE-AIML)',
  'Computer Science - Data Science (CSE-DS)',
  'Computer Science - Internet of Things (CSE-IOT)',
  'Information Technology (IT)',
  'Computer Science and Business Systems (CSBS)',
  'Biomedical Engineering (BME)',
  'Electronics and Communication Engineering (ECE)',
  'Electrical Engineering (EE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Construction and Infrastructure (CI)',
  'Electronics, Communication and Power Systems (ECE&PS)',
  'Electrical Engineering - Electric Vehicle Technology (EEEVT)',
  'Bachelor of Computer Applications (BCA)',
  'Master of Computer Applications (MCA)',
  'Bachelor of Business Administration (BBA)',
  'Master of Business Administration (MBA)',
  'Other'
];
