import { useState } from 'react';
import { toFaDigits } from '../lib/jalali';
import { useStore, type FilterBy, type SortBy } from '../store/useStore';

const SORTS: { v: SortBy; label: string }[] = [
  { v: 'date', label: 'تاریخ' },
  { v: 'priority', label: 'اولویت' },
  { v: 'alpha', label: 'الفبا' },
];

const FILTERS: { v: FilterBy; label: string }[] = [
  { v: 'all', label: 'همه' },
  { v: 'overdue', label: 'فقط معوق' },
  { v: 'recurring', label: 'فقط تکرارشونده' },
];

/** منوی ⋯ : مرتب‌سازی، فیلتر، پاک‌سازی انجام‌شده‌ها */
export default function ViewMenu() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const doneCount = s.tasks.filter((t) => t.isDone).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="منوی نما"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-500 dark:bg-gray-800 dark:text-gray-300"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-10 z-50 w-52 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="px-2 pb-1 pt-1.5 text-[11px] text-gray-400">مرتب‌سازی</div>
            {SORTS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => {
                  s.setSort(o.v);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {o.label}
                {s.sortBy === o.v && <span className="text-brand-600">✓</span>}
              </button>
            ))}
            <div className="mx-2 my-1 border-t border-gray-100 dark:border-gray-800" />
            <div className="px-2 pb-1 text-[11px] text-gray-400">فیلتر</div>
            {FILTERS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => {
                  s.setFilter(o.v);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {o.label}
                {s.filterBy === o.v && <span className="text-brand-600">✓</span>}
              </button>
            ))}
            <div className="mx-2 my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              type="button"
              disabled={doneCount === 0}
              onClick={() => {
                setOpen(false);
                if (window.confirm(`${toFaDigits(doneCount)} تسک انجام‌شده برای همیشه حذف شود؟`))
                  void s.clearDone();
              }}
              className="w-full rounded-xl px-3 py-2 text-right text-sm text-red-500 disabled:opacity-40"
            >
              پاک‌سازی انجام‌شده‌ها ({toFaDigits(doneCount)})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
