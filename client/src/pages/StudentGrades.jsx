import React, { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Award, ClipboardList, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE } from '../config/api';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` } });
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const TONES = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  success: 'bg-success/10 text-success ring-success/15',
};
const Stat = ({ icon: Icon, label, value, tone = 'primary' }) => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
    <div className={`flex size-11 items-center justify-center rounded-xl ring-1 ${TONES[tone] || TONES.primary}`}>
      <Icon className="size-5" />
    </div>
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold leading-tight text-foreground">{value}</p>
    </div>
  </div>
);

const StudentGrades = () => {
  const { user } = useContext(AuthContext);

  const { data, isLoading } = useQuery({
    queryKey: ['myGrades'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/assignments/my/grades`, authHeaders());
      return data;
    },
    enabled: !!user,
  });

  const grades = data?.data || [];
  const graded = grades.filter((g) => g.aiPercentage != null);
  const avg = data?.averagePercentage;
  const onTimeCount = grades.filter((g) => g.onTime).length;

  return (
    <PortalLayout role="student" title="My Grades" user={user}>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Grades" subtitle="All your assignment scores in one place" icon={Award} />

        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-40 w-full rounded-2xl" /></div>
        ) : grades.length === 0 ? (
          <GlassPanel><EmptyState icon={Award} title="No grades yet" description="Submit an assignment and your AI-graded scores will appear here." /></GlassPanel>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat icon={TrendingUp} label="Average" value={avg != null ? `${avg}%` : '—'} tone="primary" />
              <Stat icon={CheckCircle2} label="Graded" value={`${graded.length}/${grades.length}`} tone="success" />
              <Stat icon={Clock} label="On Time" value={`${onTimeCount}/${grades.length}`} tone="primary" />
            </div>

            {/* List */}
            <div className="space-y-3">
              {grades.map((g) => (
                <GlassPanel key={g.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                        <ClipboardList className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground">{g.assignmentTitle}</h3>
                        <p className="text-xs text-muted-foreground">
                          Submitted {fmt(g.createdAt)}{g.dueDate ? ` · Due ${fmt(g.dueDate)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {g.aiScore != null ? (
                        <>
                          <Badge variant="default">{g.aiScore}/{g.aiMaxScore ?? g.totalMarks}</Badge>
                          {g.aiPercentage != null && <Badge variant="secondary">{g.aiPercentage}%</Badge>}
                        </>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                      {g.dueDate && (
                        <Badge variant={g.onTime ? 'success' : 'destructive'}>{g.onTime ? 'On time' : 'Late'}</Badge>
                      )}
                    </div>
                  </div>
                  {g.aiFeedback && (
                    <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Feedback: </span>{g.aiFeedback}
                    </p>
                  )}
                </GlassPanel>
              ))}
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
};

export default StudentGrades;
