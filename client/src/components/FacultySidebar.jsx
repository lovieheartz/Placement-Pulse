import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiFileText, FiMenu, FiX, FiChevronDown, FiBookOpen, FiCheckSquare, FiUsers } from 'react-icons/fi';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testDropdownOpen, setTestDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleTestDropdown = () => setTestDropdownOpen(!testDropdownOpen);

  const handleDashboardClick = () => {
    navigate("/faculty-dashboard");
    setIsOpen(false);
  };

  const handleStudentListClick = () => {
    navigate("/faculty/students");
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Icon */}
      <div
        className="fixed top-4 left-4 z-[105] w-10 h-10 flex items-center justify-center rounded-full bg-blue-800 shadow-lg cursor-pointer md:hidden"
        onClick={toggleSidebar}
      >
        <FiMenu className="text-white text-xl" />
      </div>

      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-full w-full bg-gradient-to-b from-blue-800 to-blue-900 text-white px-4 py-6 z-[110] transform transition-all duration-300
        ${isOpen ? "translate-y-0" : "-translate-y-full"} 
        md:relative md:translate-y-0 md:translate-x-0 md:h-auto md:w-[240px] md:min-h-screen md:shadow-xl`}
      >
        {/* Close Button - Mobile only */}
        <div className="absolute top-4 right-4 md:hidden">
          <button
            onClick={toggleSidebar}
            className="text-white hover:text-blue-200 focus:outline-none bg-blue-700 rounded-full p-2 transition-colors duration-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full mt-8 md:mt-0">
          {/* Logo and Title */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gradient-to-r from-blue-100 to-white p-3 rounded-xl shadow-lg border-2 border-white/30 transform hover:scale-105 transition-all duration-300">
              <FiBookOpen className="w-5 h-5 text-blue-700" />
            </div>
            <div className="ml-3">
              <h4 className="text-xl font-bold text-white">
                Faculty Portal
              </h4>
            </div>
          </div>

          {/* Menu Items */}
          <ul className="flex flex-col space-y-1">
            {/* Dashboard Button */}
            <li className="w-full">
              <button
                onClick={handleDashboardClick}
                className="w-full flex items-center px-4 py-3 text-left text-white hover:bg-blue-700 rounded-lg transition-all duration-200 font-medium"
              >
                <FiHome className="w-5 h-5 mr-3" />
                Dashboard
              </button>
            </li>

            {/* Students Button */}
            <li className="w-full">
              <button
                onClick={handleStudentListClick}
                className="w-full flex items-center px-4 py-3 text-left text-white hover:bg-blue-700 rounded-lg transition-all duration-200 font-medium"
              >
                <FiUsers className="w-5 h-5 mr-3" />
                Students
              </button>
            </li>

            {/* Tests Dropdown */}
            <li className="w-full">
              <div
                className={`flex justify-between items-center cursor-pointer px-4 py-3 w-full hover:bg-blue-700 rounded-lg transition-all duration-200 ${testDropdownOpen ? 'bg-blue-700' : ''}`}
                onClick={toggleTestDropdown}
              >
                <div className="flex items-center">
                  <FiFileText className="w-5 h-5 mr-3" />
                  <span className="font-medium">Tests</span>
                </div>
                <FiChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${testDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
              {testDropdownOpen && (
                <div className="mt-1 ml-6 pl-6 border-l-2 border-blue-500 space-y-1">
                  <button
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiFileText className="w-4 h-4 mr-2" />
                    Add Tests
                  </button>
                  <button
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiCheckSquare className="w-4 h-4 mr-2" />
                    Check Scores
                  </button>
                </div>
              )}
            </li>
          </ul>
          
        </div>
      </nav>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-50 backdrop-blur-sm z-[100] md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
