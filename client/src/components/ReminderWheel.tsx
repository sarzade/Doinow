import { useMemo, useRef, useState } from 'react';
import { addDays, formatJalali, toFaDigits, FA_WEEKDAYS } from '../lib/jalali';

interface Props {
  initial: Date | null;
  onSet: (d: Date | null) => void;
  onClose: () => void;
}

/** ویل انتخاب تاریخ/ساعت شمسی مثل Any.do: روز / ساعت / دقیقه + لغو/ثبت */
export default function ReminderWheel({ initial, onSet, onClose }: Props) {
  const days = useMemo(() => {
    const arr: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) arr.push(addDays(now, i));
    return arr;
  }, []);

  const initIdx = useMemo(() => {
    if (!initial) return 0;
    const t = new Date(initial).getTime();
    const i = days.findIndex(
      (d) =>
        d.getFullYear() === new Date(t).getFullYear() &&
        d.getMonth() === new Date(t).getMonth() &&
        d.getDate() === new Date(t).getDate(),
    );
    return i >= 0 ? i : 0;
  }, [initial, days]);

  const [dayIdx, setDayIdx] = useState(initIdx);
  const [hour, setHour] = useState(initial ? new Date(initial).getHours() : 9);
  const [minute, setMinute] = useState(initial ? new Date(initial).getMinutes() : 0);

  const dayRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>, idx: number): void {
    const el = ref.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function pickDay(i: number): void {
    setDayIdx(i);
    scrollTo(dayRef, i);
  }

  function setTomorrow(): void {
    pickDay(1);
  }

  function setNextWeek(): void {
    pickDay(7);
  }

  function handleSet(): void {
    const d = new Date(days[dayIdx] as Date);
    d.setHours(hour, minute, 0, 0);
    onSet(d);
  }

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const colCls = 'nice-scroll h-56 flex-1 snap-y snap-mandatory overflow-y-auto py-24';
  const cellCls = (active: boolean): string =>
    `block w-full snap-center rounded-2xl px-1 py-2 text-center text-lg ${
      active ? 'bg-brand-600 font-black text-white' : 'text-gray-400 dark:text-gray-500'
    }`;

  function dayLabel(d: Date, i: number): string {
    if (i === 0) return 'امروز';
    if (i === 1) return 'فردا';
    return `${FA_WEEKDAYS[d.getDay()]} ${formatJalali(d)}`;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="sheet-enter w-full max-w-lg rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] dark:bg-gray-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 px-5 pt-4">
          {(
            [
              { label: 'فردا', fn: setTomorrow },
              { label: 'هفته بعد', fn: setNextWeek },
              { label: 'یه روز', fn: () => onSet(null) },
            ] as const
          ).map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.fn}
              className="flex-1 rounded-full bg-gray-100 py-2 text-sm font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 px-4 pt-2" dir="rtl">
          <div ref={dayRef} className={`${colCls} flex-[2]`}>
            {days.map((d, i) => (
              <button key={d.toISOString()} type="button" onClick={() => pickDay(i)} className={cellCls(i === dayIdx)}>
                <span className="text-base">{dayLabel(d, i)}</span>
              </button>
            ))}
          </div>
          <div ref={hourRef} className={colCls} dir="ltr">
            {hours.map((hh) => (
              <button
                key={hh}
                type="button"
                onClick={() => {
                  setHour(hh);
                  scrollTo(hourRef, hh);
                }}
                className={cellCls(hh === hour)}
              >
                {toFaDigits(String(hh).padStart(2, '0'))}
              </button>
            ))}
          </div>
          <div ref={minRef} className={colCls} dir="ltr">
            {minutes.map((mm) => (
              <button
                key={mm}
                type="button"
                onClick={() => {
                  setMinute(mm);
                  scrollTo(minRef, mm);
                }}
                className={cellCls(mm === minute)}
              >
                {toFaDigits(String(mm).padStart(2, '0'))}
              </button>
            ))}
          </div>
        </div>

        <div className="flex border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-center font-bold text-gray-500"
          >
            لغو
          </button>
          <div className="w-px bg-gray-200 dark:bg-gray-800" />
          <button
            type="button"
            onClick={handleSet}
            className="flex-1 py-4 text-center font-black text-brand-600"
          >
            ثبت
          </button>
        </div>
      </div>
    </div>
  );
}
