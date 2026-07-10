import React from 'react';
import { GraduationCap, Trash2, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/surface';

// Map a letter grade to a Badge tone. Higher grades -> success, mid -> default, low -> warning.
const gradeTone = (grade) => {
  const g = String(grade || '').toUpperCase();
  if (['O', 'E', 'A', 'A+'].includes(g)) return 'success';
  if (['B', 'B+', 'C'].includes(g)) return 'default';
  if (['D', 'P'].includes(g)) return 'warning';
  if (['F', 'I'].includes(g)) return 'destructive';
  return 'secondary';
};

const num = (v, d = 2) => (v == null || v === '' || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(d));

/**
 * Read-only display of a student's semester results.
 *
 * Props:
 *  - semesterMarks: { cgpa, semesters: [...] }  (the StudentProfile.semesterMarks JSON)
 *  - onDelete?: (semesterNumber) => void        (renders a delete button when provided)
 *  - deletingNumber?: number                    (semesterNumber currently being deleted)
 *  - emptyHint?: string
 */
const SemesterResultsView = ({ semesterMarks, onDelete, deletingNumber, emptyHint }) => {
  const semesters = Array.isArray(semesterMarks?.semesters) ? semesterMarks.semesters : [];
  const cgpa = semesterMarks?.cgpa;

  const sorted = [...semesters].sort(
    (a, b) => Number(a.semesterNumber) - Number(b.semesterNumber)
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No semester results yet"
        description={emptyHint || 'Semester grade cards will appear here once added.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* CGPA summary */}
      {cgpa != null && (
        <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cumulative CGPA</p>
              <p className="text-2xl font-bold leading-tight text-foreground">{num(cgpa)}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {sorted.length} semester{sorted.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Semester cards */}
      {sorted.map((sem) => (
        <div key={sem.semesterNumber} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold ring-1 ring-primary/15">
                {sem.semesterNumber}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">
                {sem.semesterName || `Semester ${sem.semesterNumber}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sem.sgpa != null && <Badge variant="default">SGPA {num(sem.sgpa)}</Badge>}
              {sem.totalCredits != null && (
                <Badge variant="secondary">{num(sem.totalCredits, 1)} credits</Badge>
              )}
              {sem.result && (
                <Badge variant={String(sem.result).toUpperCase().startsWith('P') ? 'success' : 'destructive'}>
                  {String(sem.result).toUpperCase().startsWith('P') ? 'Pass' : sem.result}
                </Badge>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(sem.semesterNumber)}
                  disabled={deletingNumber === sem.semesterNumber}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                  title="Remove this semester"
                >
                  <Trash2 className="size-3.5" />
                  {deletingNumber === sem.semesterNumber ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Code</th>
                  <th className="px-4 py-2 font-semibold">Subject</th>
                  <th className="px-4 py-2 font-semibold text-center">Grade</th>
                  <th className="px-4 py-2 font-semibold text-center">Points</th>
                  <th className="px-4 py-2 font-semibold text-center">Credit</th>
                  <th className="px-4 py-2 font-semibold text-center">Cr. Pts</th>
                </tr>
              </thead>
              <tbody>
                {(sem.subjects || []).map((s, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{s.code || '—'}</td>
                    <td className="px-4 py-2.5 text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-muted-foreground/60 shrink-0" />
                        {s.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={gradeTone(s.grade)} className="min-w-8 justify-center">{s.grade || '—'}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{s.points ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{s.credit ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center font-medium text-foreground">{s.creditPoints ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SemesterResultsView;
