import React, { useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';
// Using Tailwind instead of React Bootstrap
import './Dashboard.css';

const StudentList = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const {
    data: studentData = [],
    isLoading: isFetchingStudents,
    isError: isFetchError,
    error: fetchError,
  } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get('http://localhost:3001/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received from server');
      }
      return data.data;
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 0, // Always refetch when invalidated
  });

  const { mutate: blockStudentMutation, isPending: isBlocking } = useMutation({
    mutationFn: async ({ studentId, reason }) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`http://localhost:3001/admin/students/${studentId}/block`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onMutate: async ({ studentId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['students']);
      
      // Snapshot the previous value
      const previousStudents = queryClient.getQueryData(['students']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['students'], (old) =>
        old ? old.map(s => s._id === studentId ? { ...s, isBlocked: true } : s) : []
      );
      
      return { previousStudents };
    },
    onError: (err, studentId, context) => {
      toast.error(err.response?.data?.message || 'Failed to block student');
      // If there was an error, roll back to the previous value
      if (context?.previousStudents) {
        queryClient.setQueryData(['students'], context.previousStudents);
      }
    },
    onSuccess: () => {
      toast.success('Student blocked successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries(['students']);
    },
  });

  const { mutate: unblockStudentMutation, isPending: isUnblocking } = useMutation({
    mutationFn: async (studentId) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`http://localhost:3001/admin/students/${studentId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onMutate: async (studentId) => {
      await queryClient.cancelQueries(['students']);
      const previousStudents = queryClient.getQueryData(['students']);
      queryClient.setQueryData(['students'], (old) =>
        old ? old.map(s => s._id === studentId ? { ...s, isBlocked: false } : s) : []
      );
      return { previousStudents };
    },
    onError: (err, studentId, context) => {
      toast.error(err.response?.data?.message || 'Failed to unblock student');
      if (context?.previousStudents) {
        queryClient.setQueryData(['students'], context.previousStudents);
      }
    },
    onSuccess: () => {
      toast.success('Student unblocked successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries(['students']);
    },
  });

  const handleBlockStudent = (student) => {
    setSelectedStudent(student);
    setBlockReason('');
    setShowBlockModal(true);
    // Focus the textarea after a short delay to ensure the modal is rendered
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 100);
  };

  const confirmBlockStudent = () => {
    if (selectedStudent && blockReason.trim()) {
      blockStudentMutation({ studentId: selectedStudent._id, reason: blockReason });
      setShowBlockModal(false);
    } else {
      toast.error('Please provide a reason for blocking the student');
    }
  };
  
  // Function to handle textarea clicks and prevent propagation
  const handleTextareaClick = (e) => {
    e.stopPropagation();
  };
  
  // Use a ref for the textarea to maintain proper cursor position
  const textareaRef = useRef(null);

  const handleUnblockStudent = (student) => {
    setSelectedStudent(student);
    setShowUnblockModal(true);
  };

  const confirmUnblockStudent = () => {
    if (selectedStudent) {
      unblockStudentMutation(selectedStudent._id);
      setShowUnblockModal(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const filteredStudents = studentData.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.course?.toLowerCase().includes(searchLower) ||
      student.branch?.toLowerCase().includes(searchLower) ||
      student.passoutYear?.toString().includes(searchLower)
    );
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">You are not logged in</h1>
        <p className="text-lg text-gray-600 mb-6">Please login to access your dashboard.</p>
      </div>
    );
  }

  if (isFetchingStudents) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading student data...</div>
      </div>
    );
  }

  if (isFetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h2 className="text-2xl text-red-600 mb-4">Error: {fetchError.message}</h2>
        <button
          onClick={() => queryClient.invalidateQueries(['students'])}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Block Student Modal
  const BlockStudentModal = () => (
    showBlockModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-red-600">Block Student Account</h3>
            <button 
              onClick={() => setShowBlockModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {/* Body */}
          <div className="p-4">
            {selectedStudent && (
              <>
                <p className="mb-2">You are about to block <strong>{selectedStudent.name}</strong>'s account.</p>
                <p className="mb-4">This will prevent them from accessing the placement portal.</p>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for blocking <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    rows={3}
                    value={blockReason}
                    onChange={(e) => {
                      // Preserve cursor position by using the ref
                      const cursorPosition = e.target.selectionStart;
                      setBlockReason(e.target.value);
                      // Set timeout to restore cursor position after render
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = cursorPosition;
                          textareaRef.current.selectionEnd = cursorPosition;
                        }
                      }, 0);
                    }}
                    onClick={handleTextareaClick}
                    onFocus={handleTextareaClick}
                    placeholder="Please provide a detailed reason for blocking this student"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This reason will be included in the notification email sent to the student.
                  </p>
                </div>
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-2 border-t p-4">
            <button
              onClick={() => setShowBlockModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmBlockStudent}
              disabled={!blockReason.trim()}
              className={`px-4 py-2 rounded ${!blockReason.trim() ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white`}
            >
              Block Student
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Unblock Student Modal
  const UnblockStudentModal = () => (
    showUnblockModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-green-600">Unblock Student Account</h3>
            <button 
              onClick={() => setShowUnblockModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {/* Body */}
          <div className="p-4">
            {selectedStudent && (
              <>
                <p className="mb-2">You are about to unblock <strong>{selectedStudent.name}</strong>'s account.</p>
                <p>This will restore their access to the placement portal.</p>
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-2 border-t p-4">
            <button
              onClick={() => setShowUnblockModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmUnblockStudent}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Unblock Student
            </button>
          </div>
        </div>
      </div>
    )
  );

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

        <div className="content-container px-3 py-4 w-full mx-auto max-w-full">
          <div className="bg-white rounded-xl shadow-sm px-4 py-4 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h1 className="text-xl font-semibold text-gray-800">Student Management</h1>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <form className="w-full sm:w-64">
                  <input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search students..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </form>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Avatar</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Course</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Branch</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Passout Year</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          {student.avatar ? (
                            <img
                              src={`http://localhost:3001${student.avatar}`}
                              alt={student.name}
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full text-xs text-gray-600">
                              {student.name?.charAt(0)?.toUpperCase() || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-900">{student.name}</td>
                        <td className="px-3 py-3 text-gray-600">{student.email}</td>
                        <td className="px-3 py-3 text-gray-600">{student.course || '-'}</td>
                        <td className="px-3 py-3 text-gray-600">{student.branch || '-'}</td>
                        <td className="px-3 py-3 text-gray-600">{student.passoutYear || '-'}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {student.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          <div className="flex flex-wrap gap-2">
                            {student.isBlocked ? (
                              <button
                                onClick={() => handleUnblockStudent(student)}
                                className="text-green-600 hover:text-green-800 flex items-center gap-1"
                                disabled={isUnblocking}
                              >
                                {isUnblocking ? '⏳ Processing...' : '✓ Unblock'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockStudent(student)}
                                className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                disabled={isBlocking}
                              >
                                {isBlocking ? '⏳ Processing...' : '🚫 Block'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-3 py-3 text-center text-gray-500">
                        {searchTerm ? 'No matching students found' : 'No students found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Footer />
      </div>
      <BlockStudentModal />
      <UnblockStudentModal />
    </div>
  );
};

export default StudentList;