import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Sparkles, Upload, FileText, Loader2, Plus, X, Save, ScanLine, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { API_BASE } from '../../config/api';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const emptySubject = () => ({ name: '', marksScored: '', totalMarks: '' });
const pct = (obj) => {
  const subs = obj?.subjects || [];
  const scored = subs.reduce((a, s) => a + (Number(s.marksScored) || 0), 0);
  const total = subs.reduce((a, s) => a + (Number(s.totalMarks) || 0), 0);
  return total > 0 ? Math.round((scored / total) * 1000) / 10 : null;
};

/**
 * AI marksheet import for Class X / Class XII (board exams).
 * Upload -> AI extracts board/year/subjects -> review & edit -> save to profile.
 *
 * Props:
 *  - classType: 'classX' | 'classXII'
 *  - label: display label, e.g. "Class X (10th)"
 *  - profileData: fetched student profile (reads profileData[classType])
 */
const BoardMarksheetManager = ({ classType, label, profileData }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [review, setReview] = useState(null);

  const token = sessionStorage.getItem('authToken');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const saved = profileData?.[classType];

  const extractMutation = useMutation({
    mutationFn: async (theFile) => {
      const formData = new FormData();
      formData.append('document', theFile);
      formData.append('kind', 'board');
      const { data } = await axios.post(`${API_BASE}/student-profile/extract-result`, formData, {
        headers: { ...authHeader.headers, 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: (data) => {
      setReview({
        examName: data.examName ?? '',
        boardName: data.boardName ?? '',
        schoolName: data.schoolName ?? '',
        yearOfPassing: data.yearOfPassing ?? '',
        standardPercentage: data.standardPercentage ?? '',
        subjects: (Array.isArray(data.subjects) ? data.subjects : []).map((s) => ({
          name: s.name ?? '',
          marksScored: s.marksScored ?? '',
          totalMarks: s.totalMarks ?? '',
        })),
      });
      toast.success('Marksheet extracted! Review and edit before saving.');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to extract marksheet.'),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.put(`${API_BASE}/student-profile/profile`, payload, authHeader);
      return data;
    },
    onSuccess: () => {
      toast.success(`${label} saved to your profile!`);
      queryClient.invalidateQueries(['studentProfile']);
      setReview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to save marksheet.'),
  });

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_SIZE) { toast.error('File size should be less than 10MB'); e.target.value = ''; return; }
    if (!ALLOWED_TYPES.includes(selected.type)) { toast.error('Only PDF, JPG and PNG files are allowed'); e.target.value = ''; return; }
    setFile(selected);
    setReview(null);
  };

  const handleExtract = () => {
    if (!file) { toast.error('Please choose a marksheet file first.'); return; }
    extractMutation.mutate(file);
  };

  const updateReview = (field, value) => setReview((r) => ({ ...r, [field]: value }));
  const updateSubject = (i, field, value) => setReview((r) => {
    const subjects = [...r.subjects];
    subjects[i] = { ...subjects[i], [field]: value };
    return { ...r, subjects };
  });
  const addRow = () => setReview((r) => ({ ...r, subjects: [...r.subjects, emptySubject()] }));
  const removeRow = (i) => setReview((r) => ({ ...r, subjects: r.subjects.filter((_, idx) => idx !== i) }));
  const toNum = (v) => (v === '' || v == null ? undefined : Number(v));

  const handleSave = () => {
    const subjects = review.subjects
      .filter((s) => s.name)
      .map((s) => ({ name: s.name, marksScored: toNum(s.marksScored), totalMarks: toNum(s.totalMarks) }));
    const computed = pct({ subjects });
    const payload = {
      [classType]: {
        examName: review.examName || undefined,
        boardName: review.boardName || undefined,
        schoolName: review.schoolName || undefined,
        yearOfPassing: toNum(review.yearOfPassing),
        standardPercentage: toNum(review.standardPercentage) ?? computed ?? undefined,
        subjects,
      },
    };
    saveMutation.mutate(payload);
  };

  const fieldLabel = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <BookOpen className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold tracking-tight text-foreground">{label}</h3>
            {saved?.standardPercentage != null && (
              <Badge variant="default">{Number(saved.standardPercentage)}%</Badge>
            )}
            {saved?.boardName && <Badge variant="secondary">{saved.boardName}</Badge>}
            {saved?.yearOfPassing && <Badge variant="outline">{saved.yearOfPassing}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload your {label} marksheet (PDF or photo). AI reads the board, year and every subject — you review and save.
          </p>
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-input bg-card px-3 py-2.5 hover:bg-accent/40 transition-colors">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {file ? <FileText className="size-4" /> : <Upload className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{file ? file.name : 'Choose a marksheet file'}</span>
              <span className="block text-xs text-muted-foreground">PDF, JPG or PNG · max 10MB</span>
            </span>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
          </label>
          <Button type="button" variant="gradient" onClick={handleExtract} disabled={extractMutation.isPending || !file} className="whitespace-nowrap">
            {extractMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Extracting…</> : <><Sparkles className="size-4" /> Extract with AI</>}
          </Button>
        </div>
      </div>

      {/* Review */}
      {review && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><ScanLine className="size-4" /></span>
            <h4 className="text-sm font-semibold text-foreground">Review extracted details</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2"><label className={fieldLabel}>Exam Name</label><Input value={review.examName} onChange={(e) => updateReview('examName', e.target.value)} /></div>
            <div><label className={fieldLabel}>Board</label><Input value={review.boardName} onChange={(e) => updateReview('boardName', e.target.value)} /></div>
            <div><label className={fieldLabel}>Year</label><Input type="number" value={review.yearOfPassing} onChange={(e) => updateReview('yearOfPassing', e.target.value)} /></div>
            <div className="col-span-2"><label className={fieldLabel}>School</label><Input value={review.schoolName} onChange={(e) => updateReview('schoolName', e.target.value)} /></div>
            <div><label className={fieldLabel}>Percentage</label><Input type="number" step="0.01" value={review.standardPercentage} onChange={(e) => updateReview('standardPercentage', e.target.value)} /></div>
          </div>

          <div className="mt-4">
            <label className={fieldLabel}>Subjects</label>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="p-2 font-semibold">Subject</th>
                    <th className="p-2 font-semibold w-28">Marks</th>
                    <th className="p-2 font-semibold w-28">Out of</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {review.subjects.map((s, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="p-1"><Input className="h-8" value={s.name} onChange={(e) => updateSubject(i, 'name', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" type="number" value={s.marksScored} onChange={(e) => updateSubject(i, 'marksScored', e.target.value)} /></td>
                      <td className="p-1"><Input className="h-8" type="number" value={s.totalMarks} onChange={(e) => updateSubject(i, 'totalMarks', e.target.value)} /></td>
                      <td className="p-1 text-center">
                        <button type="button" onClick={() => removeRow(i)} className="inline-flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors" title="Remove row"><X className="size-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Add Row</Button>
            <span className="text-xs text-muted-foreground">Computed: {pct(review) ?? '—'}%</span>
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
            <Button type="button" variant="success" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save to Profile</>}
            </Button>
          </div>
        </div>
      )}

      {/* Saved subjects */}
      {saved?.subjects?.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Saved Subjects</h4>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Subject</th>
                  <th className="px-4 py-2 font-semibold text-center">Marks</th>
                  <th className="px-4 py-2 font-semibold text-center">Out of</th>
                  <th className="px-4 py-2 font-semibold text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {saved.subjects.map((s, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 text-foreground">{s.name}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{s.marksScored}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{s.totalMarks}</td>
                    <td className="px-4 py-2.5 text-center font-medium text-foreground">
                      {s.totalMarks ? ((Number(s.marksScored) / Number(s.totalMarks)) * 100).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardMarksheetManager;
