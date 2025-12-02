import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import StudentHeader from '../components/StudentHeader';
import StudentFooter from '../components/StudentFooter';
import ResumeAnalyzer from '../components/ResumeAnalyzer';
import ResumeAnalysisHistory from '../components/ResumeAnalysisHistory';
import './Dashboard.css';

const ResumeAnalyzerPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analyzer');

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="dashboard">
      <StudentSidebar />

      <div className="main">
        <StudentHeader
          user={user}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          handleLogout={handleLogout}
          navigate={navigate}
        />

        {/* Tab Navigation - Directly under header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <nav className="flex gap-4 md:gap-8 px-6 md:px-8">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`relative py-4 px-2 font-semibold text-base transition-all duration-200 ${
                activeTab === 'analyzer'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
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
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
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
        <div className="px-6 md:px-8 py-6 md:py-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          {activeTab === 'analyzer' ? <ResumeAnalyzer /> : <ResumeAnalysisHistory />}
        </div>

        <StudentFooter />
      </div>
    </div>
  );
};

export default ResumeAnalyzerPage;
