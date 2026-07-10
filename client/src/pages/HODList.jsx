import { useContext } from 'react';
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
import { Building2, UserPlus, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
import './Dashboard.css';

const HODList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

  const {
    data: hodData = [],
    isLoading: isFetchingHODs,
    isError: isFetchError,
    error: fetchError,
    refetch: refetchHODs,
  } = useQuery({
    queryKey: ['hods'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/admin/all-hods`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
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

  const { mutate: deleteHODMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (hodId) => {
      const { data } = await axios.delete(`${API_BASE}/admin/hod/${hodId}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data;
    },
    onMutate: async (hodId) => {
      await queryClient.cancelQueries(['hods']);
      const previousHODs = queryClient.getQueryData(['hods']);
      queryClient.setQueryData(['hods'], (old) =>
        old ? old.filter((h) => h._id !== hodId) : []
      );
      return { previousHODs };
    },
    onError: (err, hodId, context) => {
      toast.error(err.response?.data?.message || 'Failed to delete HOD');
      if (context?.previousHODs) {
        queryClient.setQueryData(['hods'], context.previousHODs);
      }
    },
    onSuccess: () => {
      toast.success('HOD deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries(['hods']);
    },
  });

  const handleDeleteHOD = (hodId) => {
    if (window.confirm('Are you sure you want to delete this HOD?')) {
      deleteHODMutation(hodId);
    }
  };

  const handleAddHOD = () => navigate('/admin/add-hod');

  const filteredHODs = hodData.filter((hod) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      hod.name.toLowerCase().includes(searchLower) ||
      hod.email.toLowerCase().includes(searchLower) ||
      (hod.department && hod.department.toLowerCase().includes(searchLower))
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

  if (isFetchingHODs) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading HOD data...</div>
      </div>
    );
  }

  if (isFetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h2 className="text-2xl text-red-600 mb-4">Error: {fetchError.message}</h2>
        <button
          onClick={() => refetchHODs()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <PortalLayout role="admin" title="HODs" user={profileData || user}>
          <PageHeader
            title="HOD Management"
            subtitle="Manage all Heads of Department"
            icon={Building2}
            actions={
              <>
                <form className="w-full sm:w-64">
                  <Input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search HOD..."
                  />
                </form>
                <Button onClick={handleAddHOD} className="whitespace-nowrap">
                  <UserPlus /> Add HOD
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
                    <th className="px-3 py-2.5 font-semibold">Course</th>
                    <th className="px-3 py-2.5 font-semibold">Department</th>
                    <th className="px-3 py-2.5 font-semibold">Phone</th>
                    <th className="px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHODs.length > 0 ? (
                    filteredHODs.map((hod) => (
                      <tr key={hod._id} className="border-b border-border/60 hover:bg-accent/40 transition-colors">
                        <td className="px-3 py-3">
                          {hod.avatar ? (
                            <img
                              src={resolveFileUrl(hod.avatar)}
                              alt={hod.name}
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full text-xs text-muted-foreground">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{hod.name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{hod.email}</td>
                        <td className="px-3 py-3 text-muted-foreground">{hod.course || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {hod.department === 'Other' ? hod.otherDepartment : hod.department}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{hod.phone || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => navigate(`/admin/edit-hod/${hod._id}`)}
                              variant="outline"
                              size="sm"
                              disabled={isDeleting}
                            >
                              <Pencil /> Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteHOD(hod._id)}
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
                          icon={Building2}
                          title={searchTerm ? 'No matching HODs found' : 'No HODs found'}
                          description={searchTerm ? 'Try a different search term.' : 'Add your first HOD to get started.'}
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

export default HODList;
