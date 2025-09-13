import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';
import CreateFaculty from "./pages/CreateFaculty";
import CreateAdmin from "./pages/CreateAdmin";
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminCreateAdmin from './pages/AdminCreateAdmin';
import ProtectedRoute from './pages/ProtectedRoute';
import FacultyList from './pages/FacultyList';
import AddFaculty from './pages/AddFaculty';
import './index.css';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from "./pages/Profile"; 
import EditFaculty from './pages/EditFaculty';
import StudentList from './pages/StudentList';
import BlockedStudents from './pages/BlockedStudents';
import AdminList from './pages/AdminList';
import AddAdmin from './pages/AddAdmin';
import SendNotification from './pages/SendNotification';
import StudentNotifications from './pages/StudentNotifications';
import ApplyNOC from './pages/ApplyNOC';
import TrackNOC from './pages/TrackNOC';
import ManageNOC from './pages/ManageNOC';
import StudentProfileDashboard from './pages/StudentProfile/StudentProfileDashboard';
import StudentProfileEdit from './pages/StudentProfile/StudentProfileEdit';

// ✅ Optional: Add React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <Routes>
        {/* Public routes */}
        <Route path='/' element={<Signup />} />
        <Route path='/student' element={<Signup />} />
        <Route path='/login' element={<Login />} />
        <Route path='/create-admin' element={<CreateAdmin />} />
        <Route path='/admin/create-admin' element={<ProtectedRoute><AdminCreateAdmin /></ProtectedRoute>} />
        <Route path='/faculty/create-faculty' element={<CreateFaculty />} />
        {/* <Route path='/faculty/add-faculty' element={<AddFaculty />} />
        <Route path='/admin/faculty' element={<FacultyList />} />  */}
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />

        {/* Protected routes */}
        <Route path='/home' element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path='/student-dashboard' element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path='/faculty-dashboard' element={<ProtectedRoute><FacultyDashboard /></ProtectedRoute>} />
        <Route path='/admin/faculty' element={<ProtectedRoute><FacultyList /></ProtectedRoute>} />
        <Route path='/faculty/add-faculty' element={<ProtectedRoute><AddFaculty /></ProtectedRoute>} />
        <Route path="/admin/edit-faculty/:id" element={<ProtectedRoute><EditFaculty /></ProtectedRoute>} />
        <Route path='/admin/students' element={<ProtectedRoute><StudentList /></ProtectedRoute>} />
        <Route path='/admin/students/blocked' element={<ProtectedRoute><BlockedStudents /></ProtectedRoute>} />
        <Route path='/admin/admins' element={<ProtectedRoute><AdminList /></ProtectedRoute>} />
        <Route path='/admin/add-admin' element={<ProtectedRoute><AddAdmin /></ProtectedRoute>} />
        <Route path='/admin/send-notification' element={<ProtectedRoute><SendNotification /></ProtectedRoute>} />
        <Route path='/student/notifications' element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />
        <Route path='/student/notifications/:source' element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />
        <Route path='/student/apply-noc' element={<ProtectedRoute><ApplyNOC /></ProtectedRoute>} />
        <Route path='/student/track-noc' element={<ProtectedRoute><TrackNOC /></ProtectedRoute>} />
        <Route path='/admin/manage-noc' element={<ProtectedRoute><ManageNOC /></ProtectedRoute>} />
        <Route path='/student/profile' element={<ProtectedRoute><StudentProfileDashboard /></ProtectedRoute>} />
        <Route path='/student/profile/edit' element={<ProtectedRoute><StudentProfileEdit /></ProtectedRoute>} />
      </Routes>

      {/* ✅ Add React Query DevTools at the bottom */}
      <ReactQueryDevtools initialIsOpen={false} />
    </BrowserRouter>
  );
}

export default App;
