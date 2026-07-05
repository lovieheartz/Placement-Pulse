import { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ban, CheckCircle2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';

const HODBlockedStudents = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';
  const passoutYearFilter = watch('passoutYearFilter') || '';

  const {
    data: profileData,
  } = useQuery({
    queryKey: ['hodProfile'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:3001/hod/profile', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  const {
    data: studentsData = [],
    isLoading: isFetchingStudents,
    isError: isFetchError,
    error: fetchError,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['hodBlockedStudents'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:3001/hod/students/blocked', {
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

  const { mutate: unblockStudentMutation, isPending: isUnblocking } = useMutation({
    mutationFn: async (studentId) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`http://localhost:3001/hod/students/${studentId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onMutate: async (studentId) => {
      await queryClient.cancelQueries(['hodBlockedStudents']);
      const previousStudents = queryClient.getQueryData(['hodBlockedStudents']);
      queryClient.setQueryData(['hodBlockedStudents'], (old) =>
        old ? old.filter(s => s._id !== studentId) : []
      );
      return { previousStudents };
    },
    onError: (err, studentId, context) => {
      toast.error(err.response?.data?.message || 'Failed to unblock student');
      if (context?.previousStudents) {
        queryClient.setQueryData(['hodBlockedStudents'], context.previousStudents);
      }
    },
    onSuccess: () => {
      toast.success('Student unblocked successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries(['hodBlockedStudents']);
      queryClient.invalidateQueries(['hodStudents']);
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

  const hodCourse = profileData?.course;
  const hodDepartment = profileData?.department;

  // Get unique passout years for filter
  const uniquePassoutYears = [...new Set(studentsData.map(s => s.passoutYear).filter(Boolean))].sort();

  const filteredStudents = studentsData.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      student.name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      (student.course && student.course.toLowerCase().includes(searchLower)) ||
      (student.branch && student.branch.toLowerCase().includes(searchLower)) ||
      (student.passoutYear && student.passoutYear.toString().includes(searchLower));

    const matchesPassoutYear = !passoutYearFilter || student.passoutYear?.toString() === passoutYearFilter;

    return matchesSearch && matchesPassoutYear;
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
          onClick={() => refetchStudents()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <PortalLayout role="hod" title="Blocked Students" user={profileData || user}>
          <GlassPanel className="w-full">
            <PageHeader
              title="Blocked Students"
              subtitle={`${hodCourse} - ${hodDepartment}`}
              icon={Ban}
              actions={
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <select
                    {...registerSearch('passoutYearFilter')}
                    className="rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">All Passout Years</option>
                    {uniquePassoutYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <Input
                    {...registerSearch('search')}
                    type="text"
                    placeholder="Search blocked students..."
                    className="w-full sm:w-64"
                  />
                </div>
              }
            />

            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                <strong>Total Blocked Students:</strong> {filteredStudents.length} in your department
              </p>
            </div>

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
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-muted/40 rounded-full text-xs text-muted-foreground">
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
                              variant="success"
                              size="sm"
                              onClick={() => handleUnblockStudent(student)}
                              disabled={isUnblocking}
                            >
                              <CheckCircle2 className="size-4" /> {isUnblocking ? 'Processing...' : 'Unblock'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-3 py-6">
                        <EmptyState
                          icon={Ban}
                          title={searchTerm ? 'No matching blocked students found' : 'No blocked students'}
                          description={searchTerm ? 'Try a different search term.' : 'No blocked students found in your department.'}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>

      {/* Unblock Student Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center border-b border-border p-4">
              <h3 className="text-xl font-semibold text-success">Unblock Student Account</h3>
              <button
                onClick={() => setShowUnblockModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 text-foreground">
              {selectedStudent && (
                <>
                  <p className="mb-2">You are about to unblock <strong>{selectedStudent.name}</strong>'s account.</p>
                  <p className="text-muted-foreground">This will restore their access to the placement portal.</p>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <Button variant="outline" onClick={() => setShowUnblockModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={confirmUnblockStudent}>
                Unblock Student
              </Button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default HODBlockedStudents;
