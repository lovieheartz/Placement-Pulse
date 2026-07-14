import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FiPlus, FiEdit2, FiTrash2, FiBarChart2, FiDownload, FiEye, FiUsers,
  FiUserPlus, FiX, FiCheck, FiArrowLeft, FiSearch, FiClock, FiHelpCircle,
  FiCalendar, FiSend, FiInbox, FiFileText, FiAward,
} from 'react-icons/fi';
import { API_BASE } from '../lib/api';
import LiquidGlass from '../components/ui/LiquidGlass';

const AptitudeTestList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Batch management modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [testBatches, setTestBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Role-aware base path so Create/Edit/Analytics/Dashboard work for
  // admin, hod and faculty (they all share this page).
  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return '/hod';
    if (location.pathname.startsWith('/faculty')) return '/faculty';
    return '/admin';
  }, [location.pathname]);

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
  });

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/aptitude/tests`, authHeaders());
      // Postgres/Prisma returns `id`, but this page was written against Mongo's `_id`.
      // Normalise here so every action (analytics/export/edit/delete/publish) gets a real id.
      if (response.data.success) {
        setTests((response.data.data || []).map((t) => ({ ...t, _id: t._id ?? t.id })));
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      alert('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishTest = async (testId) => {
    if (!window.confirm('Publish this test? Students will be able to see it.')) return;
    try {
      setBusyId(testId);
      await axios.post(`${API_BASE}/api/aptitude/tests/${testId}/publish`, {}, authHeaders());
      await fetchTests();
    } catch (error) {
      console.error('Error publishing test:', error);
      alert(error.response?.data?.message || 'Failed to publish test');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Delete this test? This action cannot be undone.')) return;
    try {
      setBusyId(testId);
      await axios.delete(`${API_BASE}/api/aptitude/tests/${testId}`, authHeaders());
      await fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      alert(error.response?.data?.message || 'Failed to delete test');
    } finally {
      setBusyId(null);
    }
  };

  const handleExportResults = async (testId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/aptitude/tests/${testId}/export`, {
        ...authHeaders(),
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `test-results-${testId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results');
    }
  };

  // Batch Management Functions
  const handleManageBatches = async (test) => {
    setSelectedTest(test);
    setShowBatchModal(true);
    setLoadingBatches(true);
    try {
      const batchResponse = await axios.get(
        `${API_BASE}/api/batches?status=active&limit=100`,
        authHeaders()
      );
      setAvailableBatches(batchResponse.data.data || []);
      setTestBatches(test.assignedBatches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      alert('Failed to load batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleAssignBatch = async (batchId) => {
    try {
      await axios.post(
        `${API_BASE}/api/aptitude/tests/${selectedTest._id}/assign-batch`,
        { batchId },
        authHeaders()
      );
      setTestBatches([...testBatches, batchId]);
      fetchTests();
    } catch (error) {
      console.error('Error assigning batch:', error);
      alert(error.response?.data?.message || 'Failed to assign batch');
    }
  };

  const handleRemoveBatch = async (batchId) => {
    try {
      await axios.delete(
        `${API_BASE}/api/aptitude/tests/${selectedTest._id}/remove-batch/${batchId}`,
        authHeaders()
      );
      setTestBatches(testBatches.filter((id) => id !== batchId));
      fetchTests();
    } catch (error) {
      console.error('Error removing batch:', error);
      alert(error.response?.data?.message || 'Failed to remove batch');
    }
  };

  const handlePopulateStudents = async (batchId) => {
    if (!window.confirm("This will add ALL students matching this batch's criteria (course, department, passout year). Continue?")) return;
    try {
      const response = await axios.post(
        `${API_BASE}/api/batches/${batchId}/add-all-students`,
        {},
        authHeaders()
      );
      alert(response.data.message || 'Students added successfully!');
      handleManageBatches(selectedTest);
    } catch (error) {
      console.error('Error populating students:', error);
      alert(error.response?.data?.message || 'Failed to populate students');
    }
  };

  const getStatusMeta = (test) => {
    const now = new Date();
    const startDate = test.schedule?.startDate ? new Date(test.schedule.startDate) : null;
    const endDate = test.schedule?.endDate ? new Date(test.schedule.endDate) : null;

    if (test.status === 'draft') return { label: 'Draft', cls: 'bg-slate-400/15 text-slate-200 ring-white/15' };
    if (test.status === 'archived') return { label: 'Archived', cls: 'bg-purple-500/15 text-purple-200 ring-purple-300/25' };
    if (endDate && endDate < now) return { label: 'Completed', cls: 'bg-rose-500/15 text-rose-200 ring-rose-300/25' };
    if (startDate && startDate > now) return { label: 'Upcoming', cls: 'bg-sky-500/15 text-sky-200 ring-sky-300/25' };
    return { label: 'Ongoing', cls: 'bg-emerald-500/15 text-emerald-200 ring-emerald-300/25' };
  };

  const filteredTests = tests.filter((test) => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'draft') return matchesSearch && test.status === 'draft';
    if (filter === 'published') return matchesSearch && test.status === 'published';
    if (filter === 'completed') {
      const endDate = test.schedule?.endDate ? new Date(test.schedule.endDate) : null;
      return matchesSearch && endDate && endDate < new Date();
    }
    return matchesSearch;
  });

  const stats = [
    { label: 'Total Tests', value: tests.length, icon: FiBarChart2, tint: 'from-sky-400/30 to-blue-500/10', ring: 'ring-sky-300/30', ic: 'text-sky-200' },
    { label: 'Published', value: tests.filter((t) => t.status === 'published').length, icon: FiEye, tint: 'from-emerald-400/30 to-teal-500/10', ring: 'ring-emerald-300/30', ic: 'text-emerald-200' },
    { label: 'Draft', value: tests.filter((t) => t.status === 'draft').length, icon: FiEdit2, tint: 'from-slate-300/25 to-slate-500/10', ring: 'ring-white/20', ic: 'text-slate-100' },
    { label: 'Total Attempts', value: tests.reduce((s, t) => s + (t.stats?.totalAttempts || 0), 0), icon: FiUsers, tint: 'from-fuchsia-400/30 to-purple-500/10', ring: 'ring-fuchsia-300/30', ic: 'text-fuchsia-200' },
  ];

  const filters = [
    { key: 'all', label: 'All Tests' },
    { key: 'published', label: 'Published' },
    { key: 'draft', label: 'Draft' },
    { key: 'completed', label: 'Completed' },
  ];

  const goDashboard = () => navigate(basePath === '/hod' ? '/hod/dashboard' : basePath === '/faculty' ? '/faculty/dashboard' : '/home');

  const IconBtn = ({ onClick, title, className, children, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 backdrop-blur-md transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="relative min-h-screen text-white">
      {/* Animated liquid aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 ds-aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent,rgba(5,6,10,0.55))]" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <LiquidGlass strong className="rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-white via-white to-sky-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                Aptitude Tests
              </h1>
              <p className="mt-1.5 text-sm text-white/60">Manage and monitor all aptitude tests</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={goDashboard}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-md transition-all hover:bg-white/10"
              >
                <FiArrowLeft size={18} />
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate(`${basePath}/aptitude-tests/create`)}
                className="ds-shimmer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(59,99,255,0.6)] ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <FiPlus size={18} />
                Create New Test
              </button>
            </div>
          </div>
        </LiquidGlass>

        {/* Stats Cards — small glass boxes */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <LiquidGlass key={s.label} hover tilt className="rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/55">{s.label}</p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-white">{s.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tint} ring-1 ${s.ring} backdrop-blur-md`}>
                  <s.icon size={22} className={s.ic} />
                </div>
              </div>
            </LiquidGlass>
          ))}
        </div>

        {/* Filters and Search */}
        <LiquidGlass className="mt-6 rounded-2xl p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    filter === f.key
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_8px_24px_-10px_rgba(59,99,255,0.7)] ring-1 ring-white/20'
                      : 'bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative md:w-72">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests..."
                className="w-full rounded-xl bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder-white/40 ring-1 ring-white/15 outline-none backdrop-blur-md transition-shadow focus:ring-2 focus:ring-sky-400/60"
              />
            </div>
          </div>
        </LiquidGlass>

        {/* Tests Table */}
        <LiquidGlass className="mt-6 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-white/10">
                  {['Test Name', 'Duration', 'Questions', 'Schedule', 'Status', 'Attempts', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="h-6 w-full animate-pulse rounded bg-white/10" />
                      </td>
                    </tr>
                  ))
                ) : filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16">
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                          <FiInbox size={28} className="text-white/50" />
                        </div>
                        <p className="font-semibold text-white">No tests found</p>
                        <p className="mt-1 text-sm text-white/55">
                          {searchQuery || filter !== 'all' ? 'Try adjusting your filters or search.' : 'Create your first test to get started!'}
                        </p>
                        {!searchQuery && filter === 'all' && (
                          <button
                            onClick={() => navigate(`${basePath}/aptitude-tests/create`)}
                            className="ds-shimmer mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 hover:brightness-110"
                          >
                            <FiPlus size={16} /> Create New Test
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((test) => {
                    const status = getStatusMeta(test);
                    const attempts = test.stats?.totalAttempts || 0;
                    return (
                      <tr key={test._id} className="group transition-colors hover:bg-white/[0.04]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/25 to-indigo-500/10 ring-1 ring-white/10">
                              <FiFileText size={16} className="text-sky-200" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{test.title}</p>
                              {test.description && (
                                <p className="mt-0.5 max-w-xs truncate text-sm text-white/50">{test.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                            <FiClock size={14} className="text-white/45" />
                            {test.duration} mins
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                            <FiHelpCircle size={14} className="text-white/45" />
                            {test.totalQuestions}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-start gap-1.5 text-sm">
                            <FiCalendar size={14} className="mt-0.5 text-white/45" />
                            <div>
                              <p className="text-white/80">{test.schedule?.startDate ? new Date(test.schedule.startDate).toLocaleDateString() : '—'}</p>
                              <p className="text-white/45">to {test.schedule?.endDate ? new Date(test.schedule.endDate).toLocaleDateString() : '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 backdrop-blur-md ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-sm font-bold text-white">{attempts}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {test.status === 'draft' && (
                              <IconBtn onClick={() => handlePublishTest(test._id)} disabled={busyId === test._id} title="Publish Test"
                                className="bg-emerald-500/15 text-emerald-200 ring-emerald-300/25 hover:bg-emerald-500/25">
                                <FiSend size={16} />
                              </IconBtn>
                            )}
                            <IconBtn onClick={() => handleManageBatches(test)} title="Manage Batches & Students"
                              className="bg-indigo-500/15 text-indigo-200 ring-indigo-300/25 hover:bg-indigo-500/25">
                              <FiUsers size={16} />
                            </IconBtn>
                            <IconBtn onClick={() => navigate(`${basePath}/aptitude-tests/${test._id}/results`)} title="Candidate Scores"
                              className="bg-teal-500/15 text-teal-200 ring-teal-300/25 hover:bg-teal-500/25">
                              <FiAward size={16} />
                            </IconBtn>
                            <IconBtn onClick={() => navigate(`${basePath}/aptitude-tests/${test._id}/analytics`)} title="View Analytics"
                              className="bg-sky-500/15 text-sky-200 ring-sky-300/25 hover:bg-sky-500/25">
                              <FiBarChart2 size={16} />
                            </IconBtn>
                            {attempts > 0 && (
                              <IconBtn onClick={() => handleExportResults(test._id)} title="Export Results"
                                className="bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-300/25 hover:bg-fuchsia-500/25">
                                <FiDownload size={16} />
                              </IconBtn>
                            )}
                            <IconBtn onClick={() => navigate(`${basePath}/aptitude-tests/${test._id}/edit`)} title="Edit Test"
                              className="bg-amber-500/15 text-amber-200 ring-amber-300/25 hover:bg-amber-500/25">
                              <FiEdit2 size={16} />
                            </IconBtn>
                            <IconBtn onClick={() => handleDeleteTest(test._id)} disabled={busyId === test._id} title="Delete Test"
                              className="bg-rose-500/15 text-rose-200 ring-rose-300/25 hover:bg-rose-500/25">
                              <FiTrash2 size={16} />
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </LiquidGlass>

        {/* Batch Management Modal */}
        {showBatchModal && selectedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowBatchModal(false)}>
            <LiquidGlass strong className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600/80 to-sky-600/70 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white sm:text-2xl">Manage Batches &amp; Students</h2>
                    <p className="mt-1 text-indigo-100/90">{selectedTest.title}</p>
                  </div>
                  <button onClick={() => setShowBatchModal(false)} className="rounded-xl p-2 text-white transition-colors hover:bg-white/20">
                    <FiX size={22} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingBatches ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-b-sky-300" />
                    <p className="mt-4 text-white/60">Loading batches...</p>
                  </div>
                ) : availableBatches.length === 0 ? (
                  <div className="rounded-2xl bg-white/5 py-12 text-center ring-1 ring-white/10">
                    <FiUsers size={44} className="mx-auto mb-4 text-white/50" />
                    <p className="font-medium text-white">No batches available</p>
                    <p className="mt-1 text-sm text-white/55">Create batches first to assign them to tests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableBatches.map((batch) => {
                      const isAssigned = testBatches.some((id) => id === batch._id || id?._id === batch._id);
                      const batchIdStr = batch._id.toString();
                      return (
                        <div key={batch._id} className={`rounded-2xl p-4 ring-1 backdrop-blur-md transition-all ${isAssigned ? 'bg-emerald-500/10 ring-emerald-400/40' : 'bg-white/5 ring-white/10 hover:ring-indigo-300/40'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-white">{batch.batchName}</h3>
                                {batch.batchCode && <span className="rounded bg-white/10 px-2 py-1 text-xs font-medium text-white/70">{batch.batchCode}</span>}
                                {isAssigned && (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-white">
                                    <FiCheck size={13} /> Assigned
                                  </span>
                                )}
                              </div>
                              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-white/65">
                                <div><span className="font-medium text-white/90">Course:</span> {batch.course}</div>
                                {batch.department && <div><span className="font-medium text-white/90">Department:</span> {batch.department}</div>}
                                <div><span className="font-medium text-white/90">Academic Year:</span> {batch.academicYear}</div>
                                <div><span className="font-medium text-white/90">Passout Year:</span> {batch.passoutYear}</div>
                                <div className="col-span-2">
                                  <span className="font-medium text-white/90">Students:</span>{' '}
                                  <span className={`font-bold ${batch.studentCount === 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{batch.studentCount || 0}</span>
                                  {batch.studentCount === 0 && <span className="ml-2 text-xs text-rose-300">⚠️ No students in this batch</span>}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {!isAssigned ? (
                                  <button onClick={() => handleAssignBatch(batchIdStr)} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-indigo-600">Assign to Test</button>
                                ) : (
                                  <button onClick={() => handleRemoveBatch(batchIdStr)} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-rose-600">Remove from Test</button>
                                )}
                                {batch.studentCount === 0 && (
                                  <button onClick={() => handlePopulateStudents(batch._id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-emerald-600">
                                    <FiUserPlus size={15} /> Auto-Add Students
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">
                    <strong className="text-white">{testBatches.length}</strong> batch(es) assigned to this test
                  </div>
                  <button
                    onClick={() => { setShowBatchModal(false); fetchTests(); }}
                    className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-all hover:brightness-110"
                  >
                    Done
                  </button>
                </div>
              </div>
            </LiquidGlass>
          </div>
        )}
      </div>
    </div>
  );
};

export default AptitudeTestList;
