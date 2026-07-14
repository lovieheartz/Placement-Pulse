import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';
import CreateFaculty from "./pages/CreateFaculty";
import CreateAdmin from "./pages/CreateAdmin";
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminCreateAdmin from './pages/AdminCreateAdmin';
import ProtectedRoute from './pages/ProtectedRoute';
import ErrorBoundary from './components/app/ErrorBoundary';
import FacultyList from './pages/FacultyList';
import AddFaculty from './pages/AddFaculty';
import './index.css';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from "./pages/Profile"; 
import EditFaculty from './pages/EditFaculty';
import StudentList from './pages/StudentList';
import StudentDetail from './pages/StudentDetail';
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
import AcademicRecords from './pages/StudentProfile/AcademicRecords';
import StudentAssignments from './pages/StudentAssignments';
import StudentGrades from './pages/StudentGrades';
import FacultyAssignments from './pages/FacultyAssignments';
import AssignmentSubmissions from './pages/AssignmentSubmissions';
import TestResults from './pages/TestResults';
import EditRequests from './pages/EditRequests';
import ResumeAnalyzerPage from './pages/ResumeAnalyzerPage';
import RealtimeInterviewPage from './pages/RealtimeInterviewPage';
import InterviewHistoryPage from './pages/InterviewHistoryPage';
import HODList from './pages/HODList';
import AddHOD from './pages/AddHOD';
import EditHOD from './pages/EditHOD';
import HODDashboard from './pages/HODDashboard';
import HODFacultyList from './pages/HODFacultyList';
import AddFacultyByHOD from './pages/AddFacultyByHOD';
import HODProfile from './pages/HODProfile';
import HODStudents from './pages/HODStudents';
import HODBlockedStudents from './pages/HODBlockedStudents';
import HODSendNotification from './pages/HODSendNotification';
import FacultyStudentList from './pages/FacultyStudentList';
import FacultyProfile from './pages/FacultyProfile';
import NotificationHistory from './pages/NotificationHistory';
import HODNotificationHistory from './pages/HODNotificationHistory';

// Aptitude Test System Pages
import AptitudeTestList from './pages/AptitudeTestList';
import CreateAptitudeTest from './pages/CreateAptitudeTest';
import EditAptitudeTest from './pages/EditAptitudeTest';
import AptitudeTestAnalytics from './pages/AptitudeTestAnalytics';
import StudentTestPortal from './pages/StudentTestPortal';
import StudentTestHistory from './pages/StudentTestHistory';
import TestInstructions from './pages/TestInstructions';
import TakeTest from './pages/TakeTest';
import TestResult from './pages/TestResult';

// ✅ Optional: Add React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={2600}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path='/' element={<LandingPage />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/register' element={<Signup />} />
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
        <Route path='/student/dashboard' element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path='/faculty-dashboard' element={<ProtectedRoute><FacultyDashboard /></ProtectedRoute>} />
        <Route path='/faculty/students' element={<ProtectedRoute><FacultyStudentList /></ProtectedRoute>} />
        <Route path='/faculty/students/:studentId' element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
        <Route path='/faculty/edit-requests' element={<ProtectedRoute><EditRequests /></ProtectedRoute>} />
        <Route path='/faculty/assignments' element={<ProtectedRoute><FacultyAssignments /></ProtectedRoute>} />
        <Route path='/faculty/assignments/:id' element={<ProtectedRoute><AssignmentSubmissions /></ProtectedRoute>} />
        <Route path='/faculty/profile' element={<ProtectedRoute><FacultyProfile /></ProtectedRoute>} />
        <Route path='/admin/faculty' element={<ProtectedRoute><FacultyList /></ProtectedRoute>} />
        <Route path='/admin/add-faculty' element={<ProtectedRoute><AddFaculty /></ProtectedRoute>} />
        <Route path='/faculty/add-faculty' element={<ProtectedRoute><AddFaculty /></ProtectedRoute>} />
        <Route path="/admin/edit-faculty/:id" element={<ProtectedRoute><EditFaculty /></ProtectedRoute>} />
        <Route path='/admin/students' element={<ProtectedRoute><StudentList /></ProtectedRoute>} />
        <Route path='/admin/students/blocked' element={<ProtectedRoute><BlockedStudents /></ProtectedRoute>} />
        <Route path='/admin/students/:studentId' element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
        <Route path='/admin/edit-requests' element={<ProtectedRoute><EditRequests /></ProtectedRoute>} />
        <Route path='/admin/admins' element={<ProtectedRoute><AdminList /></ProtectedRoute>} />
        <Route path='/admin/add-admin' element={<ProtectedRoute><AddAdmin /></ProtectedRoute>} />
        <Route path='/admin/send-notification' element={<ProtectedRoute><SendNotification /></ProtectedRoute>} />
        <Route path='/admin/notification-history' element={<ProtectedRoute><NotificationHistory /></ProtectedRoute>} />
        <Route path='/student/notifications' element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />
        <Route path='/student/notifications/:source' element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />
        <Route path='/student/apply-noc' element={<ProtectedRoute><ApplyNOC /></ProtectedRoute>} />
        <Route path='/student/track-noc' element={<ProtectedRoute><TrackNOC /></ProtectedRoute>} />
        <Route path='/admin/manage-noc' element={<ProtectedRoute><ManageNOC /></ProtectedRoute>} />
        <Route path='/student/profile' element={<ProtectedRoute><StudentProfileDashboard /></ProtectedRoute>} />
        <Route path='/student/profile/edit' element={<ProtectedRoute><StudentProfileEdit /></ProtectedRoute>} />
        <Route path='/student/academic-records' element={<ProtectedRoute><AcademicRecords /></ProtectedRoute>} />
        <Route path='/student/assignments' element={<ProtectedRoute><StudentAssignments /></ProtectedRoute>} />
        <Route path='/student/grades' element={<ProtectedRoute><StudentGrades /></ProtectedRoute>} />
        <Route path='/student/resume-analyzer' element={<ProtectedRoute><ResumeAnalyzerPage /></ProtectedRoute>} />
        <Route path='/student/mock-interview' element={<ProtectedRoute><RealtimeInterviewPage /></ProtectedRoute>} />
        {/* HOD Routes */}
        <Route path='/admin/hods' element={<ProtectedRoute><HODList /></ProtectedRoute>} />
        <Route path='/admin/add-hod' element={<ProtectedRoute><AddHOD /></ProtectedRoute>} />
        <Route path='/admin/edit-hod/:id' element={<ProtectedRoute><EditHOD /></ProtectedRoute>} />
        <Route path='/hod/dashboard' element={<ProtectedRoute><HODDashboard /></ProtectedRoute>} />
        <Route path='/hod/faculties' element={<ProtectedRoute><HODFacultyList /></ProtectedRoute>} />
        <Route path='/hod/add-faculty' element={<ProtectedRoute><AddFacultyByHOD /></ProtectedRoute>} />
        <Route path='/hod/profile' element={<ProtectedRoute><HODProfile /></ProtectedRoute>} />
        <Route path='/hod/students' element={<ProtectedRoute><HODStudents /></ProtectedRoute>} />
        <Route path='/hod/students/:studentId' element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
        <Route path='/hod/edit-requests' element={<ProtectedRoute><EditRequests /></ProtectedRoute>} />
        <Route path='/hod/blocked-students' element={<ProtectedRoute><HODBlockedStudents /></ProtectedRoute>} />
        <Route path='/hod/assignments' element={<ProtectedRoute><FacultyAssignments /></ProtectedRoute>} />
        <Route path='/hod/assignments/:id' element={<ProtectedRoute><AssignmentSubmissions /></ProtectedRoute>} />
        <Route path='/hod/send-notification' element={<ProtectedRoute><HODSendNotification /></ProtectedRoute>} />
        <Route path='/hod/notification-history' element={<ProtectedRoute><HODNotificationHistory /></ProtectedRoute>} />
        <Route path='/student/interview-history' element={<ProtectedRoute><InterviewHistoryPage /></ProtectedRoute>} />

        {/* Aptitude Test System Routes */}
        {/* Admin/HOD/Faculty Routes */}
        <Route path='/admin/aptitude-tests' element={<ProtectedRoute><AptitudeTestList /></ProtectedRoute>} />
        <Route path='/admin/aptitude-tests/create' element={<ProtectedRoute><CreateAptitudeTest /></ProtectedRoute>} />
        <Route path='/admin/aptitude-tests/:id/edit' element={<ProtectedRoute><EditAptitudeTest /></ProtectedRoute>} />
        <Route path='/admin/aptitude-tests/:id/analytics' element={<ProtectedRoute><AptitudeTestAnalytics /></ProtectedRoute>} />
        <Route path='/admin/aptitude-tests/:id/results' element={<ProtectedRoute><TestResults /></ProtectedRoute>} />
        <Route path='/hod/aptitude-tests' element={<ProtectedRoute><AptitudeTestList /></ProtectedRoute>} />
        <Route path='/hod/aptitude-tests/create' element={<ProtectedRoute><CreateAptitudeTest /></ProtectedRoute>} />
        <Route path='/hod/aptitude-tests/:id/edit' element={<ProtectedRoute><EditAptitudeTest /></ProtectedRoute>} />
        <Route path='/hod/aptitude-tests/:id/analytics' element={<ProtectedRoute><AptitudeTestAnalytics /></ProtectedRoute>} />
        <Route path='/hod/aptitude-tests/:id/results' element={<ProtectedRoute><TestResults /></ProtectedRoute>} />
        <Route path='/faculty/aptitude-tests' element={<ProtectedRoute><AptitudeTestList /></ProtectedRoute>} />
        <Route path='/faculty/aptitude-tests/create' element={<ProtectedRoute><CreateAptitudeTest /></ProtectedRoute>} />
        <Route path='/faculty/aptitude-tests/:id/edit' element={<ProtectedRoute><EditAptitudeTest /></ProtectedRoute>} />
        <Route path='/faculty/aptitude-tests/:id/analytics' element={<ProtectedRoute><AptitudeTestAnalytics /></ProtectedRoute>} />
        <Route path='/faculty/aptitude-tests/:id/results' element={<ProtectedRoute><TestResults /></ProtectedRoute>} />

        {/* Student Routes */}
        <Route path='/student/tests' element={<ProtectedRoute><StudentTestPortal /></ProtectedRoute>} />
        <Route path='/student/test-history' element={<ProtectedRoute><StudentTestHistory /></ProtectedRoute>} />
        <Route path='/student/tests/:testId/instructions' element={<ProtectedRoute><TestInstructions /></ProtectedRoute>} />
        <Route path='/student/tests/:testId/take' element={<ProtectedRoute><TakeTest /></ProtectedRoute>} />
        <Route path='/student/tests/:testId/result' element={<ProtectedRoute><TestResult /></ProtectedRoute>} />
      </Routes>
      </ErrorBoundary>

      {/* ✅ Add React Query DevTools at the bottom */}
      <ReactQueryDevtools initialIsOpen={false} />
    </BrowserRouter>
  );
}

export default App;
