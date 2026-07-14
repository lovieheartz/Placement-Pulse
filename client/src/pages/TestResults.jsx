import React, { useContext, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  ArrowLeft, Download, Trophy, Users, CheckCircle2, XCircle, Search, BarChart3, Loader2,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE } from '../config/api';

const authHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` } });
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const TONES = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  success: 'bg-success/10 text-success ring-success/15',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/15',
};
const Stat = ({ icon: Icon, label, value, tone = 'primary' }) => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
    <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${TONES[tone]}`}>
      <Icon className="size-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold leading-tight text-foreground">{value}</p>
    </div>
  </div>
);

const rankStyle = (rank) => {
  if (rank === 1) return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 ring-yellow-500/25';
  if (rank === 2) return 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/25';
  if (rank === 3) return 'bg-amber-700/15 text-amber-700 dark:text-amber-500 ring-amber-700/25';
  return 'bg-muted text-muted-foreground ring-border';
};

const TestResults = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  const { role, basePath } = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return { role: 'hod', basePath: '/hod' };
    if (location.pathname.startsWith('/faculty')) return { role: 'faculty', basePath: '/faculty' };
    return { role: 'admin', basePath: '/admin' };
  }, [location.pathname]);

  const { data: test } = useQuery({
    queryKey: ['test', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/aptitude/tests/${id}`, authHeaders());
      return data.data;
    },
    enabled: !!id,
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['testResults', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/api/aptitude/tests/${id}/results?limit=500`, authHeaders());
      return data.data || [];
    },
    enabled: !!id,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return results;
    return results.filter((r) => {
      const s = r.studentId || r.student || {};
      return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
    });
  }, [results, search]);

  const stats = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const avg = total ? Math.round((results.reduce((s, r) => s + (r.percentage || 0), 0) / total) * 10) / 10 : 0;
    return { total, passed, failed: total - passed, avg };
  }, [results]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/aptitude/tests/${id}/export`, {
        ...authHeaders(),
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(test?.title || 'test').replace(/[^a-z0-9]/gi, '_')}_results.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded.');
    } catch {
      toast.error('Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PortalLayout role={role} title="Test Results" user={user}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/aptitude-tests`)}>
            <ArrowLeft className="size-4" /> Back to Tests
          </Button>
        </div>

        <PageHeader
          title={test?.title || 'Test Results'}
          subtitle={test ? `${test.totalMarks} marks · pass at ${test.passPercentage}%` : 'Candidate scores'}
          icon={Trophy}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`${basePath}/aptitude-tests/${id}/analytics`)}>
                <BarChart3 className="size-4" /> Analytics
              </Button>
              <Button variant="gradient" onClick={download} disabled={downloading || results.length === 0}>
                {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download Excel
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>
        ) : results.length === 0 ? (
          <GlassPanel>
            <EmptyState icon={Users} title="No submissions yet" description="Candidate scores will appear here once students submit this test." />
          </GlassPanel>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat icon={Users} label="Appeared" value={stats.total} />
              <Stat icon={CheckCircle2} label="Passed" value={stats.passed} tone="success" />
              <Stat icon={XCircle} label="Failed" value={stats.failed} tone="destructive" />
              <Stat icon={BarChart3} label="Avg Score" value={`${stats.avg}%`} />
            </div>

            <GlassPanel>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
                </div>
                <span className="text-sm text-muted-foreground">{filtered.length} of {results.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5 font-semibold">Rank</th>
                      <th className="px-3 py-2.5 font-semibold">Candidate</th>
                      <th className="px-3 py-2.5 font-semibold">Branch</th>
                      <th className="px-3 py-2.5 font-semibold text-center">Score</th>
                      <th className="px-3 py-2.5 font-semibold text-center">%</th>
                      <th className="px-3 py-2.5 font-semibold text-center">Correct</th>
                      <th className="px-3 py-2.5 font-semibold text-center">Wrong</th>
                      <th className="px-3 py-2.5 font-semibold text-center">Time</th>
                      <th className="px-3 py-2.5 font-semibold text-center">Result</th>
                      <th className="px-3 py-2.5 font-semibold">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const s = r.studentId || r.student || {};
                      const rank = r.rank || i + 1;
                      return (
                        <tr key={r.id} className="border-b border-border/60 transition-colors hover:bg-accent/40">
                          <td className="px-3 py-3">
                            <span className={`inline-flex size-8 items-center justify-center rounded-lg text-xs font-bold ring-1 ${rankStyle(rank)}`}>
                              {rank}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-foreground">{s.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{s.email}</div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{s.branch || '—'}</td>
                          <td className="px-3 py-3 text-center font-semibold text-foreground">
                            {r.score}<span className="text-xs text-muted-foreground">/{test?.totalMarks ?? '—'}</span>
                          </td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{Number(r.percentage || 0).toFixed(1)}%</td>
                          <td className="px-3 py-3 text-center text-success">{r.totalCorrect ?? 0}</td>
                          <td className="px-3 py-3 text-center text-destructive">{r.totalWrong ?? 0}</td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{Math.round(r.timeTaken || 0)}m</td>
                          <td className="px-3 py-3 text-center">
                            <Badge variant={r.passed ? 'success' : 'destructive'}>{r.passed ? 'Pass' : 'Fail'}</Badge>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">{fmt(r.submittedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </>
        )}
      </div>
    </PortalLayout>
  );
};

export default TestResults;
