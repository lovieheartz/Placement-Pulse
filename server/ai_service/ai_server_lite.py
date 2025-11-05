#!/usr/bin/env python3
"""
Lightweight AI Service for Resume Analysis
Uses scikit-learn and NLTK for intelligent resume analysis without heavy transformers
"""

import os
import json
import re
import logging
from typing import Dict, List, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class LightweightResumeAnalyzer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.setup_nltk()
        logger.info("Lightweight Resume Analyzer initialized")
    
    def setup_nltk(self):
        """Download required NLTK data"""
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('wordnet', quiet=True)
            from nltk.corpus import stopwords
            self.stop_words = set(stopwords.words('english'))
        except Exception as e:
            logger.warning(f"NLTK setup issue: {e}")
            # Basic stop words if NLTK fails
            self.stop_words = {
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
                'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
                'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might',
                'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
                'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
                'hers', 'its', 'our', 'their', 'from', 'up', 'about', 'into', 'over', 'after'
            }
    
    def extract_keywords(self, text: str, top_k: int = 20) -> List[str]:
        """Extract important keywords from text"""
        try:
            # Clean and tokenize text
            cleaned_text = re.sub(r'[^a-zA-Z\s]', ' ', text.lower())
            words = cleaned_text.split()
            
            # Filter out stop words and short words
            keywords = [word for word in words 
                       if len(word) > 3 and word not in self.stop_words]
            
            # Count frequency and return top keywords
            word_freq = Counter(keywords)
            return [word for word, freq in word_freq.most_common(top_k)]
            
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            return []
    
    def extract_technical_skills(self, text: str) -> List[str]:
        """Extract technical skills and technologies"""
        # Common technical skills and technologies
        tech_patterns = [
            # Programming languages
            r'\b(?:python|java|javascript|c\+\+|c#|php|ruby|go|rust|swift|kotlin|scala)\b',
            # Web technologies
            r'\b(?:html|css|react|angular|vue|node|express|django|flask|spring|laravel)\b',
            # Databases
            r'\b(?:mysql|postgresql|mongodb|redis|sqlite|oracle|sql server|cassandra)\b',
            # Cloud and DevOps
            r'\b(?:aws|azure|gcp|docker|kubernetes|jenkins|git|gitlab|github|ci/cd)\b',
            # Data and AI
            r'\b(?:pandas|numpy|scikit-learn|tensorflow|pytorch|spark|hadoop|tableau)\b',
            # Tools and frameworks
            r'\b(?:linux|windows|macos|unix|bash|powershell|rest|api|json|xml)\b'
        ]
        
        skills = set()
        text_lower = text.lower()
        
        for pattern in tech_patterns:
            matches = re.findall(pattern, text_lower)
            skills.update(matches)
        
        return list(skills)
    
    def calculate_keyword_overlap(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        """Calculate keyword overlap between resume and job description"""
        try:
            resume_keywords = set(self.extract_keywords(resume_text, 50))
            job_keywords = set(self.extract_keywords(job_description, 50))
            
            # Extract technical skills separately
            resume_tech = set(self.extract_technical_skills(resume_text))
            job_tech = set(self.extract_technical_skills(job_description))
            
            # Combine regular keywords and technical skills
            resume_all = resume_keywords.union(resume_tech)
            job_all = job_keywords.union(job_tech)
            
            common_keywords = resume_all.intersection(job_all)
            missing_keywords = job_all - resume_all
            
            # Calculate overlap percentage
            if len(job_all) > 0:
                overlap_score = len(common_keywords) / len(job_all) * 100
            else:
                overlap_score = 0
            
            return {
                'overlap_score': overlap_score,
                'common_keywords': list(common_keywords),
                'missing_keywords': list(missing_keywords)[:15],  # Limit to top 15
                'technical_skills_match': len(resume_tech.intersection(job_tech)),
                'total_job_requirements': len(job_all)
            }
            
        except Exception as e:
            logger.error(f"Error calculating keyword overlap: {e}")
            return {
                'overlap_score': 0,
                'common_keywords': [],
                'missing_keywords': [],
                'technical_skills_match': 0,
                'total_job_requirements': 0
            }
    
    def calculate_semantic_similarity(self, resume_text: str, job_description: str) -> float:
        """Calculate semantic similarity using TF-IDF"""
        try:
            # Prepare texts (limit length for processing)
            texts = [resume_text[:2000], job_description[:2000]]
            
            # Calculate TF-IDF vectors
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            return float(similarity) * 100  # Convert to percentage
            
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {e}")
            return 0.0
    
    def analyze_resume_structure(self, resume_text: str) -> Dict[str, Any]:
        """Analyze resume structure and format"""
        analysis = {
            'has_contact_info': bool(re.search(r'email|phone|@|\+\d+', resume_text, re.I)),
            'has_experience_section': bool(re.search(r'experience|work|employment|position', resume_text, re.I)),
            'has_education_section': bool(re.search(r'education|degree|university|college|school', resume_text, re.I)),
            'has_skills_section': bool(re.search(r'skills|competencies|technologies', resume_text, re.I)),
            'word_count': len(resume_text.split()),
            'has_quantified_achievements': bool(re.search(r'\d+%|\$\d+|\d+\s*years?|\d+\s*months?', resume_text)),
            'section_count': len(re.findall(r'\n[A-Z][A-Z\s]+\n', resume_text))
        }
        
        return analysis
    
    def generate_suggestions(self, resume_text: str, job_description: str, 
                           missing_keywords: List[str], structure_analysis: Dict) -> List[Dict[str, str]]:
        """Generate improvement suggestions"""
        suggestions = []
        
        # Keyword-based suggestions
        if missing_keywords:
            tech_keywords = [kw for kw in missing_keywords 
                           if kw in ['python', 'java', 'javascript', 'sql', 'aws', 'docker', 
                                   'kubernetes', 'react', 'node', 'api', 'database', 'cloud']]
            
            if tech_keywords:
                suggestions.append({
                    'category': 'technical_skills',
                    'suggestion': f'Add these relevant technical skills: {", ".join(tech_keywords[:5])}',
                    'priority': 'high'
                })
            
            other_keywords = [kw for kw in missing_keywords if kw not in tech_keywords][:5]
            if other_keywords:
                suggestions.append({
                    'category': 'keywords',
                    'suggestion': f'Include these important keywords: {", ".join(other_keywords)}',
                    'priority': 'high'
                })
        
        # Structure-based suggestions
        if not structure_analysis.get('has_contact_info'):
            suggestions.append({
                'category': 'formatting',
                'suggestion': 'Include clear contact information (email, phone number)',
                'priority': 'high'
            })
        
        if not structure_analysis.get('has_experience_section'):
            suggestions.append({
                'category': 'experience',
                'suggestion': 'Add a dedicated Experience or Work History section',
                'priority': 'high'
            })
        
        if not structure_analysis.get('has_skills_section'):
            suggestions.append({
                'category': 'technical_skills',
                'suggestion': 'Create a clear Skills section highlighting your technical abilities',
                'priority': 'medium'
            })
        
        if not structure_analysis.get('has_quantified_achievements'):
            suggestions.append({
                'category': 'experience',
                'suggestion': 'Quantify your achievements with specific numbers, percentages, or metrics',
                'priority': 'medium'
            })
        
        if structure_analysis.get('word_count', 0) < 150:
            suggestions.append({
                'category': 'general',
                'suggestion': 'Expand your resume with more detailed descriptions of your experience',
                'priority': 'medium'
            })
        
        # Job-specific suggestions
        if 'management' in job_description.lower() and 'manage' not in resume_text.lower():
            suggestions.append({
                'category': 'experience',
                'suggestion': 'Highlight any leadership or management experience you have',
                'priority': 'medium'
            })
        
        return suggestions[:8]  # Limit to 8 suggestions
    
    def generate_optimized_resume(self, resume_text: str, job_description: str, 
                                missing_keywords: List[str]) -> str:
        """Generate an optimized version of the resume"""
        try:
            optimization_suggestions = []
            
            # Keyword integration suggestions
            if missing_keywords:
                tech_keywords = [kw for kw in missing_keywords[:8] 
                               if kw in ['python', 'java', 'javascript', 'sql', 'aws', 'docker', 
                                       'kubernetes', 'react', 'node', 'api', 'database', 'cloud']]
                
                other_keywords = [kw for kw in missing_keywords[:8] if kw not in tech_keywords]
                
                optimization_suggestions.append("KEYWORD OPTIMIZATION:")
                if tech_keywords:
                    optimization_suggestions.append(f"• Technical Skills to Add: {', '.join(tech_keywords)}")
                if other_keywords:
                    optimization_suggestions.append(f"• Industry Keywords to Include: {', '.join(other_keywords)}")
            
            # Format optimization
            optimization_suggestions.extend([
                "",
                "FORMATTING IMPROVEMENTS:",
                "• Use clear section headers: EXPERIENCE, SKILLS, EDUCATION",
                "• Start bullet points with strong action verbs",
                "• Quantify achievements with specific metrics",
                "• Keep consistent formatting throughout",
                "",
                "ATS OPTIMIZATION TIPS:",
                "• Use standard section names that ATS systems recognize",
                "• Include relevant keywords naturally in context",
                "• Avoid graphics, tables, or unusual formatting",
                "• Use common file formats (PDF or Word)",
                "",
                "CONTENT ENHANCEMENT:",
                "• Tailor your summary to match the job description",
                "• Highlight accomplishments that demonstrate value",
                "• Show progression and growth in your career",
                "• Include relevant certifications or training"
            ])
            
            optimized_resume = f"""
{resume_text}

--- RESUME OPTIMIZATION RECOMMENDATIONS ---

{chr(10).join(optimization_suggestions)}

NEXT STEPS:
1. Review the missing keywords and incorporate them naturally into your experience descriptions
2. Update your summary/objective to align with the job requirements
3. Ensure your skills section prominently features the required technologies
4. Add specific metrics and achievements where possible
5. Tailor your experience descriptions to match the job responsibilities

Remember: The goal is to show how your experience aligns with what the employer is seeking while maintaining honesty and authenticity.
"""
            
            return optimized_resume
            
        except Exception as e:
            logger.error(f"Error generating optimized resume: {e}")
            return resume_text + "\n\n--- Error generating optimization suggestions ---"
    
    def analyze_resume(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        """Main analysis function"""
        try:
            logger.info("Starting lightweight resume analysis...")
            
            # Calculate keyword overlap
            keyword_analysis = self.calculate_keyword_overlap(resume_text, job_description)
            
            # Calculate semantic similarity
            semantic_score = self.calculate_semantic_similarity(resume_text, job_description)
            
            # Analyze resume structure
            structure_analysis = self.analyze_resume_structure(resume_text)
            
            # Calculate final ATS score
            keyword_score = keyword_analysis['overlap_score']
            structure_bonus = 0
            
            # Bonus points for good structure
            if structure_analysis['has_contact_info']:
                structure_bonus += 5
            if structure_analysis['has_experience_section']:
                structure_bonus += 5
            if structure_analysis['has_skills_section']:
                structure_bonus += 5
            if structure_analysis['has_quantified_achievements']:
                structure_bonus += 10
            
            # Combine scores
            ats_score = int((keyword_score * 0.5 + semantic_score * 0.3 + structure_bonus * 0.2))
            ats_score = max(20, min(100, ats_score))  # Ensure reasonable range
            
            # Generate suggestions
            suggestions = self.generate_suggestions(
                resume_text, 
                job_description, 
                keyword_analysis['missing_keywords'],
                structure_analysis
            )
            
            # Generate optimized resume
            optimized_resume = self.generate_optimized_resume(
                resume_text,
                job_description,
                keyword_analysis['missing_keywords']
            )
            
            result = {
                'ats_score': ats_score,
                'missing_keywords': keyword_analysis['missing_keywords'],
                'suggestions': suggestions,
                'optimized_resume': optimized_resume,
                'analysis_details': {
                    'keyword_score': round(keyword_score, 2),
                    'semantic_score': round(semantic_score, 2),
                    'structure_score': structure_bonus,
                    'common_keywords_count': len(keyword_analysis['common_keywords']),
                    'technical_skills_match': keyword_analysis['technical_skills_match'],
                    'word_count': structure_analysis['word_count'],
                    'has_good_structure': structure_analysis['has_experience_section'] and structure_analysis['has_skills_section']
                }
            }
            
            logger.info(f"Analysis complete. ATS Score: {ats_score}")
            return result
            
        except Exception as e:
            logger.error(f"Error in resume analysis: {e}")
            raise

# Initialize analyzer
analyzer = LightweightResumeAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': True,  # Always true for lightweight version
        'service': 'Lightweight Resume AI Analysis Service',
        'version': 'lite'
    })

@app.route('/analyze', methods=['POST'])
def analyze_resume():
    """Main analysis endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'resume_text' not in data or 'job_description' not in data:
            return jsonify({
                'error': 'Missing required fields: resume_text and job_description'
            }), 400
        
        resume_text = data['resume_text']
        job_description = data['job_description']
        
        if not resume_text.strip() or not job_description.strip():
            return jsonify({
                'error': 'Resume text and job description cannot be empty'
            }), 400
        
        # Perform analysis
        result = analyzer.analyze_resume(resume_text, job_description)
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({
            'error': f'Analysis failed: {str(e)}'
        }), 500

@app.route('/load-models', methods=['POST'])
def load_models():
    """Load models endpoint (not needed for lite version)"""
    return jsonify({
        'success': True,
        'models_loaded': True,
        'message': 'Lightweight version - no models to load'
    })

if __name__ == '__main__':
    logger.info("Starting Lightweight Resume AI Analysis Service...")
    logger.info("Using scikit-learn and NLTK for intelligent analysis...")
    logger.info("Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)
