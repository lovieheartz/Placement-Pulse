import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// 1. Create context
export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// 2. Create a provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load user from sessionStorage on first render
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Login sets user in both state and sessionStorage
  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem("user", JSON.stringify(userData));
    // Also store token if needed
    // sessionStorage.setItem("authToken", token);
  };

  // Update user data
  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
  };

  // Refresh user data from server
  const refreshUser = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;
      
      const { data } = await axios.get('http://localhost:3001/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      updateUser(data);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Logout clears everything
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("authToken");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
