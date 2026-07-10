import React, { useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  ArrowLeft, Download, RefreshCw, FileText, ClipboardList, ExternalLink, Loader2,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE } from '../config/api';
import { resolveFileUrl } from '../lib/api';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` } });

const AssignmentSubmissions = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { role, basePath } = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return { role: 'hod', basePath: '/hod' };
    if (location.pathname.startsWith('/admin')) return { role: 'admin', basePath: '/admin' };
    return { role: 'faculty', basePath: '/faculty' };
  }, [location.pathname]);

  const { data, isLoading } = useQuery({
    queryKey: ['assignmentSubmissions', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/assignments/${id}/submissions`, authHeaders());
      return data;
    },
    enabled: !!id,
  });

  const assignment = data?.assignment;
  const submissions = data?.data || [];

  const reevalMutation = useMutation({
    mutationFn: async (submissionId) => axios.post(`${API_BASE}/api/assignments/submissions/${submissionId}/reevaluate`, {}, authHeaders()),
    onSuccess: () => { toast.success('Re-evaluated.'); queryClient.invalidateQueries(['assignmentSubmissions', id]); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to re-evaluate.'),
  });

  const exportXlsx = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/assignments/${id}/export`, { ...authHeaders(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(assignment?.title || 'assignment').replace(/[^a-z0-9]/gi, '_')}_submissions.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Failed to export.'); }
  };

  return (
    <PortalLayout role={role} title="Submissions" user={user}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/assignments`)}><ArrowLeft className="size-4" /> Back to Assignments</Button>
        </div>

        <PageHeader
          title={assignment?.title || 'Submissions'}
          subtitle={assignment?.totalMarks != null ? `Graded out of ${assignment.totalMarks}` : 'Student submissions & AI evaluation'}
          icon={ClipboardList}
          actions={<Button variant="gradient" onClick={exportXlsx} disabled={submissions.length === 0}><Download className="size-4" /> Export Excel</Button>}
        />

        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-28 w-full rounded-2xl" /></div>
        ) : submissions.length === 0 ? (
          <GlassPanel><EmptyState icon={FileText} title="No submissions yet" description="Students' uploaded answers will appear here, auto-graded by AI." /></GlassPanel>
        ) : (
          <div className="space-y-4">
            {submissions.map((s) => (
              <GlassPanel key={s.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{s.studentName || 'Student'}</h3>
                    <p className="text-sm text-muted-foreground">{s.studentEmail}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {s.status === 'evaluated' && s.aiScore != null && <Badge variant="default">Score {s.aiScore}/{s.aiMaxScore}</Badge>}
                      {s.aiPercentage != null && <Badge variant="secondary">{s.aiPercentage}%</Badge>}
                      {s.status === 'error' && <Badge variant="destructive">Not evaluated</Badge>}
                      {s.status === 'submitted' && <Badge variant="warning">Pending</Badge>}
                      {assignment?.dueDate && <Badge variant={s.onTime ? 'success' : 'destructive'}>{s.onTime ? 'On time' : 'Late'}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.fileUrl && (
                      <a href={resolveFileUrl(s.fileUrl)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><ExternalLink className="size-4" /> View file</Button>
                      </a>
                    )}
                    <Button variant="outline" size="sm" onClick={() => reevalMutation.mutate(s.id)} disabled={reevalMutation.isPending}>
                      {reevalMutation.isPending && reevalMutation.variables === s.id ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Re-evaluate
                    </Button>
                  </div>
                </div>

                {s.aiFeedback && (
                  <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-foreground">
                    <span className="font-medium">AI feedback: </span>{s.aiFeedback}
                  </p>
                )}

                {Array.isArray(s.aiBreakdown) && s.aiBreakdown.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 font-semibold">Question</th>
                          <th className="px-3 py-2 font-semibold text-center">Awarded</th>
                          <th className="px-3 py-2 font-semibold text-center">Max</th>
                          <th className="px-3 py-2 font-semibold">Comment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.aiBreakdown.map((b, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-2 text-foreground">{b.q}</td>
                            <td className="px-3 py-2 text-center font-medium text-foreground">{b.awarded}</td>
                            <td className="px-3 py-2 text-center text-muted-foreground">{b.max}</td>
                            <td className="px-3 py-2 text-muted-foreground">{b.comment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {s.aiExtractedText && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-primary">Show AI transcription of the answer</summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">{s.aiExtractedText}</p>
                  </details>
                )}
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default AssignmentSubmissions;
