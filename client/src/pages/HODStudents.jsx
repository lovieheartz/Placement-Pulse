import { useContext, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Ban, CheckCircle2, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
import { API_BASE } from '../config/api';

const HODStudents = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const textareaRef = useRef(null);

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';
  const branchFilter = watch('branchFilter') || '';
  const passoutYearFilter = watch('passoutYearFilter') || '';

  const {
    data: profileData,
  } = useQuery({
    queryKey: ['hodProfile'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/hod/profile`, {
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
    queryKey: ['hodStudents'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/hod/students`, {
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

  const { mutate: blockStudentMutation, isPending: isBlocking } = useMutation({
    mutationFn: async ({ studentId, reason }) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`${API_BASE}/hod/students/${studentId}/block`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onMutate: async ({ studentId }) => {
      await queryClient.cancelQueries(['hodStudents']);
      const previousStudents = queryClient.getQueryData(['hodStudents']);
      queryClient.setQueryData(['hodStudents'], (old) =>
        old ? old.map(s => s._id === studentId ? { ...s, isBlocked: true } : s) : []
      );
      return { previousStudents };
    },
    onError: (err, studentId, context) => {
      toast.error(err.response?.data?.message || 'Failed to block student');
      if (context?.previousStudents) {
        queryClient.setQueryData(['hodStudents'], context.previousStudents);
      }
    },
    onSuccess: () => {
      toast.success('Student blocked successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries(['hodStudents']);
    },
  });

  const { mutate: unblockStudentMutation, isPending: isUnblocking } = useMutation({
    mutationFn: async (studentId) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`${API_BASE}/hod/students/${studentId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onMutate: async (studentId) => {
      await queryClient.cancelQueries(['hodStudents']);
      const previousStudents = queryClient.getQueryData(['hodStudents']);
      queryClient.setQueryData(['hodStudents'], (old) =>
        old ? old.map(s => s._id === studentId ? { ...s, isBlocked: false } : s) : []
      );
      return { previousStudents };
    },
    onError: (err, studentId, context) => {
      toast.error(err.response?.data?.message || 'Failed to unblock student');
      if (context?.previousStudents) {
        queryClient.setQueryData(['hodStudents'], context.previousStudents);
      }
    },
    onSuccess: () => {
      toast.success('Student unblocked successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries(['hodStudents']);
    },
  });

  const handleBlockStudent = (student) => {
    setSelectedStudent(student);
    setBlockReason('');
    setShowBlockModal(true);
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

  const handleTextareaClick = (e) => {
    e.stopPropagation();
  };

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

  // Filter students by HOD's course and department (branch)
  const hodCourse = profileData?.course;
  const hodDepartment = profileData?.department; // This is a branch code like 'CSE', 'EE'

  const departmentStudents = studentsData.filter((student) => {
    // Match both course and branch
    return student.course === hodCourse && student.branch === hodDepartment;
  });

  // Get unique passout years for filter
  const uniquePassoutYears = [...new Set(departmentStudents.map(s => s.passoutYear).filter(Boolean))].sort();

  const filteredStudents = departmentStudents.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      student.name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
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
        <div className="text-xl">Loading students data...</div>
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
    <PortalLayout role="hod" title="Students" user={profileData || user}>
          <GlassPanel className="w-full">
            <PageHeader
              title="Department Students"
              subtitle={`${hodCourse} - ${hodDepartment}`}
              icon={Users}
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
                    placeholder="Search students..."
                    className="w-full sm:w-64"
                  />
                </div>
              }
            />

            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
              <p className="text-sm text-primary">
                <strong>Total Students:</strong> {filteredStudents.length} in your department
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
                    <th className="px-3 py-2.5 font-semibold">Admission Year</th>
                    <th className="px-3 py-2.5 font-semibold">Passout Year</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
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
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">{student.name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.email}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.course || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.branch || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.admissionYear || '-'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{student.passoutYear || '-'}</td>
                        <td className="px-3 py-3">
                          <Badge variant={student.isBlocked ? 'destructive' : 'success'}>
                            {student.isBlocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/hod/students/${student.id || student._id}`)}
                            >
                              <Eye className="size-4" /> View
                            </Button>
                            {student.isBlocked ? (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleUnblockStudent(student)}
                                disabled={isUnblocking}
                              >
                                <CheckCircle2 className="size-4" /> {isUnblocking ? 'Processing...' : 'Unblock'}
                              </Button>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleBlockStudent(student)}
                                disabled={isBlocking}
                              >
                                <Ban className="size-4" /> {isBlocking ? 'Processing...' : 'Block'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-3 py-6">
                        <EmptyState
                          icon={Users}
                          title={searchTerm ? 'No matching students found' : 'No students found'}
                          description={searchTerm ? 'Try a different search term.' : 'No students found in your department.'}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>

      {/* Block Student Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center border-b border-border p-4">
              <h3 className="text-xl font-semibold text-destructive">Block Student Account</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 text-foreground">
              {selectedStudent && (
                <>
                  <p className="mb-2">You are about to block <strong>{selectedStudent.name}</strong>'s account.</p>
                  <p className="mb-4 text-muted-foreground">This will prevent them from accessing the placement portal.</p>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Reason for blocking <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      ref={textareaRef}
                      rows={3}
                      value={blockReason}
                      onChange={(e) => {
                        const cursorPosition = e.target.selectionStart;
                        setBlockReason(e.target.value);
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
                      className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                      autoFocus
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This reason will be included in the notification email sent to the student.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <Button variant="outline" onClick={() => setShowBlockModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBlockStudent}
                disabled={!blockReason.trim()}
              >
                Block Student
              </Button>
            </div>
          </div>
        </div>
      )}

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

export default HODStudents;
