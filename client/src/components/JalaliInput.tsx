import { useMemo, useState } from 'react';
import { FA_MONTHS, jalaliToDate, monthLength, todayJalali, toFaDigits } from '../lib/jalali';
import type { JDate } from '../lib/jalali';

interface Props {
  value: string | null;
  onChange: (iso: string | null) => void;
}

/** ورودی تاریخ شمسی با سلکت روز/ماه/سال + دکمه‌های سریع */
export default function JalaliInput({ value, onChange }: Props) {
  const today = useMemo(() => todayJalali(), []);
  const initial: JDate | null = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const jy = Number(
      new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric' }).format(d),
    );
    const jm = Number(
      new Intl.DateTimeFormat('en-u-ca-persian', { month: 'numeric' }).format(d),
    );
    const jd = Number(
      new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric' }).format(d),
    );
    return { jy, jm, jd };
  }, [value]);

  const [jy, setJy] = useState<number>(initial?.jy ?? today.jy);
  const [jm, setJm] = useState<number>(initial?.jm ?? today.jm);
  const [jd, setJd] = useState<number>(initial?.jd ?? today.jd);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = today.jy - 2; y <= today.jy + 5; y++) arr.push(y);
    return arr;
  }, [today.jy]);

  const days = useMemo(() => {
    const len = monthLength(jy, jm);
    const arr: number[] = [];
    for (let d = 1; d <= len; d++) arr.push(d);
    return arr;
  }, [jy, jm]);

  function commit(y: number, m: number, d: number): void {
    const len = monthLength(y, m);
    const dd = Math.min(d, len);
    onChange(jalaliToDate(y, m, dd).toISOString());
  }

  function setToday(): void {
    setJy(today.jy);
    setJm(today.jm);
    setJd(today.jd);
    onChange(jalaliToDate(today.jy, today.jm, today.jd).toISOString());
  }

  function setTomorrow(): void {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const iJy = Number(new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric' }).format(t));
    const iJm = Number(new Intl.DateTimeFormat('en-u-ca-persian', { month: 'numeric' }).format(t));
    const iJd = Number(new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric' }).format(t));
    setJy(iJy);
    setJm(iJm);
    setJd(iJd);
    onChange(jalaliToDate(iJy, iJm, iJd).toISOString());
  }

  const sel =
    'rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          بدون تاریخ
        </button>
        <button
          type="button"
          onClick={setToday}
          className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs text-brand-700 dark:bg-brand-600/20 dark:text-brand-100"
        >
          امروز
        </button>
        <button
          type="button"
          onClick={setTomorrow}
          className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs text-brand-700 dark:bg-brand-600/20 dark:text-brand-100"
        >
          فردا
        </button>
      </div>
      <div className="flex gap-2">
        <select
          className={`${sel} flex-1`}
          value={jd}
          onChange={(e) => {
            const d = Number(e.target.value);
            setJd(d);
            commit(jy, jm, d);
          }}
          aria-label="روز"
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {toFaDigits(d)}
            </option>
          ))}
        </select>
        <select
          className={`${sel} flex-[1.4]`}
          value={jm}
          onChange={(e) => {
            const m = Number(e.target.value);
            setJm(m);
            commit(jy, m, jd);
          }}
          aria-label="ماه"
        >
          {FA_MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          className={`${sel} flex-1`}
          value={jy}
          onChange={(e) => {
            const y = Number(e.target.value);
            setJy(y);
            commit(y, jm, jd);
          }}
          aria-label="سال"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {toFaDigits(y)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
