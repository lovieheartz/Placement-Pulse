import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Sparkles, Upload, FileText, Loader2, Plus, X, Save, ScanLine, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SemesterResultsView from './SemesterResultsView';
import { API_BASE } from '../../config/api';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const emptySubject = () => ({ code: '', name: '', grade: '', points: '', credit: '', creditPoints: '' });

/**
 * AI-powered semester grade-card import (student-facing).
 * Upload a PDF/image -> AI extracts subjects/SGPA/roll etc. -> student reviews & edits
 * -> saves into the profile (semesterMarks JSON). Also lists saved semesters with CGPA.
 *
 * Props:
 *  - profileData: the fetched student profile (reads semesterMarks.semesters)
 *  - setValue: react-hook-form setValue, to reflect header fields in the main form
 */
const BOARD_LABEL = { classX: 'a Class X (10th) marksheet', classXII: 'a Class XII (12th) marksheet' };

const SemesterResultManager = ({ profileData, setValue, onSwitchTab }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [review, setReview] = useState(null); // editable extracted data or null
  const [mismatch, setMismatch] = useState(null); // { detected } when it's a board marksheet

  const token = sessionStorage.getItem('authToken');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // --- Extract (AI) ---
  const extractMutation = useMutation({
    mutationFn: async (theFile) => {
      const formData = new FormData();
      formData.append('document', theFile);
      const { data } = await axios.post(`${API_BASE}/student-profile/extract-result`, formData, {
        headers: { ...authHeader.headers, 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: (data) => {
      // Refuse to file a Class X / XII board marksheet as a semester result.
      const detected = data.documentType;
      if (detected === 'classX' || detected === 'classXII') {
        setMismatch({ detected });
        setReview(null);
        toast.error(`That looks like ${BOARD_LABEL[detected]} — not a semester grade card.`);
        return;
      }

      setMismatch(null);
      setReview({
        semesterNumber: data.semesterNumber ?? '',
        semesterName: data.semesterName ?? '',
        sgpa: data.sgpa ?? '',
        result: data.result ?? '',
        totalCredits: data.totalCredits ?? '',
        universityRoll: data.rollNumber ?? '',
        universityRegistration: data.registrationNumber ?? '',
        course: data.program ?? '',
        college: data.college ?? '',
        subjects: (Array.isArray(data.subjects) ? data.subjects : []).map((s) => ({
          code: s.code ?? '',
          name: s.name ?? '',
          grade: s.grade ?? '',
          points: s.points ?? '',
          credit: s.credit ?? '',
          creditPoints: s.creditPoints ?? '',
        })),
      });
      toast.success('Result extracted! Review and edit before saving.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to extract result from document.');
    },
  });

  // --- Save reviewed semester ---
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.post(`${API_BASE}/student-profile/profile/semester`, payload, authHeader);
      return data;
    },
    onSuccess: () => {
      toast.success('Semester result saved to your profile!');
      queryClient.invalidateQueries(['studentProfile']);
      setReview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save semester result.');
    },
  });

  // --- Delete a saved semester ---
  const deleteMutation = useMutation({
    mutationFn: async (semesterNumber) => {
      const { data } = await axios.delete(
        `${API_BASE}/student-profile/profile/semester/${semesterNumber}`,
        authHeader
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Semester removed.');
      queryClient.invalidateQueries(['studentProfile']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove semester.');
    },
  });

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_SIZE) {
      toast.error('File size should be less than 10MB');
      e.target.value = '';
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      toast.error('Only PDF, JPG and PNG files are allowed');
      e.target.value = '';
      return;
    }
    setFile(selected);
    setReview(null);
  };

  const handleExtract = () => {
    if (!file) {
      toast.error('Please choose a grade card file first.');
      return;
    }
    extractMutation.mutate(file);
  };

  const updateReview = (field, value) => setReview((r) => ({ ...r, [field]: value }));

  const updateSubject = (index, field, value) => {
    setReview((r) => {
      const subjects = [...r.subjects];
      subjects[index] = { ...subjects[index], [field]: value };
      return { ...r, subjects };
    });
  };

  const addSubjectRow = () => setReview((r) => ({ ...r, subjects: [...r.subjects, emptySubject()] }));
  const removeSubjectRow = (index) =>
    setReview((r) => ({ ...r, subjects: r.subjects.filter((_, i) => i !== index) }));

  const toNum = (v) => (v === '' || v == null ? undefined : Number(v));

  const handleSave = () => {
    if (review.semesterNumber === '' || review.semesterNumber == null) {
      toast.error('Please enter a semester number (1-8).');
      return;
    }

    // Reflect header fields in the main profile form (best-effort).
    if (setValue) {
      if (review.universityRoll) setValue('universityRoll', review.universityRoll);
      if (review.universityRegistration) setValue('universityRegistration', review.universityRegistration);
      if (review.course) setValue('course', review.course);
    }

    const payload = {
      semester: {
        semesterNumber: Number(review.semesterNumber),
        semesterName: review.semesterName || `Semester ${review.semesterNumber}`,
        sgpa: toNum(review.sgpa),
        result: review.result || undefined,
        totalCredits: toNum(review.totalCredits),
        subjects: review.subjects
          .filter((s) => s.name || s.code)
          .map((s) => ({
            code: s.code || undefined,
            name: s.name || undefined,
            grade: s.grade || undefined,
            points: toNum(s.points),
            credit: toNum(s.credit),
            creditPoints: toNum(s.creditPoints),
          })),
      },
      header: {
        universityRoll: review.universityRoll || undefined,
        universityRegistration: review.universityRegistration || undefined,
        course: review.course || undefined,
      },
    };

    saveMutation.mutate(payload);
  };

  const fieldLabel = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold tracking-tight text-foreground">Semester Results — AI Auto-Fill</h3>
          <p className="text-sm text-muted-foreground">
            Upload your semester grade card (PDF or a photo/scan). AI reads the subjects, grades, credits and
            SGPA — you just review and save. No manual typing.
          </p>
        </div>
      </div>

      {/* Upload dropzone */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-input bg-card px-3 py-2.5 hover:bg-accent/40 transition-colors">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {file ? <FileText className="size-4" /> : <Upload className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {file ? file.name : 'Choose a grade card file'}
              </span>
              <span className="block text-xs text-muted-foreground">PDF, JPG or PNG · max 10MB</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <Button
            type="button"
            variant="gradient"
            onClick={handleExtract}
            disabled={extractMutation.isPending || !file}
            className="whitespace-nowrap"
          >
            {extractMutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Extracting…</>
            ) : (
              <><Sparkles className="size-4" /> Extract with AI</>
            )}
          </Button>
        </div>
        {extractMutation.isPending && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ScanLine className="size-3.5 animate-pulse" /> Reading your grade card with AI…
          </p>
        )}
      </div>

      {/* Wrong document type — this is a board marksheet, not a semester grade card */}
      {mismatch && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-foreground">This isn't a semester grade card</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The AI read this as <span className="font-medium text-foreground">{BOARD_LABEL[mismatch.detected]}</span>.
                Save it under the right tab so your records stay correct.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onSwitchTab && (
                  <Button type="button" variant="gradient" size="sm"
                    onClick={() => { setMismatch(null); onSwitchTab(mismatch.detected); }}>
                    Go to {mismatch.detected === 'classX' ? 'Class X (10th)' : 'Class XII (12th)'} →
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => setMismatch(null)}>Dismiss</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review & confirm */}
      {review && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ScanLine className="size-4" />
            </span>
            <h4 className="text-sm font-semibold text-foreground">Review extracted details</h4>
            <span className="ml-auto text-xs text-muted-foreground">Edit anything that looks off, then save.</span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className={fieldLabel}>Semester No.</label>
              <Input type="number" min="1" max="8" value={review.semesterNumber}
                onChange={(e) => updateReview('semesterNumber', e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className={fieldLabel}>Semester Name</label>
              <Input value={review.semesterName} onChange={(e) => updateReview('semesterName', e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>SGPA</label>
              <Input type="number" step="0.01" value={review.sgpa} onChange={(e) => updateReview('sgpa', e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>Total Credits</label>
              <Input type="number" step="0.5" value={review.totalCredits} onChange={(e) => updateReview('totalCredits', e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>Result</label>
              <Input value={review.result} onChange={(e) => updateReview('result', e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>University Roll</label>
              <Input value={review.universityRoll} onChange={(e) => updateReview('universityRoll', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={fieldLabel}>Registration No.</label>
              <Input value={review.universityRegistration} onChange={(e) => updateReview('universityRegistration', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={fieldLabel}>Program / Course</label>
              <Input value={review.course} onChange={(e) => updateReview('course', e.target.value)} />
            </div>
          </div>

          {/* Subjects editor */}
          <div className="mt-4">
            <label className={fieldLabel}>Subjects</label>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="p-2 font-semibold">Code</th>
                    <th className="p-2 font-semibold">Subject</th>
                    <th className="p-2 font-semibold">Grade</th>
                    <th className="p-2 font-semibold">Points</th>
                    <th className="p-2 font-semibold">Credit</th>
                    <th className="p-2 font-semibold">Cr. Pts</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {review.subjects.map((s, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="p-1"><Input className="h-8" value={s.code} onChange={(e) => updateSubject(i, 'code', e.target.value)} /></td>
                      <td className="p-1 min-w-[9rem]"><Input className="h-8" value={s.name} onChange={(e) => updateSubject(i, 'name', e.target.value)} /></td>
                      <td className="p-1 w-16"><Input className="h-8" value={s.grade} onChange={(e) => updateSubject(i, 'grade', e.target.value)} /></td>
                      <td className="p-1 w-16"><Input className="h-8" type="number" value={s.points} onChange={(e) => updateSubject(i, 'points', e.target.value)} /></td>
                      <td className="p-1 w-16"><Input className="h-8" type="number" step="0.5" value={s.credit} onChange={(e) => updateSubject(i, 'credit', e.target.value)} /></td>
                      <td className="p-1 w-16"><Input className="h-8" type="number" value={s.creditPoints} onChange={(e) => updateSubject(i, 'creditPoints', e.target.value)} /></td>
                      <td className="p-1 text-center">
                        <button type="button" onClick={() => removeSubjectRow(i)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors" title="Remove row">
                          <X className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addSubjectRow}>
              <Plus className="size-4" /> Add Row
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
            <Button type="button" variant="success" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save to Profile</>}
            </Button>
          </div>
        </div>
      )}

      {/* Saved semesters */}
      <div className="mt-6">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Saved Semesters</h4>
        <SemesterResultsView
          semesterMarks={profileData?.semesterMarks}
          onDelete={(n) => deleteMutation.mutate(n)}
          deletingNumber={deleteMutation.isPending ? deleteMutation.variables : undefined}
          emptyHint="Upload a grade card above and AI will fill everything in."
        />
      </div>
    </div>
  );
};

export default SemesterResultManager;
