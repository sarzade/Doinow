import { useMemo, useState } from 'react';
import type { Task } from '../lib/api';
import {
  FA_MONTHS,
  gregorianToJalali,
  jalaliToDate,
  monthLength,
  todayJalali,
  toFaDigits,
} from '../lib/jalali';

interface Props {
  tasks: Task[];
  onSelectDay: (isoDay: string | null) => void;
  selectedDay: string | null;
}

/** تقویم ماهانه شمسی؛ شنبه اول هفته */
export default function MonthCalendar({ tasks, onSelectDay, selectedDay }: Props) {
  const today = useMemo(() => todayJalali(), []);
  const [jy, setJy] = useState(today.jy);
  const [jm, setJm] = useState(today.jm);

  const cells = useMemo(() => {
    // روز هفته‌ی اول ماه: شنبه=0 ... جمعه=6
    const first = jalaliToDate(jy, jm, 1);
    const offset = (first.getDay() + 1) % 7;
    const len = monthLength(jy, jm);
    const arr: (number | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= len; d++) arr.push(d);
    return arr;
  }, [jy, jm]);

  const countByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of tasks) {
      if (!t.dueDate || t.isDone) continue;
      const d = new Date(t.dueDate);
      const j = gregorianToJalali(d);
      if (j.jy === jy && j.jm === jm) map.set(j.jd, (map.get(j.jd) ?? 0) + 1);
    }
    return map;
  }, [tasks, jy, jm]);

  function prevMonth(): void {
    if (jm === 1) {
      setJm(12);
      setJy(jy - 1);
    } else setJm(jm - 1);
  }

  function nextMonth(): void {
    if (jm === 12) {
      setJm(1);
      setJy(jy + 1);
    } else setJm(jm + 1);
  }

  function dayIso(day: number): string {
    return jalaliToDate(jy, jm, day).toISOString();
  }

  const weekHeads = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-full bg-gray-100 px-3 py-1 text-lg leading-none dark:bg-gray-800"
          aria-label="ماه قبل"
        >
          ‹
        </button>
        <div className="text-[15px] font-bold">
          {FA_MONTHS[jm - 1]} {toFaDigits(jy)}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-full bg-gray-100 px-3 py-1 text-lg leading-none dark:bg-gray-800"
          aria-label="ماه بعد"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400">
        {weekHeads.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const isToday = day === today.jd && jm === today.jm && jy === today.jy;
          const iso = dayIso(day);
          const selected =
            selectedDay !== null &&
            new Date(selectedDay).toDateString() === new Date(iso).toDateString();
          const count = countByDay.get(day) ?? 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(selected ? null : iso)}
              className={`flex flex-col items-center rounded-xl py-1.5 text-sm ${
                selected
                  ? 'bg-brand-600 text-white'
                  : isToday
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>{toFaDigits(day)}</span>
              {count > 0 && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    selected ? 'bg-white' : 'bg-brand-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          setJy(today.jy);
          setJm(today.jm);
        }}
        className="mt-2 w-full rounded-xl bg-gray-50 py-1.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-300"
      >
        بازگشت به ماه جاری
      </button>
    </div>
  );
}
