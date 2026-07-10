import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, UserPlus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
import { API_BASE } from '../config/api';
import './Dashboard.css';

const AdminList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

  const {
    data: profileData,
  } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/admin/profile`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  const {
    data: adminData = [],
    isLoading: isFetchingAdmins,
    isError: isFetchError,
    error: fetchError,
  } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get(`${API_BASE}/admin/all-admins`, {
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
      const { data } = await axios.delete(`${API_BASE}/admin/${adminId}`, {
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
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex justify-between items-center border-b border-border p-4">
            <h3 className="text-xl font-semibold text-destructive">Delete Admin Account</h3>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-4 text-foreground">
            {selectedAdmin && (
              <>
                <p className="mb-2">You are about to delete <strong>{selectedAdmin.name}</strong>'s admin account.</p>
                <p className="mb-4 text-muted-foreground">This action cannot be undone.</p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button
              onClick={() => setShowDeleteModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteAdmin}
              variant="destructive"
            >
              Delete Admin
            </Button>
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
    <PortalLayout role="admin" title="Admins" user={profileData || user}>
          <PageHeader
            title="Admin Management"
            subtitle="Manage administrator accounts"
            icon={ShieldCheck}
            actions={
              <>
                <form className="w-full sm:w-64">
                  <Input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search admins..."
                  />
                </form>
                <Button onClick={handleAddAdmin} className="whitespace-nowrap">
                  <UserPlus /> Add Admin
                </Button>
              </>
            }
          />
          <GlassPanel className="p-0 sm:p-0">
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold">Avatar</th>
                    <th className="px-3 py-2.5 font-semibold">Name</th>
                    <th className="px-3 py-2.5 font-semibold">Email</th>
                    <th className="px-3 py-2.5 font-semibold">Phone</th>
                    <th className="px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.length > 0 ? (
                    filteredAdmins.map((admin) => (
                      <tr key={admin._id} className="border-b border-border/60 hover:bg-accent/40 transition-colors">
                        <td className="px-3 py-3">
                          {admin.avatar ? (
                            <img
                              src={resolveFileUrl(admin.avatar)}
                              alt={admin.name}
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full text-xs text-muted-foreground">
                              {admin.name?.charAt(0)?.toUpperCase() || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{admin.name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{admin.email}</td>
                        <td className="px-3 py-3 text-muted-foreground">{admin.phone || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => handleDeleteAdmin(admin)}
                              variant="destructive"
                              size="sm"
                              disabled={isDeleting || user.email === admin.email} // Prevent deleting yourself
                            >
                              <Trash2 /> {isDeleting ? 'Deleting...' : 'Remove'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-3 py-8">
                        <EmptyState
                          icon={ShieldCheck}
                          title={searchTerm ? 'No matching admins found' : 'No admins found'}
                          description={searchTerm ? 'Try a different search term.' : 'Add your first admin to get started.'}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>
      <DeleteAdminModal />
    </PortalLayout>
  );
};

export default AdminList;