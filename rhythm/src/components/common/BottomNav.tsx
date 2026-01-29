import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTaskStore } from '../../stores/useTaskStore';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: '○', activeIcon: '●' },
  { to: '/timeline', label: 'Timeline', icon: '◇', activeIcon: '◆' },
  { to: '/seeds', label: 'Seeds', icon: '◠', activeIcon: '☽' },
  { to: '/garden', label: 'Garden', icon: '❀', activeIcon: '✿' },
  { to: '/challenges', label: 'Challenges', icon: '★', activeIcon: '★' },
  { to: '/settings', label: 'Settings', icon: '⚙', activeIcon: '⚙' },
];

function NavIcon({ item, isActive }: { item: NavItem; isActive: boolean }) {
  // Custom SVG icons for a cleaner look
  switch (item.label) {
    case 'Today':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2}>
          <circle cx="12" cy="12" r="10" />
          {isActive && <circle cx="12" cy="12" r="4" fill="currentColor" />}
        </svg>
      );
    case 'Timeline':
      return (
        <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'Seeds':
      return (
        <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 22c4-4 8-7.5 8-12a8 8 0 10-16 0c0 4.5 4 8 8 12z" />
          {!isActive && <path d="M12 12v6M9 15h6" strokeLinecap="round" />}
        </svg>
      );
    case 'Garden':
      return (
        <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 22V12M12 12C12 9 9 6 6 6c0 3 3 6 6 6zM12 12c0-3 3-6 6-6 0 3-3 6-6 6z" />
          <circle cx="12" cy="5" r="3" />
        </svg>
      );
    case 'Challenges':
      return (
        <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6L12 2z" />
        </svg>
      );
    case 'Settings':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    default:
      return <span className="text-xl">{isActive ? item.activeIcon : item.icon}</span>;
  }
}

function SeedsBadge() {
  const taskInstances = useTaskStore((state) => state.taskInstances);

  const count = useMemo(() => {
    return taskInstances.filter(
      (instance) => instance.status === 'deferred'
    ).length;
  }, [taskInstances]);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-cream border border-bark/20 text-bark/60 text-[10px] rounded-full flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-cream border-t border-bark/10 pb-safe">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center w-14 h-full transition-colors ${
                isActive ? 'text-bark' : 'text-bark/40'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <NavIcon item={item} isActive={isActive} />
                  {item.label === 'Seeds' && <SeedsBadge />}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
