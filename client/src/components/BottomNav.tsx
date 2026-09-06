import type { Tab } from '../store/useStore';

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
}

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  {
    id: 'myday',
    label: 'روز من',
    icon: 'M12 4a8 8 0 100 16 8 8 0 000-16zm0 3a5 5 0 110 10 5 5 0 010-10zm0 3a2 2 0 100 4 2 2 0 000-4z',
  },
  {
    id: 'week',
    label: '۷ روز',
    icon: 'M5 6h14v13H5zM5 10h14M9 3v4M15 3v4M9 13h3M9 16h5',
  },
  {
    id: 'all',
    label: 'همه',
    icon: 'M5 12.5l4.5 4.5L19 7.5',
  },
  {
    id: 'lists',
    label: 'لیست‌ها',
    icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z',
  },
  {
    id: 'calendar',
    label: 'تقویم',
    icon: 'M5 6h14v13H5zM5 10h14M9 3v4M15 3v4',
  },
];

export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-lg">
        {ITEMS.map((it) => {
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${
                active ? 'text-brand-600 dark:text-brand-100' : 'text-gray-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={it.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
