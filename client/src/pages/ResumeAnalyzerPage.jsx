import React, { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PortalLayout from '@/components/app/PortalLayout';
import { PageHeader } from '@/components/ui/surface';
import { FileSearch } from 'lucide-react';
import ResumeAnalyzer from '../components/ResumeAnalyzer';
import ResumeAnalysisHistory from '../components/ResumeAnalysisHistory';
import './Dashboard.css';

const ResumeAnalyzerPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analyzer');

  const token = sessionStorage.getItem('authToken');

  // Fetch profile with avatar
  const { data: profileData } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:3001/student/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <PortalLayout role="student" title="AI Resume Analyzer" user={profileData}>
        <PageHeader
          title="AI Resume Analyzer"
          subtitle="Analyze your resume and review past reports"
          icon={FileSearch}
        />

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex gap-4 md:gap-8">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`relative py-4 px-2 font-semibold text-base transition-all duration-200 ${
                activeTab === 'analyzer'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Resume Analyzer
              {activeTab === 'analyzer' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`relative py-4 px-2 font-semibold text-base transition-all duration-200 ${
                activeTab === 'history'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Analysis History
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"></div>
              )}
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="py-6 md:py-8">
          {activeTab === 'analyzer' ? <ResumeAnalyzer /> : <ResumeAnalysisHistory />}
        </div>
    </PortalLayout>
  );
};

export default ResumeAnalyzerPage;
