import React, { useContext, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  ClipboardList, Plus, Trash2, Users, Download, Eye, X, Loader2, CheckCircle2,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DateTimePicker from '@/components/ui/date-time-picker';
import { API_BASE } from '../config/api';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` } });
const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null);

const emptyQuestion = () => ({ q: '', maxMarks: '' });

const CreatePanel = ({ role, onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', description: '', instructions: '', totalMarks: '', dueDate: '', course: '', department: '' });
  const [questions, setQuestions] = useState([]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.post(`${API_BASE}/api/assignments`, payload, authHeaders());
      return data;
    },
    onSuccess: () => { toast.success('Assignment created.'); onCreated(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create assignment.'),
  });

  const submit = () => {
    if (!form.title.trim()) return toast.error('Title is required.');
    if (role === 'admin' && (!form.course.trim() || !form.department.trim()))
      return toast.error('As admin, set course and department to target students.');
    const cleanedQ = questions.filter((q) => q.q.trim()).map((q) => ({ q: q.q, maxMarks: q.maxMarks ? Number(q.maxMarks) : undefined }));
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      instructions: form.instructions || undefined,
      totalMarks: form.totalMarks ? Number(form.totalMarks) : undefined,
      dueDate: form.dueDate || undefined,
      questions: cleanedQ.length ? cleanedQ : undefined,
      course: form.course || undefined,
      department: form.department || undefined,
    });
  };

  const label = 'block text-xs font-medium text-muted-foreground mb-1';
  return (
    <GlassPanel className="mb-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">New Assignment</h3>
        <button onClick={onClose} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><label className={label}>Title *</label><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Data Structures — Assignment 3" /></div>
        <div className="md:col-span-2"><label className={label}>Description</label><Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short summary" /></div>
        <div className="md:col-span-2">
          <label className={label}>Instructions for students</label>
          <textarea value={form.instructions} onChange={(e) => set('instructions', e.target.value)} rows={3}
            className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="What should students do? The AI grades answers against this." />
        </div>
        <div><label className={label}>Total Marks</label><Input type="number" value={form.totalMarks} onChange={(e) => set('totalMarks', e.target.value)} placeholder="100" /></div>
        <div>
          <label className={label}>Deadline</label>
          <DateTimePicker
            value={form.dueDate}
            onChange={(v) => set('dueDate', v)}
            placeholder="Set a deadline"
          />
        </div>
        {role === 'admin' && (
          <>
            <div><label className={label}>Course *</label><Input value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="e.g. B.Tech" /></div>
            <div><label className={label}>Department *</label><Input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. CSE" /></div>
          </>
        )}
      </div>

      {/* Optional per-question rubric */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label className={label}>Questions / rubric (optional)</label>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((q) => [...q, emptyQuestion()])}><Plus className="size-3.5" /> Add</Button>
        </div>
        {questions.map((q, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <Input value={q.q} onChange={(e) => setQuestions((qs) => qs.map((x, idx) => idx === i ? { ...x, q: e.target.value } : x))} placeholder={`Question ${i + 1}`} />
            <Input className="w-24" type="number" value={q.maxMarks} onChange={(e) => setQuestions((qs) => qs.map((x, idx) => idx === i ? { ...x, maxMarks: e.target.value } : x))} placeholder="Marks" />
            <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="inline-flex size-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"><X className="size-4" /></button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="success" onClick={submit} disabled={createMutation.isPending}>
          {createMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Creating…</> : <><CheckCircle2 className="size-4" /> Create</>}
        </Button>
      </div>
    </GlassPanel>
  );
};

const FacultyAssignments = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { role, basePath } = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return { role: 'hod', basePath: '/hod' };
    if (location.pathname.startsWith('/admin')) return { role: 'admin', basePath: '/admin' };
    return { role: 'faculty', basePath: '/faculty' };
  }, [location.pathname]);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['facultyAssignments'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/assignments`, authHeaders());
      return data.data || [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => axios.delete(`${API_BASE}/api/assignments/${id}`, authHeaders()),
    onSuccess: () => { toast.success('Assignment deleted.'); queryClient.invalidateQueries(['facultyAssignments']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete.'),
  });

  const exportXlsx = async (a) => {
    try {
      const res = await axios.get(`${API_BASE}/api/assignments/${a.id}/export`, { ...authHeaders(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${a.title.replace(/[^a-z0-9]/gi, '_')}_submissions.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export.');
    }
  };

  return (
    <PortalLayout role={role} title="Assignments" user={user}>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Assignments"
          subtitle="Create assignments; students upload handwritten answers and AI grades them"
          icon={ClipboardList}
          actions={<Button variant="gradient" onClick={() => setCreating((v) => !v)}><Plus className="size-4" /> New Assignment</Button>}
        />

        {creating && <CreatePanel role={role} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); queryClient.invalidateQueries(['facultyAssignments']); }} />}

        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-32 w-full rounded-2xl" /></div>
        ) : assignments.length === 0 ? (
          <GlassPanel><EmptyState icon={ClipboardList} title="No assignments yet" description="Create your first assignment to collect and auto-grade student submissions." /></GlassPanel>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => {
              const stats = a.submissionStats || { total: 0, evaluated: 0 };
              return (
                <GlassPanel key={a.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"><ClipboardList className="size-5" /></div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-foreground">{a.title}</h3>
                        {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {a.totalMarks != null && <Badge variant="secondary">{a.totalMarks} marks</Badge>}
                          {a.dueDate && <Badge variant="outline">Due {fmtDate(a.dueDate)}</Badge>}
                          <Badge variant="default"><Users className="mr-1 size-3.5" /> {stats.total} submitted</Badge>
                          {stats.total > 0 && <Badge variant="success">{stats.evaluated} graded</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`${basePath}/assignments/${a.id}`)}><Eye className="size-4" /> View Submissions</Button>
                    <Button variant="outline" size="sm" onClick={() => exportXlsx(a)} disabled={stats.total === 0}><Download className="size-4" /> Export Excel</Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this assignment and all its submissions?')) deleteMutation.mutate(a.id); }} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default FacultyAssignments;
