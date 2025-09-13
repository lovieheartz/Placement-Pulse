import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/FacultySidebar';
import Header from '../components/FacultyHeader';
import Card from '../components/Card';
import Footer from '../components/FacultyFooter';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const FacultyDashboard = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const token = sessionStorage.getItem('authToken');

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const {
    data: profileData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['facultyProfile'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:3001/faculty/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  if (isLoading) {
    return <div className="p-10 text-center">Loading profile...</div>;
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-600">
        Error: {error.message}
      </div>
    );
  }

  const user = {
    name: profileData.name,
    email: profileData.email,
    profilePicture: profileData.avatar
      ? `http://localhost:3001${profileData.avatar}`
      : null,
  };

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header
          user={user}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          handleLogout={handleLogout}
          navigate={navigate}
        />

        <div className="card-container">
          <Card title="Student Dashboard" />
          <Card title="Faculty Dashboard" />
          <Card title="Admin Dashboard" />
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default FacultyDashboard;
