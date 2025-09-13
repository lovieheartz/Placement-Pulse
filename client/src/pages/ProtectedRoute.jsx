import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [adminExists, setAdminExists] = useState(null);
  const [loading, setLoading] = useState(true);

  const authToken = sessionStorage.getItem("authToken");

  useEffect(() => {
    axios.get("http://localhost:3001/admin/exists")
      .then((res) => {
        setAdminExists(res.data.exists);
        setLoading(false);
      })
      .catch(() => {
        setAdminExists(true); // fallback
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // ✅ Only allow /admin/create-admin if NO admin exists (for initial setup)
  if (location.pathname === "/admin/create-admin") {
    if (!adminExists) {
      return children;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  // ✅ Require login for all other routes
  if (!user || !authToken) {
    return <Navigate to="/login" state={{ fromProtected: true }} replace />;
  }

  return children;
};

export default ProtectedRoute;
