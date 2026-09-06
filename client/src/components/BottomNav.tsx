import type { Tab } from '../store/useStore';

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
}

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  {
    id: 'today',
    label: 'امروز',
    icon: 'M12 3l2.5 5.3 5.5.7-4 4 1 5.7-5-2.8-5 2.8 1-5.7-4-4 5.5-.7L12 3z',
  },
  {
    id: 'lists',
    label: 'لیست‌ها',
    icon: 'M4 6h16M4 12h16M4 18h10',
  },
  {
    id: 'calendar',
    label: 'تقویم',
    icon: 'M5 5h14v13H5zM5 9h14M9 3v4M15 3v4',
  },
  {
    id: 'search',
    label: 'جستجو',
    icon: 'M11 5a6 6 0 104.2 10.3L20 20l1-1-4.7-4.8A6 6 0 0011 5zm0 2a4 4 0 110 8 4 4 0 010-8z',
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    icon: 'M12 8.5A3.5 3.5 0 1012 15.5 3.5 3.5 0 0012 8.5zM20 12a8 8 0 01-.2 1.7l2 1.6-2 3.4-2.4-1a8 8 0 01-2.9 1.7L14 21h-4l-.5-2.6a8 8 0 01-2.9-1.7l-2.4 1-2-3.4 2-1.6A8 8 0 014 12c0-.6.1-1.1.2-1.7l-2-1.6 2-3.4 2.4 1a8 8 0 012.9-1.7L10 3h4l.5 2.6a8 8 0 012.9 1.7l2.4-1 2 3.4-2 1.6c.1.6.2 1.1.2 1.7z',
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
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
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
