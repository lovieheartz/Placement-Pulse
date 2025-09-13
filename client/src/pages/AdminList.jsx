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
import './Dashboard.css';

const AdminList = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const {
    data: adminData = [],
    isLoading: isFetchingAdmins,
    isError: isFetchError,
    error: fetchError,
  } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get('http://localhost:3001/admin/all-admins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received from server');
      }
      return data.data;
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 0,
  });

  const { mutate: deleteAdminMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (adminId) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.delete(`http://localhost:3001/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onMutate: async (adminId) => {
      await queryClient.cancelQueries(['admins']);
      const previousAdmins = queryClient.getQueryData(['admins']);
      queryClient.setQueryData(['admins'], (old) =>
        old ? old.filter((a) => a._id !== adminId) : []
      );
      return { previousAdmins };
    },
    onError: (err, adminId, context) => {
      toast.error(err.response?.data?.message || 'Failed to delete admin');
      if (context?.previousAdmins) {
        queryClient.setQueryData(['admins'], context.previousAdmins);
      }
    },
    onSuccess: () => {
      toast.success('Admin deleted successfully', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      setShowDeleteModal(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['admins']);
    },
  });

  const handleDeleteAdmin = (admin) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const confirmDeleteAdmin = () => {
    if (selectedAdmin) {
      deleteAdminMutation(selectedAdmin._id);
    }
  };

  const handleAddAdmin = () => navigate('/admin/add-admin');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const filteredAdmins = adminData.filter((admin) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      admin.name?.toLowerCase().includes(searchLower) ||
      admin.email?.toLowerCase().includes(searchLower) ||
      admin.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Delete Admin Modal
  const DeleteAdminModal = () => (
    showDeleteModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex justify-between items-center border-b p-4">
            <h3 className="text-xl font-semibold text-red-600">Delete Admin Account</h3>
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {/* Body */}
          <div className="p-4">
            {selectedAdmin && (
              <>
                <p className="mb-2">You are about to delete <strong>{selectedAdmin.name}</strong>'s admin account.</p>
                <p className="mb-4">This action cannot be undone.</p>
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-2 border-t p-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteAdmin}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Admin
            </button>
          </div>
        </div>
      </div>
    )
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">You are not logged in</h1>
        <p className="text-lg text-gray-600 mb-6">Please login to access your dashboard.</p>
      </div>
    );
  }

  if (isFetchingAdmins) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading admin data...</div>
      </div>
    );
  }

  if (isFetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h2 className="text-2xl text-red-600 mb-4">Error: {fetchError.message}</h2>
        <button
          onClick={() => queryClient.invalidateQueries(['admins'])}
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
              <h1 className="text-xl font-semibold text-gray-800">Admin Management</h1>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <form className="w-full sm:w-64">
                  <input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search admins..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </form>
                <button
                  onClick={handleAddAdmin}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base whitespace-nowrap"
                >
                  ➕ Add Admin
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
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Phone</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAdmins.length > 0 ? (
                    filteredAdmins.map((admin) => (
                      <tr key={admin._id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          {admin.avatar ? (
                            <img
                              src={`http://localhost:3001${admin.avatar}`}
                              alt={admin.name}
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full text-xs text-gray-600">
                              {admin.name?.charAt(0)?.toUpperCase() || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-900">{admin.name}</td>
                        <td className="px-3 py-3 text-gray-600">{admin.email}</td>
                        <td className="px-3 py-3 text-gray-600">{admin.phone || '-'}</td>
                        <td className="px-3 py-3 text-gray-600">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleDeleteAdmin(admin)}
                              className="text-red-600 hover:text-red-800 flex items-center gap-1"
                              disabled={isDeleting || user.email === admin.email} // Prevent deleting yourself
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
                        {searchTerm ? 'No matching admins found' : 'No admins found'}
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
      <DeleteAdminModal />
    </div>
  );
};

export default AdminList;