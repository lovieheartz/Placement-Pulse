import React, { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Card from '../components/Card';
import Footer from '../components/Footer';
import axios from 'axios';
import './Dashboard.css';

const Home = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const token = sessionStorage.getItem("authToken");
  const role = JSON.parse(sessionStorage.getItem("user"))?.role;

  let endpoint = "";
  switch (role) {
    case "admin":
      endpoint = "/admin/profile";
      break;
    case "faculty":
      endpoint = "/faculty/profile";
      break;
    case "student":
      endpoint = "/student/profile";
      break;
    default:
      endpoint = null;
  }

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["profile", role],
    queryFn: async () => {
      if (!endpoint) throw new Error("Unknown user role.");
      const res = await axios.get(`http://localhost:3001${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token && !!endpoint,
  });

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl text-red-600 mb-4">
          Error: {error?.message || "User data not found."}
        </h2>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ✅ Construct the profile picture URL
  let profilePictureUrl = null;
  if (user.avatar) {
    profilePictureUrl = user.avatar.startsWith("http")
      ? user.avatar
      : `http://localhost:3001${user.avatar}`;
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header
          user={{
            ...user,
            profilePicture: profilePictureUrl
          }}
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

export default Home;
