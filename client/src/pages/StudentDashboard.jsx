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
          <Card
            title="AI Resume Analyzer"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            description="Get AI-powered resume analysis with ATS scoring"
            onClick={() => navigate('/student/resume-analyzer')}
          />

          <Card
            title="AI Mock Interview"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
            description="Practice interviews with AI voice assistant"
            onClick={() => navigate('/student/mock-interview')}
          />

          <Card
            title="Apply for NOC"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            description="Submit and track your NOC applications"
            onClick={() => navigate('/student/apply-noc')}
          />

          <Card
            title="Enrolled Tests"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
            description="View and attempt your enrolled tests"
            onClick={() => navigate('/student/tests')}
          />
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
