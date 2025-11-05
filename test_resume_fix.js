const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the resume analysis fix
async function testResumeAnalysis() {
  try {
    console.log('Testing resume analysis API...');

    // Create a simple test resume file
    const testResumeContent = `
JOHN DOE
Software Developer

EXPERIENCE:
- 3 years of experience in JavaScript and React
- Built web applications using Node.js
- Experience with databases and APIs

SKILLS:
- JavaScript, React, Node.js
- HTML, CSS, Python
- Git, MongoDB

EDUCATION:
- Bachelor's in Computer Science
`;

    const testResumePath = path.join(__dirname, 'test_resume.txt');
    fs.writeFileSync(testResumePath, testResumeContent);

    const form = new FormData();
    form.append('resume', fs.createReadStream(testResumePath));
    form.append('jobDescription', 'Looking for a React developer with experience in JavaScript, Node.js, and database management. Must have 2+ years experience.');

    // Test the API endpoint
    const response = await axios.post('http://localhost:3001/api/resume-analysis/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer your-test-token' // You'll need a valid token
      },
      timeout: 60000
    });

    console.log('✅ Resume analysis successful!');
    console.log('ATS Score:', response.data.data.atsScore);
    console.log('Missing Keywords:', response.data.data.missingKeywords);
    console.log('Suggestions count:', response.data.data.suggestions.length);

    // Clean up
    fs.unlinkSync(testResumePath);

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);

    // Clean up on error
    const testResumePath = path.join(__dirname, 'test_resume.txt');
    if (fs.existsSync(testResumePath)) {
      fs.unlinkSync(testResumePath);
    }
  }
}

// Run the test
testResumeAnalysis();