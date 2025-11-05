// Simple test for the resume analysis
const axios = require('axios');

async function testAIService() {
    try {
        console.log('Testing AI Service...');
        
        // Test health check
        const healthResponse = await axios.get('http://localhost:5000/health');
        console.log('Health check:', healthResponse.data);
        
        // Test analysis
        const analysisResponse = await axios.post('http://localhost:5000/analyze', {
            resume_text: `John Doe
Software Engineer

Experience:
- 3 years of Python development
- Worked with Django and Flask frameworks
- Database design and optimization
- API development and integration

Skills:
- Python, JavaScript, SQL
- Git, Docker, Linux
- Problem solving and teamwork`,
            job_description: `We are looking for a Senior Python Developer with:
- 5+ years Python experience
- Django/Flask expertise
- PostgreSQL database skills
- AWS cloud experience
- Machine learning knowledge
- API development experience`
        });
        
        console.log('Analysis result:', JSON.stringify(analysisResponse.data, null, 2));
        
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testAIService();
