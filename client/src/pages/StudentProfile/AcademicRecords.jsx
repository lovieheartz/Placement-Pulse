import React, { useContext, useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  GraduationCap, School, BookOpenCheck, Sparkles, Upload, FileText, Loader2, ScanLine,
  Lock, Unlock, ExternalLink, Plus, X, Save, ShieldCheck, Clock, TriangleAlert,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { API_BASE } from '../../config/api';
import { resolveFileUrl } from '../../lib/api';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const TYPE_META = {
  classX: { label: 'Class X (10th)', icon: School },
  classXII: { label: 'Class XII (12th)', icon: BookOpenCheck },
  semester: { label: 'Semester', icon: GraduationCap },
};

const authHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` } });
const toNum = (v) => (v === '' || v == null ? undefined : Number(v));
const isBoard = (t) => t === 'classX' || t === 'classXII';

// Credit points are always credit x grade points — never an independent figure.
// Deriving them (instead of trusting whatever the OCR read out of the table)
// removes a whole class of wrong-but-plausible data, and keeps the row honest
// when the student corrects a misread grade or credit.
const withCreditPoints = (row) => {
  const credit = Number(row.credit);
  const points = Number(row.points);
  const known = row.credit !== '' && row.points !== '' && Number.isFinite(credit) && Number.isFinite(points);
  return { ...row, creditPoints: known ? Math.round(credit * points * 100) / 100 : '' };
};

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                   */
/* ------------------------------------------------------------------ */

const ViewFileButton = ({ fileUrl, size = 'sm' }) =>
  fileUrl ? (
    <a href={resolveFileUrl(fileUrl)} target="_blank" rel="noreferrer">
      <Button type="button" variant="outline" size={size}>
        <ExternalLink className="size-4" /> View uploaded file
      </Button>
    </a>
  ) : null;

const LockBadge = ({ record }) => {
  const req = record?.editRequest;
  if (req?.status === 'pending') {
    return <Badge variant="warning"><Clock className="mr-1 size-3.5" /> Edit requested</Badge>;
  }
  if (record?.locked === false) {
    return <Badge variant="success"><Unlock className="mr-1 size-3.5" /> Unlocked — you can edit</Badge>;
  }
  return <Badge variant="secondary"><Lock className="mr-1 size-3.5" /> Locked</Badge>;
};

/* ------------------------------------------------------------------ */
/*  Review panel — shape adapts to the detected document type           */
/* ------------------------------------------------------------------ */

const ReviewPanel = ({ extracted, onCancel, onSaved }) => {
  const queryClient = useQueryClient();
  const { documentType, fileUrl, fileName } = extracted;
  const [r, setR] = useState(extracted.review);

  const set = (k, v) => setR((p) => ({ ...p, [k]: v }));
  const setSub = (i, k, v) => setR((p) => {
    const subjects = [...p.subjects];
    const row = { ...subjects[i], [k]: v };
    subjects[i] = isBoard(documentType) ? row : withCreditPoints(row);
    return { ...p, subjects };
  });
  const addRow = () => setR((p) => ({
    ...p,
    subjects: [...p.subjects, isBoard(documentType)
      ? { name: '', marksScored: '', totalMarks: '', grade: '' }
      : { code: '', name: '', grade: '', points: '', credit: '', creditPoints: '' }],
  }));
  const delRow = (i) => setR((p) => ({ ...p, subjects: p.subjects.filter((_, x) => x !== i) }));

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.post(`${API_BASE}/student-profile/academic-record`, payload, authHeaders());
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Saved and locked.');
      queryClient.invalidateQueries(['studentProfile']);
      onSaved(documentType);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save.'),
  });

  const submit = () => {
    let record;
    if (isBoard(documentType)) {
      record = {
        examName: r.examName || undefined,
        boardName: r.boardName || undefined,
        schoolName: r.schoolName || undefined,
        yearOfPassing: toNum(r.yearOfPassing),
        standardPercentage: toNum(r.standardPercentage),
        cgpa: toNum(r.cgpa),
        subjects: r.subjects.filter((s) => s.name).map((s) => ({
          name: s.name,
          marksScored: toNum(s.marksScored),
          totalMarks: toNum(s.totalMarks),
          grade: s.grade || undefined,
        })),
      };
    } else {
      if (r.semesterNumber === '' || r.semesterNumber == null) {
        return toast.error('Please set the semester number (1–8).');
      }
      record = {
        semesterNumber: Number(r.semesterNumber),
        semesterName: r.semesterName || `Semester ${r.semesterNumber}`,
        sgpa: toNum(r.sgpa),
        totalCredits: toNum(r.totalCredits),
        result: r.result || undefined,
        subjects: r.subjects.filter((s) => s.name || s.code).map((s) => ({
          code: s.code || undefined,
          name: s.name || undefined,
          grade: s.grade || undefined,
          points: toNum(s.points),
          credit: toNum(s.credit),
          creditPoints: toNum(s.creditPoints),
        })),
      };
    }

    saveMutation.mutate({
      documentType,
      record,
      fileUrl,
      fileName,
      header: isBoard(documentType) ? undefined : {
        universityRoll: r.universityRoll || undefined,
        universityRegistration: r.universityRegistration || undefined,
        course: r.course || undefined,
      },
    });
  };

  // Never let an unexpected documentType blow up the render.
  const Meta = TYPE_META[documentType] || { label: 'Document', icon: FileText };
  const lbl = 'block text-xs font-medium text-muted-foreground mb-1';

  // Taller than the default and, for numbers, no spinner arrows — those steal
  // ~20px of an already narrow box, which is what was clipping "10" to "1".
  const textCls = 'h-10 text-sm';
  const numCls =
    'h-10 text-center text-sm [appearance:textfield] ' +
    '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  // Recomputed from the rows, so the student sees what they are actually saving
  // rather than what the scan claimed.
  const totals = useMemo(() => {
    if (isBoard(documentType)) return { credits: 0, creditPoints: 0, sgpa: null };

    let credits = 0;
    let creditPoints = 0;
    for (const s of r.subjects) {
      const c = Number(s.credit);
      const cp = Number(s.creditPoints);
      if (Number.isFinite(c)) credits += c;
      if (Number.isFinite(cp)) creditPoints += cp;
    }
    credits = Math.round(credits * 100) / 100;
    creditPoints = Math.round(creditPoints * 100) / 100;

    return {
      credits,
      creditPoints,
      sgpa: credits > 0 ? Math.round((creditPoints / credits) * 100) / 100 : null,
    };
  }, [r.subjects, documentType]);

  const sgpaMismatch =
    !isBoard(documentType) &&
    totals.sgpa != null &&
    r.sgpa !== '' &&
    r.sgpa != null &&
    Math.abs(Number(r.sgpa) - totals.sgpa) > 0.05;

  return (
    <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ScanLine className="size-4" />
        </span>
        <h4 className="text-sm font-semibold text-foreground">Review before saving</h4>
        <Badge variant="default">
          <Meta.icon className="mr-1 size-3.5" />
          Detected: {Meta.label}
        </Badge>
        <div className="flex-1" />
        <ViewFileButton fileUrl={fileUrl} />
      </div>

      <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-foreground">
        <ShieldCheck className="mr-1 inline size-3.5 text-warning" />
        Once saved, this record is <strong>locked</strong>. To change it later you'll need edit permission from the placement cell — so check it carefully now.
      </p>

      {/* Header fields */}
      {isBoard(documentType) ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2"><label className={lbl}>Exam Name</label><Input value={r.examName} onChange={(e) => set('examName', e.target.value)} /></div>
          <div><label className={lbl}>Board</label><Input value={r.boardName} onChange={(e) => set('boardName', e.target.value)} /></div>
          <div><label className={lbl}>Year</label><Input type="number" value={r.yearOfPassing} onChange={(e) => set('yearOfPassing', e.target.value)} /></div>
          <div className="col-span-2"><label className={lbl}>School</label><Input value={r.schoolName} onChange={(e) => set('schoolName', e.target.value)} /></div>
          <div><label className={lbl}>Percentage</label><Input type="number" step="0.01" value={r.standardPercentage} onChange={(e) => set('standardPercentage', e.target.value)} /></div>
          <div><label className={lbl}>CGPA</label><Input type="number" step="0.01" value={r.cgpa} onChange={(e) => set('cgpa', e.target.value)} /></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div><label className={lbl}>Semester No.</label><Input type="number" min="1" max="8" value={r.semesterNumber} onChange={(e) => set('semesterNumber', e.target.value)} /></div>
          <div className="col-span-3"><label className={lbl}>Semester Name</label><Input value={r.semesterName} onChange={(e) => set('semesterName', e.target.value)} /></div>
          <div><label className={lbl}>SGPA</label><Input type="number" step="0.01" value={r.sgpa} onChange={(e) => set('sgpa', e.target.value)} /></div>
          <div><label className={lbl}>Total Credits</label><Input type="number" step="0.5" value={r.totalCredits} onChange={(e) => set('totalCredits', e.target.value)} /></div>
          <div><label className={lbl}>Result</label><Input value={r.result} onChange={(e) => set('result', e.target.value)} /></div>
          <div><label className={lbl}>University Roll</label><Input value={r.universityRoll} onChange={(e) => set('universityRoll', e.target.value)} /></div>
          <div className="col-span-2"><label className={lbl}>Registration No.</label><Input value={r.universityRegistration} onChange={(e) => set('universityRegistration', e.target.value)} /></div>
          <div className="col-span-2"><label className={lbl}>Program / Course</label><Input value={r.course} onChange={(e) => set('course', e.target.value)} /></div>
        </div>
      )}

      {/* Subjects */}
      <div className="mt-4">
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
          <label className={`${lbl} mb-0`}>Subjects</label>
          <span className="text-xs text-muted-foreground">
            {isBoard(documentType)
              ? 'Check every row against your marksheet before saving.'
              : 'Cr.Pts is calculated as Credit × Pts — fix the grade points or credit and it updates itself.'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          {/* min-w keeps the fields readable: the table scrolls sideways on a
              narrow screen instead of squeezing "10" down to a sliver. */}
          <table className={`w-full text-sm ${isBoard(documentType) ? 'min-w-[640px]' : 'min-w-[880px]'}`}>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {isBoard(documentType) ? (
                  <><th className="p-2">Subject</th><th className="p-2 w-28">Marks</th><th className="p-2 w-28">Out of</th><th className="p-2 w-24">Grade</th></>
                ) : (
                  <>
                    <th className="p-2 w-40">Code</th>
                    <th className="p-2 min-w-[16rem]">Subject</th>
                    <th className="p-2 w-24">Grade</th>
                    <th className="p-2 w-24">Pts</th>
                    <th className="p-2 w-24">Credit</th>
                    <th className="p-2 w-24">Cr.Pts</th>
                  </>
                )}
                <th className="p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {r.subjects.map((s, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  {isBoard(documentType) ? (
                    <>
                      <td className="p-1.5"><Input className={textCls} value={s.name} onChange={(e) => setSub(i, 'name', e.target.value)} /></td>
                      <td className="p-1.5"><Input className={numCls} type="number" value={s.marksScored} onChange={(e) => setSub(i, 'marksScored', e.target.value)} /></td>
                      <td className="p-1.5"><Input className={numCls} type="number" value={s.totalMarks} onChange={(e) => setSub(i, 'totalMarks', e.target.value)} /></td>
                      <td className="p-1.5"><Input className={textCls} value={s.grade} placeholder="—" onChange={(e) => setSub(i, 'grade', e.target.value)} /></td>
                    </>
                  ) : (
                    <>
                      <td className="p-1.5"><Input className={`${textCls} font-mono`} value={s.code} onChange={(e) => setSub(i, 'code', e.target.value)} /></td>
                      <td className="p-1.5"><Input className={textCls} value={s.name} onChange={(e) => setSub(i, 'name', e.target.value)} /></td>
                      <td className="p-1.5"><Input className={numCls} value={s.grade} onChange={(e) => setSub(i, 'grade', e.target.value)} /></td>
                      <td className="p-1.5"><Input className={numCls} type="number" value={s.points} onChange={(e) => setSub(i, 'points', e.target.value)} /></td>
                      <td className="p-1.5"><Input className={numCls} type="number" step="0.5" value={s.credit} onChange={(e) => setSub(i, 'credit', e.target.value)} /></td>
                      <td className="p-1.5">
                        <Input
                          className={`${numCls} bg-muted/60 font-semibold text-muted-foreground`}
                          value={s.creditPoints === '' ? '—' : s.creditPoints}
                          readOnly
                          tabIndex={-1}
                          title="Credit × Pts, calculated for you"
                        />
                      </td>
                    </>
                  )}
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => delRow(i)}
                      title="Remove this row"
                      className="inline-flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                    >
                      <X className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {r.subjects.length === 0 && (
                <tr>
                  <td colSpan={isBoard(documentType) ? 5 : 7} className="p-6 text-center text-sm text-muted-foreground">
                    No subjects were read from the document. Use “Add Row” to enter them.
                  </td>
                </tr>
              )}
            </tbody>

            {!isBoard(documentType) && r.subjects.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-muted/30 text-xs font-semibold">
                  <td className="p-2 text-muted-foreground" colSpan={4}>Totals from the rows above</td>
                  <td className="p-2 tabular-nums">{totals.credits || '—'}</td>
                  <td className="p-2 tabular-nums">{totals.creditPoints || '—'}</td>
                  <td className="p-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* A silent mismatch here is how a wrong SGPA gets locked in forever. */}
        {sgpaMismatch && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              These rows work out to an SGPA of <strong>{totals.sgpa}</strong>, but the header says{' '}
              <strong>{r.sgpa}</strong>. Check the grade points and credits before you save — this record locks.
            </span>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Add Row</Button>
        <div className="flex-1" />
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="success" onClick={submit} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save & Lock</>}
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Saved-record cards                                                  */
/* ------------------------------------------------------------------ */

// Preset reasons — the common cases first, so most students never have to type.
const EDIT_REASONS = [
  'AI misread the marks / grades',
  'A subject is missing from the list',
  'Wrong document was uploaded',
  'Wrong semester number was detected',
  'Typo in name / roll / registration number',
  'Board, school or year is incorrect',
  'Other (please explain)',
];

const RequestEditModal = ({ recordLabel, onClose, onSubmit, pending }) => {
  const [reason, setReason] = useState(EDIT_REASONS[0]);
  const [details, setDetails] = useState('');
  const needsDetails = reason === 'Other (please explain)';

  const submit = () => {
    if (needsDetails && !details.trim()) {
      toast.error('Please describe what needs changing.');
      return;
    }
    onSubmit(details.trim() ? `${reason} — ${details.trim()}` : reason);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Lock className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">Request edit access</h3>
            <p className="text-sm text-muted-foreground">
              {recordLabel} is locked. Tell the placement cell what's wrong and they'll unlock it.
            </p>
          </div>
        </div>

        <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-3 h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {EDIT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Details {needsDetails ? <span className="text-destructive">*</span> : <span className="opacity-60">(optional)</span>}
        </label>
        <textarea
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. Physics marks should be 88, not 68"
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="gradient" onClick={submit} disabled={pending}>
            {pending ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : <>Send request</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RequestEditButton = ({ recordType, semesterNumber, record, recordLabel }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const req = record?.editRequest;

  const mut = useMutation({
    mutationFn: async (reason) => {
      const { data } = await axios.post(
        `${API_BASE}/student-profile/academic-record/request-edit`,
        { recordType, semesterNumber, reason },
        authHeaders()
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Edit request sent. The placement cell will review it.');
      queryClient.invalidateQueries(['studentProfile']);
      setOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to request edit.'),
  });

  if (record?.locked === false) return null;                 // already unlocked
  if (req?.status === 'pending') {
    return <span className="text-xs text-muted-foreground">Awaiting approval…</span>;
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Lock className="size-4" /> Request edit access
      </Button>
      {open && (
        <RequestEditModal
          recordLabel={recordLabel}
          pending={mut.isPending}
          onClose={() => setOpen(false)}
          onSubmit={(reason) => mut.mutate(reason)}
        />
      )}
    </>
  );
};

const BoardCard = ({ type, record }) => {
  const meta = TYPE_META[type] || { label: 'Record', icon: FileText };
  if (!record) {
    return <EmptyState icon={meta.icon} title={`No ${meta.label} record`}
      description="Upload the marksheet above — AI detects and files it automatically." />;
  }
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="text-sm font-semibold text-foreground">{meta.label}</span>
        {record.boardName && <Badge variant="secondary">{record.boardName}</Badge>}
        {record.yearOfPassing && <Badge variant="outline">{record.yearOfPassing}</Badge>}
        {record.standardPercentage != null && <Badge variant="default">{record.standardPercentage}%</Badge>}
        {record.cgpa != null && <Badge variant="default">CGPA {record.cgpa}</Badge>}
        <div className="flex-1" />
        <LockBadge record={record} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">Subject</th><th className="px-4 py-2 text-center">Marks</th>
              <th className="px-4 py-2 text-center">Out of</th><th className="px-4 py-2 text-center">Grade</th>
            </tr>
          </thead>
          <tbody>
            {(record.subjects || []).map((s, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2.5 text-foreground">{s.name}</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">{s.marksScored ?? '—'}</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">{s.totalMarks ?? '—'}</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">{s.grade || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        <ViewFileButton fileUrl={record.fileUrl} />
        <div className="flex-1" />
        <RequestEditButton recordType={type} record={record} recordLabel={meta.label} />
      </div>
    </div>
  );
};

const SemesterCard = ({ sem }) => (
  <div className="rounded-xl border border-border bg-card">
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/15">
        {sem.semesterNumber}
      </span>
      <span className="text-sm font-semibold text-foreground">{sem.semesterName || `Semester ${sem.semesterNumber}`}</span>
      {sem.sgpa != null && <Badge variant="default">SGPA {Number(sem.sgpa).toFixed(2)}</Badge>}
      {sem.totalCredits != null && <Badge variant="secondary">{sem.totalCredits} credits</Badge>}
      <div className="flex-1" />
      <LockBadge record={sem} />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2">Code</th><th className="px-4 py-2">Subject</th>
            <th className="px-4 py-2 text-center">Grade</th><th className="px-4 py-2 text-center">Credit</th>
          </tr>
        </thead>
        <tbody>
          {(sem.subjects || []).map((s, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.code || '—'}</td>
              <td className="px-4 py-2.5 text-foreground">{s.name}</td>
              <td className="px-4 py-2.5 text-center"><Badge variant="secondary">{s.grade || '—'}</Badge></td>
              <td className="px-4 py-2.5 text-center text-muted-foreground">{s.credit ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
      <ViewFileButton fileUrl={sem.fileUrl} />
      <div className="flex-1" />
      <RequestEditButton
        recordType="semester"
        semesterNumber={sem.semesterNumber}
        record={sem}
        recordLabel={sem.semesterName || `Semester ${sem.semesterNumber}`}
      />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

const AcademicRecords = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [tab, setTab] = useState('classX');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/student-profile/profile`, authHeaders());
      return data.data;
    },
    enabled: !!user,
  });

  const extractMutation = useMutation({
    mutationFn: async (f) => {
      const fd = new FormData();
      fd.append('document', f);
      const { data } = await axios.post(`${API_BASE}/student-profile/extract-result`, fd, {
        headers: { ...authHeaders().headers, 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      const d = res.data || {};
      // Tolerate older/unexpected server shapes instead of crashing the page.
      const t = res.documentType || d.documentType;
      if (!TYPE_META[t]) {
        toast.error(
          "The server didn't say what kind of document this is. Restart the backend so it picks up the latest code, then try again."
        );
        return;
      }
      const review = isBoard(t)
        ? {
            examName: d.examName ?? '', boardName: d.boardName ?? '', schoolName: d.schoolName ?? '',
            yearOfPassing: d.yearOfPassing ?? '', standardPercentage: d.standardPercentage ?? '', cgpa: d.cgpa ?? '',
            subjects: (d.boardSubjects || []).map((s) => ({
              name: s.name ?? '', marksScored: s.marksScored ?? '', totalMarks: s.totalMarks ?? '', grade: s.grade ?? '',
            })),
          }
        : {
            semesterNumber: d.semesterNumber ?? '', semesterName: d.semesterName ?? '', sgpa: d.sgpa ?? '',
            totalCredits: d.totalCredits ?? '', result: d.result ?? '',
            universityRoll: d.rollNumber ?? '', universityRegistration: d.registrationNumber ?? '', course: d.program ?? '',
            // Recompute Cr.Pts rather than trusting what came off the scan —
            // it is credit x points by definition, and a misread here would be
            // locked in permanently.
            subjects: (d.semesterSubjects || []).map((s) => withCreditPoints({
              code: s.code ?? '', name: s.name ?? '', grade: s.grade ?? '',
              points: s.points ?? '', credit: s.credit ?? '',
            })),
          };

      setExtracted({ documentType: t, fileUrl: res.fileUrl, fileName: res.fileName, review });
      setTab(t === 'semester' ? 'semesters' : t);
      toast.success(`Detected ${TYPE_META[t].label} — review and save.`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not read that document.'),
  });

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('File must be under 10MB'); e.target.value = ''; return; }
    if (!ALLOWED.includes(f.type)) { toast.error('Only PDF, JPG or PNG allowed'); e.target.value = ''; return; }
    setFile(f);
    setExtracted(null);
  };

  const reset = () => {
    setExtracted(null); setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const cgpa = profileData?.semesterMarks?.cgpa;
  const semesters = [...(profileData?.semesterMarks?.semesters || [])]
    .sort((a, b) => Number(a.semesterNumber) - Number(b.semesterNumber));

  // StudentProfile has no `name`/`email` (it stores fullName/primaryEmail) — without this
  // the portal header rendered the fallback "User".
  const headerUser = {
    ...(user || {}),
    name: profileData?.fullName
      || [profileData?.firstName, profileData?.lastName].filter(Boolean).join(' ').trim()
      || user?.name,
    email: profileData?.primaryEmail || user?.email,
    avatar: user?.avatar || profileData?.avatar,
  };

  const TABS = [
    { id: 'classX', label: 'Class X (10th)', icon: School },
    { id: 'classXII', label: 'Class XII (12th)', icon: BookOpenCheck },
    { id: 'semesters', label: `Semesters (${semesters.length})`, icon: GraduationCap },
  ];

  return (
    <PortalLayout role="student" title="Academic Records" user={headerUser}>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Academic Records"
          subtitle="Upload any marksheet — AI detects whether it's 10th, 12th or a semester and files it for you"
          icon={GraduationCap}
          actions={cgpa != null ? <Badge variant="default" className="text-sm">CGPA {Number(cgpa).toFixed(2)}</Badge> : null}
        />

        {/* ---- Uploader (auto-detect) ---- */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-foreground">Upload a marksheet</h3>
              <p className="text-sm text-muted-foreground">
                Class X, Class XII or any semester grade card — PDF or a photo. AI works out which one it is
                and saves it in the right place. No need to pick a category.
              </p>
            </div>
          </div>

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
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={pick} className="hidden" />
              </label>
              <Button type="button" variant="gradient" disabled={!file || extractMutation.isPending}
                onClick={() => extractMutation.mutate(file)} className="whitespace-nowrap">
                {extractMutation.isPending
                  ? <><Loader2 className="size-4 animate-spin" /> Detecting…</>
                  : <><Sparkles className="size-4" /> Extract with AI</>}
              </Button>
            </div>
          </div>

          {extracted && <ReviewPanel extracted={extracted} onCancel={reset} onSaved={() => reset()} />}
        </div>

        {/* ---- Saved records ---- */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Your saved records</h3>

          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? 'border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  }`}>
                  <Icon className="size-4" /> {t.label}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-2xl" />
          ) : tab === 'classX' ? (
            <BoardCard type="classX" record={profileData?.classX} />
          ) : tab === 'classXII' ? (
            <BoardCard type="classXII" record={profileData?.classXII} />
          ) : semesters.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No semester results yet"
              description="Upload a semester grade card above — AI detects it automatically." />
          ) : (
            <div className="space-y-4">
              {semesters.map((s) => <SemesterCard key={s.semesterNumber} sem={s} />)}
            </div>
          )}
        </div>

        <GlassPanel className="mt-5">
          <p className="text-sm text-muted-foreground">
            <ShieldCheck className="mr-1 inline size-4 text-primary" />
            <span className="font-medium text-foreground">Records lock once saved.</span> This keeps your marks
            trustworthy for the placement cell. Need to fix something? Hit <span className="font-medium text-foreground">Request edit access</span> and
            an admin will unlock it. Your uploaded file stays viewable by you and the placement cell.
          </p>
        </GlassPanel>
      </div>
    </PortalLayout>
  );
};

export default AcademicRecords;
