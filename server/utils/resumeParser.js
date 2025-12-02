const pdfParse = require('pdf-parse');

/**
 * Parse resume PDF and extract relevant information
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Object} - Parsed resume data
 */
async function parseResume(pdfBuffer) {
  try {
    // Parse PDF
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    // Extract information using pattern matching
    const resumeData = {
      fullText: text,
      projects: extractProjects(text),
      skills: extractSkills(text),
      experience: extractExperience(text),
      education: extractEducation(text)
    };

    return resumeData;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw new Error('Failed to parse resume PDF');
  }
}

/**
 * Extract project information from resume text
 */
function extractProjects(text) {
  const projects = [];

  // Look for project section
  const projectSection = text.match(/projects?\s*[:：\n]([\s\S]*?)(?=\n\s*(?:experience|education|skills|certifications?|awards?|$))/i);

  if (projectSection && projectSection[1]) {
    const projectText = projectSection[1];

    // Split by bullet points or project names
    const projectMatches = projectText.split(/\n\s*[•●■\-\*]/).filter(p => p.trim().length > 20);

    projectMatches.forEach(proj => {
      const cleaned = proj.trim().substring(0, 500); // Limit length
      if (cleaned) projects.push(cleaned);
    });
  }

  // If no projects found, look for any section mentioning "project"
  if (projects.length === 0) {
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes('project') && line.length > 20 && line.length < 200) {
        const context = lines.slice(Math.max(0, idx), Math.min(lines.length, idx + 3)).join(' ').trim();
        if (context.length > 30) {
          projects.push(context.substring(0, 500));
        }
      }
    });
  }

  return projects.slice(0, 5); // Limit to 5 projects
}

/**
 * Extract skills from resume text
 */
function extractSkills(text) {
  const skills = [];

  // Look for skills section
  const skillSection = text.match(/skills?\s*[:：\n]([\s\S]*?)(?=\n\s*(?:experience|education|projects?|certifications?|$))/i);

  if (skillSection && skillSection[1]) {
    const skillText = skillSection[1];

    // Common programming languages and technologies
    const techKeywords = [
      'JavaScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'Go', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node\\.js', 'Express', 'Django', 'Flask', 'Spring',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'AWS', 'Azure', 'GCP', 'Docker',
      'Kubernetes', 'Git', 'REST API', 'GraphQL', 'TypeScript', 'HTML', 'CSS',
      'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'AI', 'NLP',
      'SQL', 'NoSQL', 'Linux', 'Agile', 'Scrum', 'CI/CD', 'Jenkins', 'Terraform'
    ];

    techKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(skillText)) {
        skills.push(keyword.replace(/\\\./g, '.').replace(/\\\+/g, '+'));
      }
    });
  }

  // Also scan entire document for skills
  const fullTextSkills = [];
  const commonSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Docker', 'Git'];
  commonSkills.forEach(skill => {
    if (new RegExp(`\\b${skill.replace(/\./g, '\\.')}\\b`, 'i').test(text)) {
      if (!skills.includes(skill)) {
        fullTextSkills.push(skill);
      }
    }
  });

  return [...new Set([...skills, ...fullTextSkills])].slice(0, 20); // Limit to 20 unique skills
}

/**
 * Extract work experience from resume text
 */
function extractExperience(text) {
  const expSection = text.match(/(?:work\s*)?experience\s*[:：\n]([\s\S]*?)(?=\n\s*(?:education|projects?|skills?|certifications?|$))/i);

  if (expSection && expSection[1]) {
    return expSection[1].trim().substring(0, 1000); // Limit length
  }

  return '';
}

/**
 * Extract education from resume text
 */
function extractEducation(text) {
  const eduSection = text.match(/education\s*[:：\n]([\s\S]*?)(?=\n\s*(?:experience|projects?|skills?|certifications?|$))/i);

  if (eduSection && eduSection[1]) {
    return eduSection[1].trim().substring(0, 500); // Limit length
  }

  return '';
}

module.exports = { parseResume };
