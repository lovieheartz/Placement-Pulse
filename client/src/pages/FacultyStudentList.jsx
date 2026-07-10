import React, { useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
import { API_BASE } from '../config/api';

const FacultyStudentList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register: registerSearch, watch } = useForm();
  const searchTerm = watch('search') || '';

  // Fetch faculty profile to show in header
  const {
    data: profileData,
  } = useQuery({
    queryKey: ['facultyProfile'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/faculty/profile`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  // Fetch students filtered by faculty's course and department
  const {
    data: studentData = [],
    isLoading: isFetchingStudents,
    isError: isFetchError,
    error: fetchError,
  } = useQuery({
    queryKey: ['facultyStudents'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get(`${API_BASE}/faculty/students`, {
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
          onClick={() => queryClient.invalidateQueries(['facultyStudents'])}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <PortalLayout role="faculty" title="My Students" user={profileData || user}>
          <GlassPanel className="w-full">
            <PageHeader
              title="Student Management"
              subtitle={profileData ? `${profileData.course} - ${profileData.department}` : undefined}
              icon={GraduationCap}
              actions={
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <form className="w-full sm:w-64">
                    <Input
                      {...registerSearch('search')}
                      type="text"
                      placeholder="Search students..."
                    />
                  </form>
                </div>
              }
            />

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
                        <td className="px-3 py-3">
                          <Badge variant={student.isBlocked ? 'destructive' : 'success'}>
                            {student.isBlocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/faculty/students/${student.id || student._id}`)}>
                            <Eye className="size-4" /> View
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-3 py-6">
                        <EmptyState
                          icon={GraduationCap}
                          title={searchTerm ? 'No matching students found' : 'No students found'}
                          description={searchTerm ? 'Try a different search term.' : `No students found in ${profileData?.course} - ${profileData?.department}`}
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

export default FacultyStudentList;