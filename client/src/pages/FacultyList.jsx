import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';
import './Dashboard.css';

const FacultyList = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

  const {
    data: facultyData = [],
    isLoading: isFetchingFaculties,
    isError: isFetchError,
    error: fetchError,
    refetch: refetchFaculties,
  } = useQuery({
    queryKey: ['faculties'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:3001/faculty/all-faculties');
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received from server');
      }
      return data.data;
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 0, // Set to 0 to always refetch when invalidated
  });

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:3001/admin/profile', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  const { mutate: deleteFacultyMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (facultyId) => {
      const { data } = await axios.delete(`http://localhost:3001/faculty/delete/${facultyId}`);
      return data.deletedId;
    },
    onMutate: async (facultyId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['faculties']);
      
      // Snapshot the previous value
      const previousFaculties = queryClient.getQueryData(['faculties']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['faculties'], (old) =>
        old ? old.filter((f) => f._id !== facultyId) : []
      );
      
      return { previousFaculties };
    },
    onError: (err, facultyId, context) => {
      toast.error(err.response?.data?.message || 'Failed to delete faculty');
      // If there was an error, roll back to the previous value
      if (context?.previousFaculties) {
        queryClient.setQueryData(['faculties'], context.previousFaculties);
      }
    },
    onSuccess: () => {
      toast.success('Faculty deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries(['faculties']);
    },
  });

  const handleDeleteFaculty = (facultyId) => {
    if (window.confirm('Are you sure you want to delete this faculty member?')) {
      deleteFacultyMutation(facultyId);
    }
  };

  const handleAddFaculty = () => navigate('/faculty/add-faculty');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  

  const filteredFaculties = facultyData.filter((faculty) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      faculty.name.toLowerCase().includes(searchLower) ||
      faculty.email.toLowerCase().includes(searchLower) ||
      (faculty.specialization && faculty.specialization.toLowerCase().includes(searchLower))
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

  if (isFetchingFaculties) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading faculty data...</div>
      </div>
    );
  }

  if (isFetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h2 className="text-2xl text-red-600 mb-4">Error: {fetchError.message}</h2>
        <button
          onClick={() => refetchFaculties()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main">
        <Header user={profileData || user} handleLogout={handleLogout} navigate={navigate} />

        <div className="content-container px-3 py-4 w-full mx-auto max-w-full">
          <div className="bg-white rounded-xl shadow-sm px-4 py-4 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h1 className="text-xl font-semibold text-gray-800">Faculty Management</h1>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <form className="w-full sm:w-64">
                  <input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search faculty..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </form>
                <button
                  onClick={handleAddFaculty}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base whitespace-nowrap"
                >
                  ➕ Add Faculty
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Avatar</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Specialization</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFaculties.length > 0 ? (
                    filteredFaculties.map((faculty) => (
                      <tr key={faculty._id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          {faculty.avatar ? (
                            <img
                              src={`http://localhost:3001${faculty.avatar}`}
                              alt={faculty.name}
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full text-xs text-gray-600">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-900">{faculty.name}</td>
                        <td className="px-3 py-3 text-gray-600">{faculty.email}</td>
                        <td className="px-3 py-3 text-gray-600">
                          {faculty.specialization || '-'}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => navigate(`/admin/edit-faculty/${faculty._id}`)}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              disabled={isDeleting}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFaculty(faculty._id)}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1"
                              disabled={isDeleting}
                            >
                              {isDeleting ? '⏳ Deleting...' : '🗑️ Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-3 py-3 text-center text-gray-500">
                        {searchTerm ? 'No matching faculty found' : 'No faculty members found'}
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
    </div>
  );
};

export default FacultyList;
