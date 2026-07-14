import React, { useContext, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  ClipboardList, Upload, FileText, Loader2, Sparkles, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE } from '../config/api';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const authHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` } });
const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null);

const SubmissionResult = ({ sub }) => {
  if (!sub) return null;
  if (sub.status === 'error') {
    return (
      <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium"><AlertTriangle className="size-4 text-warning" /> Submitted — AI evaluation couldn't be completed. Your teacher can re-evaluate.</span>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success"><CheckCircle2 className="mr-1 size-3.5" /> Evaluated</Badge>
        {sub.aiScore != null && (
          <Badge variant="default">Score {sub.aiScore}/{sub.aiMaxScore}</Badge>
        )}
        {sub.aiPercentage != null && <Badge variant="secondary">{sub.aiPercentage}%</Badge>}
      </div>
      {sub.aiFeedback && <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Feedback: </span>{sub.aiFeedback}</p>}
    </div>
  );
};

const AssignmentCard = ({ assignment, onSubmit, submitting }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const sub = assignment.mySubmission;
  const overdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('File must be under 10MB'); e.target.value = ''; return; }
    if (!ALLOWED.includes(f.type)) { toast.error('Only PDF, JPG or PNG allowed'); e.target.value = ''; return; }
    setFile(f);
  };

  return (
    <GlassPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <ClipboardList className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">{assignment.title}</h3>
            {assignment.description && <p className="text-sm text-muted-foreground">{assignment.description}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {assignment.totalMarks != null && <Badge variant="secondary">{assignment.totalMarks} marks</Badge>}
              {assignment.dueDate && (
                <Badge variant={overdue ? 'destructive' : 'outline'}>
                  <Clock className="mr-1 size-3.5" /> Due {fmtDate(assignment.dueDate)}
                </Badge>
              )}
              {assignment.createdByName && <span className="text-xs text-muted-foreground">by {assignment.createdByName}</span>}
            </div>
          </div>
        </div>
      </div>

      {assignment.instructions && (
        <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-foreground whitespace-pre-wrap">{assignment.instructions}</p>
      )}

      {/* Submission result if already submitted */}
      <SubmissionResult sub={sub} />

      {/* Upload / resubmit */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-input bg-card px-3 py-2.5 hover:bg-accent/40 transition-colors">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {file ? <FileText className="size-4" /> : <Upload className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{file ? file.name : (sub ? 'Upload a new answer (resubmit)' : 'Upload your handwritten answer')}</span>
            <span className="block text-xs text-muted-foreground">PDF, JPG or PNG · max 10MB</span>
          </span>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={pick} className="hidden" />
        </label>
        <Button
          type="button"
          variant="gradient"
          disabled={!file || submitting}
          onClick={() => onSubmit(assignment.id, file, () => { setFile(null); if (fileRef.current) fileRef.current.value = ''; })}
          className="whitespace-nowrap"
        >
          {submitting ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : <><Sparkles className="size-4" /> Submit for AI grading</>}
        </Button>
      </div>
    </GlassPanel>
  );
};

const StudentAssignments = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [submittingId, setSubmittingId] = useState(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['studentAssignments'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/assignments`, authHeaders());
      return data.data || [];
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ id, file }) => {
      const fd = new FormData();
      fd.append('document', file);
      const { data } = await axios.post(`${API_BASE}/api/assignments/${id}/submit`, fd, {
        headers: { ...authHeaders().headers, 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Submitted!');
      queryClient.invalidateQueries(['studentAssignments']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to submit.'),
    onSettled: () => setSubmittingId(null),
  });

  const handleSubmit = (id, file, reset) => {
    setSubmittingId(id);
    submitMutation.mutate({ id, file }, { onSuccess: reset });
  };

  return (
    <PortalLayout role="student" title="Assignments" user={user}>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Assignments" subtitle="Upload your handwritten answers — AI grades them instantly" icon={ClipboardList} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : assignments.length === 0 ? (
          <GlassPanel>
            <EmptyState icon={ClipboardList} title="No assignments yet" description="Assignments from your faculty will appear here." />
          </GlassPanel>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onSubmit={handleSubmit} submitting={submittingId === a.id} />
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default StudentAssignments;
