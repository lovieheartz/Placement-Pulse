import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { API_BASE } from '../config/api';
import 'react-toastify/dist/ReactToastify.css';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
import './Dashboard.css';

const FacultyList = () => {
  const { user } = useContext(AuthContext);
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
      const { data } = await axios.get(`${API_BASE}/faculty/all-faculties`);
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
      const { data } = await axios.get(`${API_BASE}/admin/profile`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  const { mutate: deleteFacultyMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (facultyId) => {
      const { data } = await axios.delete(`${API_BASE}/faculty/delete/${facultyId}`);
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

  const filteredFaculties = facultyData.filter((faculty) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      faculty.name.toLowerCase().includes(searchLower) ||
      faculty.email.toLowerCase().includes(searchLower) ||
      (faculty.course && faculty.course.toLowerCase().includes(searchLower)) ||
      (faculty.department && faculty.department.toLowerCase().includes(searchLower))
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
    <PortalLayout role="admin" title="Faculty" user={profileData || user}>
          <PageHeader
            title="Faculty Management"
            subtitle="Manage all faculty members in the portal"
            icon={Users}
            actions={
              <>
                <form className="w-full sm:w-64">
                  <Input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search faculty..."
                  />
                </form>
                <Button onClick={handleAddFaculty} className="whitespace-nowrap">
                  <UserPlus /> Add Faculty
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
                    <th className="px-3 py-2.5 font-semibold">Course</th>
                    <th className="px-3 py-2.5 font-semibold">Department</th>
                    <th className="px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculties.length > 0 ? (
                    filteredFaculties.map((faculty) => (
                      <tr key={faculty._id} className="border-b border-border/60 hover:bg-accent/40 transition-colors">
                        <td className="px-3 py-3">
                          {faculty.avatar ? (
                            <img
                              src={resolveFileUrl(faculty.avatar)}
                              alt={faculty.name}
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full text-xs text-muted-foreground">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{faculty.name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{faculty.email}</td>
                        <td className="px-3 py-3 text-muted-foreground">{faculty.phone || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{faculty.course || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{faculty.department || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => navigate(`/admin/edit-faculty/${faculty._id}`)}
                              variant="outline"
                              size="sm"
                              disabled={isDeleting}
                            >
                              <Pencil /> Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteFaculty(faculty._id)}
                              variant="destructive"
                              size="sm"
                              disabled={isDeleting}
                            >
                              <Trash2 /> {isDeleting ? 'Deleting...' : 'Remove'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-3 py-8">
                        <EmptyState
                          icon={Users}
                          title={searchTerm ? 'No matching faculty found' : 'No faculty members found'}
                          description={searchTerm ? 'Try a different search term.' : 'Add your first faculty member to get started.'}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>
    </PortalLayout>
  );
};

export default FacultyList;
