import React, { useContext, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Ban, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
// Using Tailwind instead of React Bootstrap
import './Dashboard.css';

const StudentList = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

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
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl w-full max-w-md mx-4">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-border p-4">
            <h3 className="text-xl font-semibold text-destructive">Block Student Account</h3>
            <button
              onClick={() => setShowBlockModal(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* Body */}
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

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button
              onClick={() => setShowBlockModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBlockStudent}
              disabled={!blockReason.trim()}
              variant="destructive"
            >
              Block Student
            </Button>
          </div>
        </div>
      </div>
    )
  );

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
    <PortalLayout role="admin" title="Students" user={profileData || user}>
          <PageHeader
            title="Student Management"
            subtitle="View and manage student accounts"
            icon={GraduationCap}
            actions={
              <form className="w-full sm:w-64">
                <Input
                  {...registerSearch('search')}
                  type="text"
                  placeholder="Search students..."
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
                        <td className="px-3 py-3">
                          <Badge variant={student.isBlocked ? 'destructive' : 'success'}>
                            {student.isBlocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <div className="flex flex-wrap gap-2">
                            {student.isBlocked ? (
                              <Button
                                onClick={() => handleUnblockStudent(student)}
                                variant="success"
                                size="sm"
                                disabled={isUnblocking}
                              >
                                <CheckCircle2 /> {isUnblocking ? 'Processing...' : 'Unblock'}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleBlockStudent(student)}
                                variant="destructive"
                                size="sm"
                                disabled={isBlocking}
                              >
                                <Ban /> {isBlocking ? 'Processing...' : 'Block'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-3 py-8">
                        <EmptyState
                          icon={GraduationCap}
                          title={searchTerm ? 'No matching students found' : 'No students found'}
                          description={searchTerm ? 'Try a different search term.' : 'Students will appear here once registered.'}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>
      <BlockStudentModal />
      <UnblockStudentModal />
    </PortalLayout>
  );
};

export default StudentList;