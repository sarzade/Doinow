import { useMemo, useState } from 'react';
import type { Task } from '../lib/api';
import { expandRange, type OccurrenceItem } from '../lib/expand';
import {
  addDays,
  FA_MONTHS,
  formatTimeFa,
  gregorianToJalali,
  toFaDigits,
} from '../lib/jalali';

interface Props {
  tasks: Task[];
  listColor: (listId: string | null) => string;
  onOpenTask: (t: Task) => void;
  onCreateAt: (d: Date) => void;
}

const HOUR_START = 6;
const HOUR_END = 24;
const PX_PER_HOUR = 52;
const GRID_H = (HOUR_END - HOUR_START) * PX_PER_HOUR;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** شنبه هفته‌ای که تاریخ در آن است (هفته شنبه تا جمعه) */
export function saturdayOf(date: Date): Date {
  const back = (date.getDay() + 1) % 7; // فاصله تا شنبه گذشته
  return addDays(startOfDay(date), -back);
}

const DAY_LETTERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/** نمای هفته‌ای ساعتی مثل Any.do — شنبه تا جمعه، راست‌به‌چپ */
export default function WeekCalendar({ tasks, listColor, onOpenTask, onCreateAt }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => addDays(saturdayOf(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const weekEnd = useMemo(() => {
    const e = addDays(weekStart, 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }, [weekStart]);

  const byDay = useMemo(() => {
    const m = new Map<string, OccurrenceItem[]>();
    for (const it of expandRange(tasks, weekStart, weekEnd)) {
      if (!it.date) continue;
      const k = startOfDay(it.date).getTime();
      const arr = m.get(String(k)) ?? [];
      arr.push(it);
      m.set(String(k), arr);
    }
    return m;
  }, [tasks, weekStart, weekEnd]);

  const now = new Date();
  const todayKey = String(startOfDay(now).getTime());
  const showNowLine = days.some((d) => String(startOfDay(d).getTime()) === todayKey);
  const nowTop = (now.getHours() + now.getMinutes() / 60 - HOUR_START) * PX_PER_HOUR;

  const j0 = gregorianToJalali(days[0] as Date);
  const j6 = gregorianToJalali(days[6] as Date);
  const title =
    j0.jm === j6.jm
      ? `${FA_MONTHS[j0.jm - 1]} ${toFaDigits(j0.jy)}`
      : `${FA_MONTHS[j0.jm - 1]} – ${FA_MONTHS[j6.jm - 1]}`;

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i),
    [],
  );

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, day: Date): void {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hh = Math.max(HOUR_START, Math.min(HOUR_END - 1, Math.floor(y / PX_PER_HOUR + HOUR_START)));
    const d = new Date(day);
    d.setHours(hh, 0, 0, 0);
    onCreateAt(d);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 p-2 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setWeekOffset((v) => v - 1)}
          className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800"
          aria-label="هفته قبل"
        >
          ›
        </button>
        <button type="button" onClick={() => setWeekOffset(0)} className="text-sm font-black">
          {title}
        </button>
        <button
          type="button"
          onClick={() => setWeekOffset((v) => v + 1)}
          className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800"
          aria-label="هفته بعد"
        >
          ‹
        </button>
      </div>

      <div
        className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] border-b border-gray-100 text-center dark:border-gray-800"
        dir="rtl"
      >
        <div />
        {days.map((d, i) => {
          const isToday = String(startOfDay(d).getTime()) === todayKey;
          return (
            <div key={d.toISOString()} className="py-1.5">
              <div className={`text-[10px] ${isToday ? 'font-black text-brand-600' : 'text-gray-400'}`}>
                {DAY_LETTERS[i]}
              </div>
              <div className={`text-base font-black ${isToday ? 'text-brand-600' : ''}`}>
                {toFaDigits(d.getDate())}
              </div>
            </div>
          );
        })}
      </div>

      <div className="nice-scroll max-h-[52svh] overflow-y-auto">
        <div className="relative">
          <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))]" dir="rtl">
            <div className="relative" style={{ height: GRID_H }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute w-full pr-1 text-left text-[10px] text-gray-400"
                  style={{ top: (h - HOUR_START) * PX_PER_HOUR + 2 }}
                >
                  {toFaDigits(String(h).padStart(2, '0'))}
                </div>
              ))}
            </div>

            {days.map((d) => {
              const list = byDay.get(String(startOfDay(d).getTime())) ?? [];
              return (
                <div
                  key={d.toISOString()}
                  onClick={(e) => handleColumnClick(e, d)}
                  className="relative border-r border-gray-100 dark:border-gray-800/70"
                  style={{ height: GRID_H }}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/70"
                      style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                    />
                  ))}
                  {list.map((it, i) => {
                    const dt = it.date as Date;
                    const top = Math.max(
                      0,
                      Math.min(
                        GRID_H - 48,
                        (dt.getHours() + dt.getMinutes() / 60 - HOUR_START) * PX_PER_HOUR,
                      ),
                    );
                    const lane = i % 3;
                    const color = listColor(it.task.listId);
                    return (
                      <button
                        key={it.task.id + dt.toISOString()}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTask(it.task);
                        }}
                        className="absolute overflow-hidden rounded-lg border-r-2 px-1 py-0.5 text-right"
                        style={{
                          top: top + lane * 8,
                          height: 46,
                          right: 2 + lane * 3,
                          left: 2,
                          zIndex: 10 + lane,
                          background: `${color}26`,
                          borderColor: color,
                        }}
                      >
                        <div className="truncate text-[11px] font-bold leading-4">{it.task.title}</div>
                        <div className="text-[10px] text-gray-500">{formatTimeFa(dt)}</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {showNowLine && nowTop >= 0 && nowTop <= GRID_H && (
            <div
              className="pointer-events-none absolute flex items-center"
              style={{ top: nowTop, right: 44, left: 0 }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <span className="h-0.5 flex-1 bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
