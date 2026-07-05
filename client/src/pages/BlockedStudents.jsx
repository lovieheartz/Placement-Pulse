import React, { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldBan, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
// Using Tailwind instead of React Bootstrap
import './Dashboard.css';

const BlockedStudents = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

  const {
    data: profileData,
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
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl w-full max-w-md mx-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-border p-4">
            <h3 className="text-xl font-semibold text-success">Unblock Student Account</h3>
            <button
              onClick={() => setShowUnblockModal(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-4 text-foreground">
            {selectedStudent && (
              <>
                <p className="mb-2">You are about to unblock <strong>{selectedStudent.name}</strong>'s account.</p>
                <p className="text-muted-foreground">This will restore their access to the placement portal.</p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button
              onClick={() => setShowUnblockModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUnblockStudent}
              variant="success"
            >
              Unblock Student
            </Button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <PortalLayout role="admin" title="Blocked Students" user={profileData || user}>
          <PageHeader
            title="Blocked Students"
            subtitle="Students currently blocked from the portal"
            icon={ShieldBan}
            actions={
              <form className="w-full sm:w-64">
                <Input
                  {...registerSearch('search')}
                  type="text"
                  placeholder="Search blocked students..."
                />
              </form>
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
                    <th className="px-3 py-2.5 font-semibold">Branch</th>
                    <th className="px-3 py-2.5 font-semibold">Passout Year</th>
                    <th className="px-3 py-2.5 font-semibold">Blocked Date</th>
                    <th className="px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className="border-b border-border/60 hover:bg-accent/40 transition-colors">
                        <td className="px-3 py-3">
                          {student.avatar ? (
                            <img
                              src={resolveFileUrl(student.avatar)}
                              alt={student.name}
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full text-xs text-muted-foreground">
                              {student.name?.charAt(0)?.toUpperCase() || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{student.name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.email}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.course || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.branch || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.passoutYear || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {student.blockedAt ? new Date(student.blockedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => handleUnblockStudent(student)}
                              variant="success"
                              size="sm"
                              disabled={isUnblocking}
                            >
                              <CheckCircle2 /> {isUnblocking ? 'Processing...' : 'Unblock'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-3 py-8">
                        <EmptyState
                          icon={ShieldBan}
                          title={searchTerm ? 'No matching blocked students found' : 'No blocked students found'}
                          description={searchTerm ? 'Try a different search term.' : 'No students are currently blocked.'}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>
      <UnblockStudentModal />
    </PortalLayout>
  );
};

export default BlockedStudents;