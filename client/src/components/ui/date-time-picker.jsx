import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

/**
 * DateTimePicker — a themed calendar + time popover.
 *
 * Drop-in replacement for <input type="datetime-local">: it reads and emits the
 * exact same "YYYY-MM-DDTHH:mm" string, so existing form state/backends are unchanged.
 *
 * The popover renders in a PORTAL with fixed positioning, so it is never clipped by a
 * parent with `overflow: hidden` (e.g. the glass cards on the test-creation page), and
 * it flips above the field when there isn't room below.
 *
 * Props:
 *   value       string  "YYYY-MM-DDTHH:mm" (or '')
 *   onChange    (value: string) => void
 *   min         string  optional "YYYY-MM-DDTHH:mm" — earlier datetimes are disabled
 *   placeholder string
 *   disabled    boolean
 *   className   string  extra classes for the trigger button
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const POPOVER_W = 320;
const POPOVER_H = 440; // approx, used only to decide flip direction

const pad = (n) => String(n).padStart(2, '0');

// "YYYY-MM-DDTHH:mm" -> Date (local). Returns null when unparseable.
function parseValue(v) {
  if (!v || typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Date -> "YYYY-MM-DDTHH:mm" (local, matches datetime-local semantics)
function formatValue(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert anything date-ish (ISO string from the API, Date, ms) into the LOCAL
 * "YYYY-MM-DDTHH:mm" string this picker expects.
 *
 * Use this instead of `new Date(x).toISOString().slice(0,16)` — toISOString()
 * returns UTC, which shifts the displayed time by the timezone offset.
 */
export function toLocalInput(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : formatValue(d);
}

function formatDisplay(d) {
  if (!d) return '';
  const h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}, ${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
}

const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const selectCls =
  'h-9 rounded-md border border-input bg-card px-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

const DateTimePicker = ({ value, onChange, min, placeholder = 'Select date & time', disabled, className = '' }) => {
  const selected = useMemo(() => parseValue(value), [value]);
  const minDate = useMemo(() => parseValue(min), [min]);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [view, setView] = useState(() => selected || new Date());

  const triggerRef = useRef(null);
  const popRef = useRef(null);

  // Keep the visible month in sync when a value arrives from outside.
  useEffect(() => {
    if (selected) setView(selected);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position the portal popover against the trigger; flip up when short on space below.
  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const flipUp = spaceBelow < POPOVER_H && r.top > spaceBelow;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_W - 8));
    setPos({ left, top: flipUp ? r.top - 8 : r.bottom + 8, flipUp });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    // Recompute while scrolling/resizing so it stays glued to the field.
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Day grid for the visible month.
  const { days, leading } = useMemo(() => {
    const y = view.getFullYear();
    const m = view.getMonth();
    return {
      leading: new Date(y, m, 1).getDay(),
      days: Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => new Date(y, m, i + 1)),
    };
  }, [view]);

  const isDisabledDay = (d) => (minDate ? startOfDay(d) < startOfDay(minDate) : false);

  const clamp = (d) => (minDate && d < minDate ? new Date(minDate) : d);

  // Picking a day keeps the chosen time (defaults to 09:00 on first pick).
  const pickDay = (d) => {
    if (isDisabledDay(d)) return;
    const base = selected || new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0);
    onChange(formatValue(clamp(new Date(d.getFullYear(), d.getMonth(), d.getDate(), base.getHours(), base.getMinutes()))));
  };

  // --- Time controls (explicit selects: always visible & themed, unlike a native time input) ---
  const base = selected || new Date(view.getFullYear(), view.getMonth(), view.getDate(), 9, 0);
  const h24 = base.getHours();
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const isPM = h24 >= 12;

  const setTime = (nextH12, nextMin, nextIsPM) => {
    let h = nextH12 % 12;
    if (nextIsPM) h += 12;
    const d = selected ? new Date(selected) : new Date(view.getFullYear(), view.getMonth(), view.getDate());
    d.setHours(h, nextMin, 0, 0);
    onChange(formatValue(clamp(d)));
  };

  const setNow = () => {
    const n = new Date();
    n.setSeconds(0, 0);
    const c = clamp(n);
    onChange(formatValue(c));
    setView(c);
  };

  const clear = () => { onChange(''); setOpen(false); };

  const today = new Date();

  const popover = pos && (
    <div
      ref={popRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: POPOVER_W,
        transform: pos.flipUp ? 'translateY(-100%)' : undefined,
        zIndex: 9999,
      }}
      className="rounded-xl border border-border bg-popover p-3 shadow-2xl"
    >
      {/* Month / year nav */}
      <div className="mb-2 flex items-center justify-between gap-1">
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          <select value={view.getMonth()} onChange={(e) => setView(new Date(view.getFullYear(), Number(e.target.value), 1))} className={selectCls}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={view.getFullYear()} onChange={(e) => setView(new Date(Number(e.target.value), view.getMonth(), 1))} className={selectCls}>
            {Array.from({ length: 11 }, (_, i) => today.getFullYear() - 3 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => <div key={w} className="py-1 text-xs font-semibold text-muted-foreground">{w}</div>)}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: leading }).map((_, i) => <div key={`b${i}`} />)}
        {days.map((d) => {
          const isSel = sameDay(d, selected);
          const isToday = sameDay(d, today);
          const off = isDisabledDay(d);
          return (
            <button
              key={d.getTime()}
              type="button"
              disabled={off}
              onClick={() => pickDay(d)}
              className={[
                'flex size-9 items-center justify-center rounded-md text-sm transition-colors',
                off ? 'cursor-not-allowed text-muted-foreground/30' : 'hover:bg-accent',
                isSel ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary' : 'text-foreground',
                !isSel && isToday ? 'font-semibold text-primary ring-1 ring-primary/40' : '',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Time — explicit selects so it always renders clearly */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            aria-label="Hour"
            value={hour12}
            onChange={(e) => setTime(Number(e.target.value), base.getMinutes(), isPM)}
            className={`${selectCls} flex-1`}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{pad(h)}</option>)}
          </select>
          <span className="font-semibold text-muted-foreground">:</span>
          <select
            aria-label="Minute"
            value={base.getMinutes()}
            onChange={(e) => setTime(hour12, Number(e.target.value), isPM)}
            className={`${selectCls} flex-1`}
          >
            {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{pad(m)}</option>)}
          </select>
          <select
            aria-label="AM or PM"
            value={isPM ? 'PM' : 'AM'}
            onChange={(e) => setTime(hour12, base.getMinutes(), e.target.value === 'PM')}
            className={`${selectCls} flex-1`}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={setNow} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">Now</button>
        <button type="button" onClick={clear} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">Clear</button>
        <div className="flex-1" />
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          Done
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${className}`}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className={`flex-1 truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Clear"
          >
            <X className="size-3.5" />
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(popover, document.body)}
    </>
  );
};

export default DateTimePicker;
