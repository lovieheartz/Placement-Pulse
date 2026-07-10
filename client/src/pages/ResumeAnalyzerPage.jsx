import React, { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PortalLayout from '@/components/app/PortalLayout';
import { PageHeader } from '@/components/ui/surface';
import { FileSearch, History } from 'lucide-react';
import ResumeAnalyzer from '../components/ResumeAnalyzer';
import ResumeAnalysisHistory from '../components/ResumeAnalysisHistory';
import { API_BASE } from '../config/api';
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
      const res = await axios.get(`${API_BASE}/student/profile`, {
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

        {/* Segmented tab control */}
        <div className="inline-flex w-full max-w-md items-center gap-1 rounded-2xl border border-border/70 bg-muted/50 p-1.5 shadow-sm backdrop-blur-sm sm:w-auto">
          {[
            { id: 'analyzer', label: 'Resume Analyzer', Icon: FileSearch },
            { id: 'history', label: 'Analysis History', Icon: History },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:flex-none ${
                activeTab === id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="py-6 md:py-8">
          {activeTab === 'analyzer' ? <ResumeAnalyzer /> : <ResumeAnalysisHistory />}
        </div>
    </PortalLayout>
  );
};

export default ResumeAnalyzerPage;
