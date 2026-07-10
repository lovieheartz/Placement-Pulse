import { useState } from "react";
import { BrandGlyph } from "./ui/BrandMark";
import { useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiUserPlus, FiUserCheck, FiLock, FiShield, FiBell, FiMenu, FiX, FiChevronDown, FiFileText, FiBriefcase, FiClipboard } from 'react-icons/fi';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [facultyDropdownOpen, setFacultyDropdownOpen] = useState(false);
  const [hodDropdownOpen, setHodDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleFacultyDropdown = () => setFacultyDropdownOpen(!facultyDropdownOpen);
  const toggleHodDropdown = () => setHodDropdownOpen(!hodDropdownOpen);
  const toggleAdminDropdown = () => setAdminDropdownOpen(!adminDropdownOpen);
  const toggleStudentDropdown = () => setStudentDropdownOpen(!studentDropdownOpen);

  const handleFacultyList = () => {
    navigate("/admin/faculty");
    setIsOpen(false);
  };

  const handleAddFaculty = () => {
    navigate("/admin/add-faculty");
    setIsOpen(false);
  };

  const handleHODList = () => {
    navigate("/admin/hods");
    setIsOpen(false);
  };

  const handleAddHOD = () => {
    navigate("/admin/add-hod");
    setIsOpen(false);
  };

  const handleAdminList = () => {
    navigate("/admin/admins");
    setIsOpen(false);
  };

  const handleAdminCreate = () => {
    navigate("/admin/add-admin");
    setIsOpen(false);
  };

  const handleStudentList = () => {
    navigate("/admin/students");
    setIsOpen(false);
  };

  const handleBlockedStudents = () => {
    navigate("/admin/students/blocked");
    setIsOpen(false);
  };

  const handleSendNotification = () => {
    navigate("/admin/send-notification");
    setIsOpen(false);
  };

  const handleDashboard = () => {
    navigate("/home");
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
            <BrandGlyph size={34} />
            <h4 className="text-xl font-bold ml-3 text-white">
              Admin Portal
            </h4>
          </div>

          {/* Menu Items */}
          <ul className="flex flex-col space-y-1">

            {/* Dashboard (Home) */}
            <li className="w-full">
              <button
                onClick={handleDashboard}
                className="w-full flex items-center px-4 py-3 text-left text-white hover:bg-blue-700 rounded-lg transition-all duration-200 font-medium"
              >
                <FiHome className="w-5 h-5 mr-3" />
                Dashboard
              </button>
            </li>

            {/* HOD Management */}
            <li className="w-full">
              <div
                className={`flex justify-between items-center cursor-pointer px-4 py-3 w-full hover:bg-blue-700 rounded-lg transition-all duration-200 ${hodDropdownOpen ? 'bg-blue-700' : ''}`}
                onClick={toggleHodDropdown}
              >
                <div className="flex items-center">
                  <FiBriefcase className="w-5 h-5 mr-3" />
                  <span className="font-medium">HOD</span>
                </div>
                <FiChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${hodDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
              {hodDropdownOpen && (
                <div className="mt-1 ml-6 pl-6 border-l-2 border-blue-500 space-y-1">
                  <button
                    onClick={handleHODList}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiUsers className="w-4 h-4 mr-2" />
                    HOD List
                  </button>
                  <button
                    onClick={handleAddHOD}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiUserPlus className="w-4 h-4 mr-2" />
                    Add HOD
                  </button>
                </div>
              )}
            </li>

            {/* Faculty */}
            <li className="w-full">
              <div
                className={`flex justify-between items-center cursor-pointer px-4 py-3 w-full hover:bg-blue-700 rounded-lg transition-all duration-200 ${facultyDropdownOpen ? 'bg-blue-700' : ''}`}
                onClick={toggleFacultyDropdown}
              >
                <div className="flex items-center">
                  <FiUsers className="w-5 h-5 mr-3" />
                  <span className="font-medium">Faculty</span>
                </div>
                <FiChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${facultyDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
              {facultyDropdownOpen && (
                <div className="mt-1 ml-6 pl-6 border-l-2 border-blue-500 space-y-1">
                  <button
                    onClick={handleFacultyList}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiUsers className="w-4 h-4 mr-2" />
                    Faculty List
                  </button>
                  <button
                    onClick={handleAddFaculty}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiUserPlus className="w-4 h-4 mr-2" />
                    Add Faculty
                  </button>
                </div>
              )}
            </li>

            {/* Student Management */}
            <li className="w-full">
              <div
                className={`flex justify-between items-center cursor-pointer px-4 py-3 w-full hover:bg-blue-700 rounded-lg transition-all duration-200 ${studentDropdownOpen ? 'bg-blue-700' : ''}`}
                onClick={toggleStudentDropdown}
              >
                <div className="flex items-center">
                  <FiUserCheck className="w-5 h-5 mr-3" />
                  <span className="font-medium">Students</span>
                </div>
                <FiChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${studentDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
              {studentDropdownOpen && (
                <div className="mt-1 ml-6 pl-6 border-l-2 border-blue-500 space-y-1">
                  <button
                    onClick={handleStudentList}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiUsers className="w-4 h-4 mr-2" />
                    Student List
                  </button>
                  <button
                    onClick={handleBlockedStudents}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiLock className="w-4 h-4 mr-2" />
                    Blocked Students
                  </button>
                </div>
              )}
            </li>

            {/* Admin */}
            <li className="w-full">
              <div
                className={`flex justify-between items-center cursor-pointer px-4 py-3 w-full hover:bg-blue-700 rounded-lg transition-all duration-200 ${adminDropdownOpen ? 'bg-blue-700' : ''}`}
                onClick={toggleAdminDropdown}
              >
                <div className="flex items-center">
                  <FiShield className="w-5 h-5 mr-3" />
                  <span className="font-medium">Admin</span>
                </div>
                <FiChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${adminDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
              {adminDropdownOpen && (
                <div className="mt-1 ml-6 pl-6 border-l-2 border-blue-500 space-y-1">
                  <button
                    onClick={handleAdminList}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiUsers className="w-4 h-4 mr-2" />
                    Admin List
                  </button>
                  <button
                    onClick={handleAdminCreate}
                    className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:bg-blue-700 rounded-lg transition-all duration-200"
                  >
                    <FiUserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                  </button>
                </div>
              )}
            </li>

            {/* Send Notification */}
            <li className="w-full">
              <button
                onClick={handleSendNotification}
                className="w-full flex items-center px-4 py-3 text-left text-white hover:bg-blue-700 rounded-lg transition-all duration-200 font-medium"
              >
                <FiBell className="w-5 h-5 mr-3" />
                Send Notification
              </button>
            </li>

            {/* Notification History */}
            <li className="w-full">
              <button
                onClick={() => {
                  navigate("/admin/notification-history");
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-white hover:bg-blue-700 rounded-lg transition-all duration-200 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Notification History
              </button>
            </li>

            {/* NOC Management */}
            <li className="w-full">
              <button
                onClick={() => {
                  navigate("/admin/manage-noc");
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-white hover:bg-blue-700 rounded-lg transition-all duration-200 font-medium"
              >
                <FiFileText className="w-7 h-7 mr-3" />
                NOC Requests
              </button>
            </li>

            {/* Aptitude Tests */}
            <li className="w-full">
              <button
                onClick={() => {
                  navigate("/admin/aptitude-tests");
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-white hover:bg-blue-700 rounded-lg transition-all duration-200 font-medium"
              >
                <FiClipboard className="w-5 h-5 mr-3" />
                Aptitude Tests
              </button>
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
