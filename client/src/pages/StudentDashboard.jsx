import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/StudentSidebar";
import Header from "../components/StudentHeader";
import Card from "../components/Card";
import Footer from "../components/StudentFooter";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import "./Dashboard.css";

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const token = sessionStorage.getItem("authToken");

  // ✅ Fetch profile with avatar
  const { data: profileData, isLoading, isError, error } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      const res = await axios.get("http://localhost:3001/student/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  if (!user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.heading}>You are not logged in</h1>
        <p style={styles.subheading}>Please login to access your dashboard.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>Loading profile...</h2>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>Error loading profile</h2>
        <p style={styles.subheading}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header
          user={profileData}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          handleLogout={handleLogout}
          navigate={navigate}
        />

        <div className="card-container">
          <Card title="Student Dashboard" />
          <Card title="Faculty Dashboard" />
          <Card title="Admin Dashboard" />
          <div 
            className="card cursor-pointer hover:shadow-lg transition-shadow duration-300"
            onClick={() => navigate('/student/resume-analyzer')}
          >
            <div className="card-icon bg-gradient-to-r from-purple-500 to-purple-600">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="card-content">
              <h3 className="card-title">AI Resume Analyzer</h3>
              <p className="card-description">
                Get AI-powered insights on your resume with ATS scoring, keyword analysis, and optimization suggestions.
              </p>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#f0f4f8",
    padding: "20px",
  },
  heading: {
    fontSize: "32px",
    color: "#333",
    marginBottom: "10px",
    textAlign: "center",
  },
  subheading: {
    fontSize: "18px",
    color: "#666",
    marginBottom: "30px",
    textAlign: "center",
  },
};

export default StudentDashboard;
