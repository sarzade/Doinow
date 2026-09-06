import { useMemo, useState } from 'react';
import JalaliInput from './JalaliInput';
import { formatGregorianSmall, formatJalaliWeekday, toFaDigits } from '../lib/jalali';
import {
  FA_WEEKDAYS_SHORT,
  describeFa,
  occurrences,
  shamsiWeekday,
  type RecurrenceEnd,
  type RecurrenceRule,
  type RecurFreq,
} from '../lib/recurrence';

interface Props {
  /** قانون فعلی (ویرایش) یا null (جدید) */
  initial: RecurrenceRule | null;
  /** شروع پیشنهادی: سررسید تسک یا امروز */
  defaultStartISO: string | null;
  onSave: (rule: RecurrenceRule | null) => void;
  onClose: () => void;
}

const FREQS: { v: RecurFreq; label: string }[] = [
  { v: 'daily', label: 'روزانه' },
  { v: 'weekly', label: 'هفتگی' },
  { v: 'monthly', label: 'ماهانه' },
  { v: 'yearly', label: 'سالانه' },
];

const INTERVAL_UNIT: Record<RecurFreq, string> = {
  daily: 'روز',
  weekly: 'هفته',
  monthly: 'ماه',
  yearly: 'سال',
};

function timeOf(iso: string | null): string {
  if (!iso) return '09:00';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '09:00';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function RecurrenceSheet({ initial, defaultStartISO, onSave, onClose }: Props) {
  const seedStart = useMemo(() => {
    if (initial) return new Date(initial.start);
    if (defaultStartISO) {
      const d = new Date(defaultStartISO);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const t = new Date();
    t.setHours(9, 0, 0, 0);
    return t;
  }, [initial, defaultStartISO]);

  const [freq, setFreq] = useState<RecurFreq>(initial?.freq ?? 'weekly');
  const [interval, setInterval] = useState(initial?.interval ?? 1);
  const [byWeekday, setByWeekday] = useState<number[]>(
    initial?.byWeekday?.length ? [...initial.byWeekday] : [shamsiWeekday(seedStart)],
  );
  const [monthlyMode, setMonthlyMode] = useState<'dayOfMonth' | 'nthWeekday'>(
    initial?.monthlyMode ?? 'dayOfMonth',
  );
  const [startISO, setStartISO] = useState<string>(seedStart.toISOString());
  const [time, setTime] = useState(initial?.time ?? timeOf(seedStart.toISOString()));
  const [missedKeep, setMissedKeep] = useState((initial?.missed ?? 'keep') === 'keep');
  const [endType, setEndType] = useState<'never' | 'onDate' | 'after'>(
    initial?.end?.type ?? 'never',
  );
  const [endDate, setEndDate] = useState<string | null>(
    initial?.end?.type === 'onDate' ? initial.end.date : null,
  );
  const [endCount, setEndCount] = useState(
    initial?.end?.type === 'after' ? initial.end.count : 10,
  );

  const rule: RecurrenceRule | null = useMemo(() => {
    const start = new Date(startISO);
    if (Number.isNaN(start.getTime())) return null;
    const [h, m] = time.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    let end: RecurrenceEnd = { type: 'never' };
    if (endType === 'onDate' && endDate) end = { type: 'onDate', date: new Date(endDate).toISOString() };
    else if (endType === 'after') end = { type: 'after', count: Math.max(1, endCount) };
    return {
      freq,
      interval: Math.max(1, Math.min(365, interval)),
      ...(freq === 'weekly' ? { byWeekday: [...byWeekday].sort((a, b) => a - b) } : {}),
      ...(freq === 'monthly' ? { monthlyMode } : {}),
      time,
      start: start.toISOString(),
      missed: missedKeep ? 'keep' : 'nextOnly',
      end,
    };
  }, [freq, interval, byWeekday, monthlyMode, startISO, time, missedKeep, endType, endDate, endCount]);

  const preview = useMemo(() => {
    if (!rule) return [];
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 90);
    return occurrences(rule, now, horizon, { limit: 3 });
  }, [rule]);

  function toggleDay(d: number): void {
    setByWeekday((prev) => {
      if (prev.includes(d)) {
        if (prev.length === 1) return prev; // حداقل یک روز
        return prev.filter((x) => x !== d);
      }
      return [...prev, d];
    });
  }

  const chip = (active: boolean): string =>
    `rounded-2xl border px-3 py-2.5 text-sm font-bold ${
      active
        ? 'border-brand-600 bg-brand-600 text-white'
        : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
    }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="sheet-enter nice-scroll max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-gray-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-center text-lg font-black">یادآور تکرارشونده</h2>

        <div className="grid grid-cols-2 gap-2">
          {FREQS.map((f) => (
            <button key={f.v} type="button" onClick={() => setFreq(f.v)} className={chip(freq === f.v)}>
              {f.label}
            </button>
          ))}
        </div>

        {freq === 'weekly' && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs text-gray-500">روزهای هفته</label>
            <div className="grid grid-cols-4 gap-1.5">
              {FA_WEEKDAYS_SHORT.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-xl border px-1 py-2 text-xs font-bold ${
                    byWeekday.includes(i)
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100'
                      : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {freq === 'monthly' && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMonthlyMode('dayOfMonth')}
              className={chip(monthlyMode === 'dayOfMonth')}
            >
              روز مشخص ماه
            </button>
            <button
              type="button"
              onClick={() => setMonthlyMode('nthWeekday')}
              className={chip(monthlyMode === 'nthWeekday')}
            >
              روز هفته‌ای (مثل دومین دوشنبه)
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
          <span className="text-sm text-gray-500">تکرار هر</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInterval((v) => Math.max(1, v - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg dark:bg-gray-700"
            >
              −
            </button>
            <span className="min-w-16 text-center text-sm font-bold">
              {toFaDigits(interval)} {INTERVAL_UNIT[freq]}
            </span>
            <button
              type="button"
              onClick={() => setInterval((v) => Math.min(365, v + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg dark:bg-gray-700"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-500">شروع از</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <JalaliInput value={startISO} onChange={(iso) => iso && setStartISO(iso)} />
        </div>

        <div className="mt-3 space-y-2 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
          <div className="text-sm text-gray-500">پایان</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { v: 'never', label: 'بی‌پایان' },
                { v: 'onDate', label: 'تا تاریخ' },
                { v: 'after', label: 'بعد از N بار' },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setEndType(o.v)}
                className={`rounded-xl border px-1 py-2 text-xs font-bold ${
                  endType === o.v
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100'
                    : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {endType === 'onDate' && (
            <JalaliInput value={endDate} onChange={setEndDate} />
          )}
          {endType === 'after' && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setEndCount((v) => Math.max(1, v - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg dark:bg-gray-700"
              >
                −
              </button>
              <span className="text-sm font-bold">{toFaDigits(endCount)} بار</span>
              <button
                type="button"
                onClick={() => setEndCount((v) => Math.min(1000, v + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg dark:bg-gray-700"
              >
                +
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMissedKeep((v) => !v)}
          className="mt-3 flex w-full items-center justify-between rounded-2xl bg-gray-50 px-3 py-3 dark:bg-gray-800"
        >
          <span className="text-sm">وقوع‌های انجام‌نشده معوق بمونن</span>
          <span
            className={`h-7 w-12 rounded-full p-1 transition-colors ${missedKeep ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${missedKeep ? '-translate-x-5' : ''}`} />
          </span>
        </button>
        {!missedKeep && (
          <p className="mt-1 px-1 text-[11px] text-gray-400">
            فقط نزدیک‌ترین وقوع بعدی نمایش داده می‌شود.
          </p>
        )}

        {rule && (
          <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-600/30 dark:bg-brand-600/10">
            <div className="text-sm font-bold text-brand-700 dark:text-brand-100">
              {describeFa(rule)}
            </div>
            {preview.length > 0 && (
              <div className="mt-1.5 space-y-0.5 text-xs text-gray-500 dark:text-gray-300">
                {preview.map((p) => (
                  <div key={p.toISOString()}>
                    {formatJalaliWeekday(p)}
                    <span className="text-gray-400"> ({formatGregorianSmall(p)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {initial && (
            <button
              type="button"
              onClick={() => onSave(null)}
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400"
            >
              حذف تکرار
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            لغو
          </button>
          <button
            type="button"
            disabled={!rule}
            onClick={() => rule && onSave(rule)}
            className="flex-1 rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            ثبت
          </button>
        </div>
      </div>
    </div>
  );
}
