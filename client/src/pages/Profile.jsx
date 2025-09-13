// src/pages/Profile.jsx
import AdminProfile from "./AdminProfile";
import FacultyProfile from "./FacultyProfile";
import StudentProfile from "./StudentProfile";

const Profile = () => {
  const role = JSON.parse(sessionStorage.getItem("user"))?.role;

  if (role === "admin") return <AdminProfile />;
  if (role === "faculty") return <FacultyProfile />;
  if (role === "student") return <StudentProfile />;
  
  return <div>No valid role found.</div>;
};

export default Profile;
