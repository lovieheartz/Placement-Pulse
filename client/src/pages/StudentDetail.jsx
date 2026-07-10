import React, { useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, GraduationCap, Mail, BookOpen, Hash, IdCard } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveFileUrl } from '../lib/api';
import SemesterResultsView from './StudentProfile/SemesterResultsView';
import { API_BASE } from '../config/api';

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2">
    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  </div>
);

const StudentDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  // One component serves admin/hod/faculty — derive the role scope from the URL.
  const { role, basePath } = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return { role: 'hod', basePath: '/hod' };
    if (location.pathname.startsWith('/faculty')) return { role: 'faculty', basePath: '/faculty' };
    return { role: 'admin', basePath: '/admin' };
  }, [location.pathname]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['staffStudentProfile', role, studentId],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get(`${API_BASE}${basePath}/students/${studentId}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.data;
    },
    enabled: !!studentId,
  });

  const student = data?.student;
  const profile = data?.profile;

  return (
    <PortalLayout role={role} title="Student Details" user={user}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/students`)}>
            <ArrowLeft className="size-4" /> Back to Students
          </Button>
        </div>

        <PageHeader
          title={student?.name || 'Student'}
          subtitle="Academic record & semester-wise results"
          icon={GraduationCap}
        />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <GlassPanel>
            <p className="text-sm text-destructive">
              {error?.response?.data?.message || 'Failed to load student details.'}
            </p>
          </GlassPanel>
        ) : (
          <div className="space-y-5">
            {/* Student summary */}
            <GlassPanel>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  {student?.avatar ? (
                    <img src={resolveFileUrl(student.avatar)} alt={student.name}
                      className="size-16 rounded-full border border-border object-cover" />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {student?.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{student?.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={student?.isBlocked ? 'destructive' : 'success'}>
                        {student?.isBlocked ? 'Blocked' : 'Active'}
                      </Badge>
                      {profile?.semesterMarks?.cgpa != null && (
                        <Badge variant="default">CGPA {Number(profile.semesterMarks.cgpa).toFixed(2)}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem icon={Mail} label="Email" value={student?.email} />
                  <InfoItem icon={BookOpen} label="Course" value={profile?.course || student?.course} />
                  <InfoItem icon={GraduationCap} label="Branch / Stream" value={profile?.stream || student?.branch} />
                  <InfoItem icon={Hash} label="University Roll" value={profile?.universityRoll} />
                  <InfoItem icon={IdCard} label="Registration No." value={profile?.universityRegistration} />
                  <InfoItem icon={GraduationCap} label="Passout Year" value={student?.passoutYear} />
                </div>
              </div>
            </GlassPanel>

            {/* Semester results */}
            <GlassPanel>
              <h3 className="mb-4 text-base font-semibold text-foreground">Semester-wise Results</h3>
              <SemesterResultsView
                semesterMarks={profile?.semesterMarks}
                emptyHint="This student hasn't added any semester results yet."
              />
            </GlassPanel>
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default StudentDetail;
