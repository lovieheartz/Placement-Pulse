#!/usr/bin/env python3
"""
Local AI Service for Resume Analysis
Uses Hugging Face transformers for offline resume analysis
"""

import os
import json
import re
import logging
from typing import Dict, List, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")
torch.set_num_threads(2)  # Limit CPU usage

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class ResumeAnalyzer:
    def __init__(self):
        self.models_loaded = False
        self.text_generator = None
        self.classifier = None
        self.tokenizer = None
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')

        # Advanced analysis components
        self.industry_keywords = {
            'software_engineering': ['python', 'java', 'javascript', 'react', 'node', 'docker', 'kubernetes', 'aws', 'git', 'api', 'database', 'sql', 'mongodb', 'redis', 'microservices', 'agile', 'scrum', 'devops', 'ci/cd', 'testing', 'debugging'],
            'data_science': ['python', 'r', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'sklearn', 'sql', 'tableau', 'power bi', 'statistics', 'data visualization', 'big data', 'hadoop', 'spark'],
            'marketing': ['digital marketing', 'seo', 'sem', 'social media', 'content marketing', 'email marketing', 'analytics', 'google analytics', 'facebook ads', 'linkedin', 'campaign management', 'brand management'],
            'finance': ['financial analysis', 'excel', 'financial modeling', 'valuation', 'risk management', 'accounting', 'budgeting', 'forecasting', 'bloomberg', 'financial reporting'],
            'design': ['figma', 'sketch', 'adobe creative suite', 'photoshop', 'illustrator', 'ui/ux', 'user experience', 'prototyping', 'wireframing', 'design thinking']
        }

        self.skill_categories = {
            'technical': ['programming', 'coding', 'development', 'software', 'database', 'cloud', 'framework', 'library', 'tool', 'platform'],
            'soft_skills': ['communication', 'leadership', 'teamwork', 'collaboration', 'problem solving', 'analytical', 'creative', 'management', 'organization', 'time management'],
            'certifications': ['certified', 'certification', 'diploma', 'degree', 'course', 'training', 'bootcamp', 'workshop']
        }

        self.ats_optimization_factors = {
            'keyword_density': 0.25,
            'semantic_relevance': 0.20,
            'skill_match': 0.20,
            'experience_relevance': 0.15,
            'format_compatibility': 0.10,
            'industry_alignment': 0.10
        }

        # Download required NLTK data
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('wordnet', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
        except:
            pass
    
    def load_models(self):
        """Load AI models for analysis"""
        try:
            logger.info("Loading AI models...")
            
            # Use a lightweight model for text generation/analysis
            # FLAN-T5 small for better performance on local machines
            model_name = "google/flan-t5-small"
            
            logger.info(f"Loading {model_name}...")
            self.text_generator = pipeline(
                "text2text-generation",
                model=model_name,
                tokenizer=model_name,
                device=-1,  # Use CPU
                max_length=512,
                do_sample=True,
                temperature=0.3
            )
            
            # Load a sentiment classifier for scoring
            logger.info("Loading classifier...")
            self.classifier = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=-1
            )
            
            self.models_loaded = True
            logger.info("All models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            self.models_loaded = False
    
    def extract_keywords(self, text: str, top_k: int = 20) -> List[str]:
        """Extract important keywords from text"""
        try:
            # Clean and tokenize text
            cleaned_text = re.sub(r'[^a-zA-Z\s]', ' ', text.lower())
            words = cleaned_text.split()
            
            # Filter out common words and short words
            stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'hers', 'its', 'our', 'their', 'from', 'up', 'about', 'into', 'over', 'after', 'work', 'experience', 'years', 'year', 'time', 'company', 'job', 'role', 'position', 'responsibilities', 'skills'}
            
            # Extract meaningful keywords
            keywords = [word for word in words if len(word) > 3 and word not in stop_words]
            
            # Count frequency and return top keywords
            word_freq = {}
            for word in keywords:
                word_freq[word] = word_freq.get(word, 0) + 1
            
            sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
            return [word for word, freq in sorted_words[:top_k]]
            
        except Exception as e:
            logger.error(f"Error extracting keywords: {e}")
            return []
    
    def calculate_keyword_overlap(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        """Calculate keyword overlap between resume and job description"""
        try:
            resume_keywords = set(self.extract_keywords(resume_text, 50))
            job_keywords = set(self.extract_keywords(job_description, 50))
            
            common_keywords = resume_keywords.intersection(job_keywords)
            missing_keywords = job_keywords - resume_keywords
            
            # Calculate overlap percentage
            if len(job_keywords) > 0:
                overlap_score = len(common_keywords) / len(job_keywords) * 100
            else:
                overlap_score = 0
            
            return {
                'overlap_score': overlap_score,
                'common_keywords': list(common_keywords),
                'missing_keywords': list(missing_keywords)[:15]  # Limit to top 15
            }
            
        except Exception as e:
            logger.error(f"Error calculating keyword overlap: {e}")
            return {
                'overlap_score': 0,
                'common_keywords': [],
                'missing_keywords': []
            }
    
    def calculate_semantic_similarity(self, resume_text: str, job_description: str) -> float:
        """Calculate semantic similarity using TF-IDF"""
        try:
            # Prepare texts
            texts = [resume_text[:2000], job_description[:2000]]  # Limit length
            
            # Calculate TF-IDF vectors
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
            return float(similarity) * 100  # Convert to percentage
            
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {e}")
            return 0.0
    
    def generate_suggestions(self, resume_text: str, job_description: str, missing_keywords: List[str]) -> List[Dict[str, str]]:
        """Generate improvement suggestions"""
        suggestions = []
        
        # Keyword-based suggestions
        if missing_keywords:
            suggestions.append({
                'category': 'keywords',
                'suggestion': f'Include relevant keywords from the job description: {", ".join(missing_keywords[:5])}',
                'priority': 'high'
            })
        
        # Length-based suggestions
        if len(resume_text.split()) < 200:
            suggestions.append({
                'category': 'formatting',
                'suggestion': 'Consider expanding your resume with more detailed descriptions of your experience',
                'priority': 'medium'
            })
        
        # Technical skills suggestion
        tech_keywords = ['python', 'java', 'javascript', 'sql', 'aws', 'docker', 'kubernetes', 'react', 'node', 'api', 'database', 'machine learning', 'data analysis']
        job_tech = [kw for kw in missing_keywords if kw.lower() in tech_keywords]
        
        if job_tech:
            suggestions.append({
                'category': 'technical_skills',
                'suggestion': f'Highlight technical skills mentioned in job requirements: {", ".join(job_tech[:3])}',
                'priority': 'high'
            })
        
        # Experience suggestions
        if 'experience' in job_description.lower() and 'experience' not in resume_text.lower():
            suggestions.append({
                'category': 'experience',
                'suggestion': 'Add more details about your relevant work experience and achievements',
                'priority': 'medium'
            })
        
        # General formatting
        suggestions.append({
            'category': 'formatting',
            'suggestion': 'Use clear section headers (Experience, Skills, Education) for better ATS parsing',
            'priority': 'low'
        })
        
        return suggestions[:6]  # Limit to 6 suggestions
    
    def generate_optimized_resume(self, resume_text: str, job_description: str, missing_keywords: List[str]) -> str:
        """Generate an optimized version of the resume"""
        try:
            if not self.models_loaded or not self.text_generator:
                # Fallback optimization without AI
                optimization_note = f"""
--- RESUME OPTIMIZATION SUGGESTIONS ---

Original Resume:
{resume_text}

RECOMMENDATIONS:
1. Include these relevant keywords: {', '.join(missing_keywords[:8])}
2. Tailor your experience descriptions to match job requirements
3. Use action verbs and quantify achievements where possible
4. Ensure your skills section highlights technologies mentioned in the job description

KEYWORD INTEGRATION TIPS:
- Naturally incorporate missing keywords into your experience descriptions
- Update your summary/objective to align with the job role
- Ensure your skills section matches the job requirements
"""
                return optimization_note
            
            # Use AI to generate optimization suggestions
            prompt = f"""Analyze this resume and suggest improvements to better match the job description. Focus on keyword optimization and relevance.

Resume: {resume_text[:800]}

Job Requirements: {job_description[:400]}

Provide specific suggestions for improvement:"""

            try:
                response = self.text_generator(
                    prompt,
                    max_length=300,
                    num_return_sequences=1,
                    temperature=0.3
                )
                
                ai_suggestions = response[0]['generated_text'] if response else ""
                
                optimized_resume = f"""
{resume_text}

--- AI-POWERED OPTIMIZATION SUGGESTIONS ---
{ai_suggestions}

MISSING KEYWORDS TO INCORPORATE:
{', '.join(missing_keywords[:10])}

NEXT STEPS:
1. Review the suggestions above
2. Update your resume to include relevant missing keywords
3. Ensure your experience aligns with job requirements
4. Quantify achievements with specific metrics where possible
"""
                
                return optimized_resume
                
            except Exception as e:
                logger.error(f"AI generation failed: {e}")
                # Fallback to manual optimization
                return self.generate_optimized_resume(resume_text, job_description, missing_keywords)
                
        except Exception as e:
            logger.error(f"Error generating optimized resume: {e}")
            return resume_text + "\n\n--- Error generating optimization suggestions ---"
    
    def detect_industry(self, job_description: str) -> str:
        """Detect the industry based on job description"""
        job_desc_lower = job_description.lower()
        industry_scores = {}

        for industry, keywords in self.industry_keywords.items():
            score = sum(1 for keyword in keywords if keyword in job_desc_lower)
            industry_scores[industry] = score

        detected_industry = max(industry_scores, key=industry_scores.get) if industry_scores else 'general'
        return detected_industry

    def calculate_advanced_ats_score(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        """Calculate sophisticated ATS score with multiple factors"""
        try:
            # Basic keyword analysis
            keyword_analysis = self.calculate_keyword_overlap(resume_text, job_description)
            keyword_score = keyword_analysis['overlap_score']

            # Semantic similarity
            semantic_score = self.calculate_semantic_similarity(resume_text, job_description)

            # Industry alignment
            detected_industry = self.detect_industry(job_description)
            industry_score = self.calculate_industry_alignment(resume_text, detected_industry)

            # Skill matching
            skill_score = self.calculate_skill_matching(resume_text, job_description)

            # Experience relevance
            experience_score = self.calculate_experience_relevance(resume_text, job_description)

            # Format compatibility (basic check)
            format_score = self.calculate_format_score(resume_text)

            # Calculate weighted ATS score
            weighted_score = (
                keyword_score * self.ats_optimization_factors['keyword_density'] +
                semantic_score * self.ats_optimization_factors['semantic_relevance'] +
                skill_score * self.ats_optimization_factors['skill_match'] +
                experience_score * self.ats_optimization_factors['experience_relevance'] +
                format_score * self.ats_optimization_factors['format_compatibility'] +
                industry_score * self.ats_optimization_factors['industry_alignment']
            )

            # Normalize to 0-100 range
            final_score = max(20, min(100, int(weighted_score)))

            return {
                'final_score': final_score,
                'breakdown': {
                    'keyword_matching': round(keyword_score, 1),
                    'semantic_relevance': round(semantic_score, 1),
                    'skill_alignment': round(skill_score, 1),
                    'experience_relevance': round(experience_score, 1),
                    'format_compatibility': round(format_score, 1),
                    'industry_alignment': round(industry_score, 1)
                },
                'detected_industry': detected_industry,
                'common_keywords': keyword_analysis['common_keywords'],
                'missing_keywords': keyword_analysis['missing_keywords']
            }

        except Exception as e:
            logger.error(f"Error in advanced ATS scoring: {e}")
            return {
                'final_score': 50,
                'breakdown': {},
                'detected_industry': 'general',
                'common_keywords': [],
                'missing_keywords': []
            }

    def calculate_industry_alignment(self, resume_text: str, industry: str) -> float:
        """Calculate how well the resume aligns with detected industry"""
        if industry not in self.industry_keywords:
            return 50.0

        resume_lower = resume_text.lower()
        industry_keywords = self.industry_keywords[industry]

        matches = sum(1 for keyword in industry_keywords if keyword in resume_lower)
        alignment_score = (matches / len(industry_keywords)) * 100

        return min(100, alignment_score * 1.2)  # Slight boost for good alignment

    def calculate_skill_matching(self, resume_text: str, job_description: str) -> float:
        """Calculate skill matching score"""
        resume_lower = resume_text.lower()
        job_lower = job_description.lower()

        # Extract potential skills from job description
        job_skills = []
        for category, keywords in self.skill_categories.items():
            for keyword in keywords:
                if keyword in job_lower:
                    job_skills.append(keyword)

        # Check how many job skills are mentioned in resume
        if not job_skills:
            return 60.0  # Neutral score if no clear skills detected

        skill_matches = sum(1 for skill in job_skills if skill in resume_lower)
        skill_score = (skill_matches / len(job_skills)) * 100

        return min(100, skill_score)

    def calculate_experience_relevance(self, resume_text: str, job_description: str) -> float:
        """Calculate experience relevance based on years and context"""
        resume_lower = resume_text.lower()
        job_lower = job_description.lower()

        # Look for experience indicators
        experience_patterns = [
            r'(\d+)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)',
            r'(\d+)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:in|with|of)',
            r'experience\s*(?:of\s*)?(\d+)\s*(?:\+)?\s*(?:years?|yrs?)'
        ]

        resume_years = []
        job_years = []

        # Extract years from resume
        for pattern in experience_patterns:
            matches = re.findall(pattern, resume_lower)
            resume_years.extend([int(match) for match in matches])

        # Extract required years from job
        for pattern in experience_patterns:
            matches = re.findall(pattern, job_lower)
            job_years.extend([int(match) for match in matches])

        # Calculate score based on experience match
        if not resume_years or not job_years:
            return 65.0  # Neutral score if experience not clearly stated

        max_resume_exp = max(resume_years) if resume_years else 0
        min_job_req = min(job_years) if job_years else 0

        if max_resume_exp >= min_job_req:
            return 90.0  # Good experience match
        elif max_resume_exp >= min_job_req * 0.7:
            return 75.0  # Acceptable experience
        else:
            return 45.0  # Below required experience

    def calculate_format_score(self, resume_text: str) -> float:
        """Calculate format compatibility score"""
        score = 70.0  # Base score

        # Check for good structure indicators
        structure_indicators = ['experience', 'education', 'skills', 'summary', 'objective', 'projects']
        found_sections = sum(1 for indicator in structure_indicators if indicator in resume_text.lower())

        # Boost score based on structure
        structure_boost = min(20, found_sections * 4)
        score += structure_boost

        # Check for formatting issues that might affect ATS
        if len(resume_text.split('\n')) < 5:
            score -= 15  # Too few lines might indicate poor formatting

        if len(resume_text.split()) < 100:
            score -= 10  # Too short

        return min(100, max(30, score))

    def generate_advanced_suggestions(self, resume_text: str, job_description: str, analysis_result: Dict) -> List[Dict]:
        """Generate sophisticated improvement suggestions"""
        suggestions = []
        breakdown = analysis_result['breakdown']
        detected_industry = analysis_result['detected_industry']

        # Industry-specific suggestions
        if breakdown.get('industry_alignment', 0) < 70:
            suggestions.append({
                'category': 'industry_alignment',
                'title': 'Industry Keyword Optimization',
                'suggestion': f'Add more {detected_industry.replace("_", " ").title()} industry-specific keywords and terminologies',
                'priority': 'high',
                'impact': 'ATS compatibility',
                'keywords': self.industry_keywords.get(detected_industry, [])[:5]
            })

        # Keyword density suggestions
        if breakdown.get('keyword_matching', 0) < 75:
            suggestions.append({
                'category': 'keywords',
                'title': 'Keyword Density Improvement',
                'suggestion': f'Increase keyword density by incorporating these missing terms: {", ".join(analysis_result["missing_keywords"][:5])}',
                'priority': 'high',
                'impact': 'Search ranking',
                'keywords': analysis_result['missing_keywords'][:8]
            })

        # Skill alignment
        if breakdown.get('skill_alignment', 0) < 70:
            suggestions.append({
                'category': 'technical_skills',
                'title': 'Skill Portfolio Enhancement',
                'suggestion': 'Highlight technical skills that directly match job requirements and provide specific examples of usage',
                'priority': 'high',
                'impact': 'Relevance score'
            })

        # Experience optimization
        if breakdown.get('experience_relevance', 0) < 80:
            suggestions.append({
                'category': 'experience',
                'title': 'Experience Storytelling',
                'suggestion': 'Quantify achievements with metrics (e.g., "Increased efficiency by 25%") and use action verbs',
                'priority': 'medium',
                'impact': 'Professional appeal'
            })

        # Format improvements
        if breakdown.get('format_compatibility', 0) < 80:
            suggestions.append({
                'category': 'formatting',
                'title': 'ATS-Friendly Formatting',
                'suggestion': 'Use standard section headers, bullet points, and avoid complex formatting that ATS cannot parse',
                'priority': 'medium',
                'impact': 'System readability'
            })

        # Semantic relevance
        if breakdown.get('semantic_relevance', 0) < 75:
            suggestions.append({
                'category': 'content_optimization',
                'title': 'Content Relevance Boost',
                'suggestion': 'Rewrite job descriptions to better mirror the language and context used in the target job posting',
                'priority': 'medium',
                'impact': 'Contextual matching'
            })

        return suggestions[:6]  # Return top 6 suggestions

    def analyze_resume(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        """Enhanced main analysis function"""
        try:
            logger.info("Starting advanced resume analysis...")

            # Advanced ATS scoring
            ats_analysis = self.calculate_advanced_ats_score(resume_text, job_description)

            # Generate advanced suggestions
            suggestions = self.generate_advanced_suggestions(resume_text, job_description, ats_analysis)

            # Generate optimized resume
            optimized_resume = self.generate_optimized_resume(
                resume_text,
                job_description,
                ats_analysis['missing_keywords']
            )

            result = {
                'ats_score': ats_analysis['final_score'],
                'score_breakdown': ats_analysis['breakdown'],
                'detected_industry': ats_analysis['detected_industry'],
                'missing_keywords': ats_analysis['missing_keywords'][:15],
                'matched_keywords': ats_analysis['common_keywords'][:10],
                'suggestions': suggestions,
                'optimized_resume': optimized_resume,
                'analysis_metadata': {
                    'total_keywords_analyzed': len(ats_analysis['common_keywords']) + len(ats_analysis['missing_keywords']),
                    'resume_word_count': len(resume_text.split()),
                    'job_description_word_count': len(job_description.split()),
                    'analysis_timestamp': int(torch.initial_seed() % 1000000)  # Simple timestamp alternative
                }
            }

            logger.info(f"Advanced analysis complete. ATS Score: {ats_analysis['final_score']}")
            return result

        except Exception as e:
            logger.error(f"Error in advanced resume analysis: {e}")
            raise

# Initialize analyzer
analyzer = ResumeAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': analyzer.models_loaded,
        'service': 'Resume AI Analysis Service'
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
    """Load AI models endpoint"""
    try:
        analyzer.load_models()
        return jsonify({
            'success': True,
            'models_loaded': analyzer.models_loaded
        })
    except Exception as e:
        logger.error(f"Model loading error: {e}")
        return jsonify({
            'error': f'Failed to load models: {str(e)}'
        }), 500

if __name__ == '__main__':
    logger.info("Starting Resume AI Analysis Service...")
    logger.info("Loading AI models in background...")
    
    # Load models in background
    try:
        analyzer.load_models()
    except Exception as e:
        logger.warning(f"Could not load models at startup: {e}")
        logger.info("Models can be loaded later via /load-models endpoint")
    
    logger.info("Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)

