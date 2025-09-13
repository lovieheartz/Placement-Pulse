import React, { useContext, useState } from 'react';
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

const BlockedStudents = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
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
    queryKey: ['blockedStudents'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get('http://localhost:3001/admin/students/blocked', {
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

  const { mutate: unblockStudentMutation, isPending: isUnblocking } = useMutation({
    mutationFn: async (studentId) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`http://localhost:3001/admin/students/${studentId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onMutate: async (studentId) => {
      await queryClient.cancelQueries(['blockedStudents']);
      const previousStudents = queryClient.getQueryData(['blockedStudents']);
      queryClient.setQueryData(['blockedStudents'], (old) =>
        old ? old.filter(s => s._id !== studentId) : []
      );
      return { previousStudents };
    },
    onError: (err, studentId, context) => {
      toast.error(err.response?.data?.message || 'Failed to unblock student');
      if (context?.previousStudents) {
        queryClient.setQueryData(['blockedStudents'], context.previousStudents);
      }
    },
    onSuccess: () => {
      toast.success('Student unblocked successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries(['blockedStudents']);
      queryClient.invalidateQueries(['students']);
    },
  });

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
        <div className="text-xl">Loading blocked students data...</div>
      </div>
    );
  }

  if (isFetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h2 className="text-2xl text-red-600 mb-4">Error: {fetchError.message}</h2>
        <button
          onClick={() => queryClient.invalidateQueries(['blockedStudents'])}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold text-gray-800">Blocked Students</h1>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <form className="w-full sm:w-64">
                  <input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search blocked students..."
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
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Blocked Date</th>
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
                        <td className="px-3 py-3 text-gray-600">
                          {student.blockedAt ? new Date(student.blockedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleUnblockStudent(student)}
                              className="text-green-600 hover:text-green-800 flex items-center gap-1"
                              disabled={isUnblocking}
                            >
                              {isUnblocking ? '⏳ Processing...' : '✓ Unblock'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-3 py-3 text-center text-gray-500">
                        {searchTerm ? 'No matching blocked students found' : 'No blocked students found'}
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
      <UnblockStudentModal />
    </div>
  );
};

export default BlockedStudents;