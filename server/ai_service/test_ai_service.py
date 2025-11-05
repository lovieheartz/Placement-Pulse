#!/usr/bin/env python3
"""
Test script for the local AI service
"""

import requests
import json
import time

def test_ai_service():
    """Test the local AI service functionality"""
    
    base_url = "http://localhost:5000"
    
    print("Testing Local AI Service for Resume Analyzer")
    print("=" * 50)
    
    # Test health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed")
            print(f"   Status: {data['status']}")
            print(f"   Models loaded: {data['models_loaded']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to AI service. Make sure it's running on port 5000")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Load models if needed
    health_data = response.json()
    if not health_data.get('models_loaded', False):
        print("\n2. Loading AI models...")
        print("   This may take 2-5 minutes on first run...")
        try:
            response = requests.post(f"{base_url}/load-models", timeout=300)  # 5 min timeout
            if response.status_code == 200:
                print("✅ Models loaded successfully")
            else:
                print(f"❌ Failed to load models: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Model loading error: {e}")
            return False
    else:
        print("\n2. ✅ Models already loaded")
    
    # Test analysis
    print("\n3. Testing resume analysis...")
    
    sample_resume = """
    John Doe
    Software Engineer
    
    Experience:
    - 3 years of Python development
    - Worked with Django and Flask frameworks
    - Database design and optimization
    - API development and integration
    
    Skills:
    - Python, JavaScript, SQL
    - Git, Docker, Linux
    - Problem solving and teamwork
    """
    
    sample_job = """
    We are looking for a Senior Python Developer with:
    - 5+ years Python experience
    - Django/Flask expertise
    - PostgreSQL database skills
    - AWS cloud experience
    - Machine learning knowledge
    - API development experience
    """
    
    try:
        start_time = time.time()
        
        response = requests.post(f"{base_url}/analyze", 
            json={
                "resume_text": sample_resume,
                "job_description": sample_job
            },
            timeout=60
        )
        
        analysis_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                result = data['data']
                print("✅ Analysis completed successfully")
                print(f"   Processing time: {analysis_time:.2f} seconds")
                print(f"   ATS Score: {result['ats_score']}%")
                print(f"   Missing keywords: {len(result['missing_keywords'])} found")
                print(f"   Suggestions: {len(result['suggestions'])} provided")
                print(f"   Optimized resume: {'Generated' if result['optimized_resume'] else 'Not generated'}")
                
                # Show some details
                if result['missing_keywords']:
                    print(f"   Sample missing keywords: {result['missing_keywords'][:3]}")
                if result['suggestions']:
                    print(f"   Sample suggestion: {result['suggestions'][0]['suggestion'][:60]}...")
                
                return True
            else:
                print(f"❌ Analysis failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Analysis request failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Analysis error: {e}")
        return False

def main():
    """Main test function"""
    print("Starting AI Service Test...\n")
    
    success = test_ai_service()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 All tests passed! The AI service is working correctly.")
        print("\nThe service is ready to be used by the Resume Analyzer.")
    else:
        print("❌ Some tests failed. Please check the error messages above.")
        print("\nTroubleshooting tips:")
        print("1. Make sure the AI service is running: python ai_server.py")
        print("2. Check if all dependencies are installed: pip install -r requirements.txt")
        print("3. Ensure Python 3.8+ is being used")
        print("4. Check available memory (2GB+ recommended)")
    
    print("\nPress Enter to exit...")
    input()

if __name__ == "__main__":
    main()

