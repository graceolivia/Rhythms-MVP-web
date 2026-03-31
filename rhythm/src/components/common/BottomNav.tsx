import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTaskStore } from '../../stores/useTaskStore';
import { useCoinStore } from '../../stores/useCoinStore';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: '○', activeIcon: '●' },
  { to: '/challenges', label: 'Challenges', icon: '🌱', activeIcon: '🌱' },
  { to: '/tasks', label: 'Tasks', icon: '◠', activeIcon: '☽' },
  { to: '/shop', label: 'Shop', icon: '◎', activeIcon: '◎' },
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
    case 'Challenges':
      return (
        <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M12 22V12M12 12C12 9 14 6 17 5c-1 3-3 5-5 7zM12 12C12 9 10 6 7 5c1 3 3 5 5 7z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 5a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
    case 'Tasks':
      return (
        <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          {isActive && <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      );
    case 'Collections':
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          {/* Stamp body */}
          <rect x="5" y="5" width="14" height="14" rx="1"
            fill={isActive ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth={isActive ? 0 : 2}
          />
          {/* Side perforations */}
          {[8, 12, 16].map(y => (
            <g key={y}>
              <line x1="3" y1={y} x2="5.5" y2={y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.5" y1={y} x2="21" y2={y} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
          ))}
          {[8, 12, 16].map(x => (
            <g key={x}>
              <line x1={x} y1="3" x2={x} y2="5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1={x} y1="18.5" x2={x} y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
          ))}
          {/* Flower center */}
          <circle cx="12" cy="12" r="2.5"
            fill={isActive ? 'white' : 'none'}
            stroke={isActive ? 'none' : 'currentColor'}
            strokeWidth="1.5"
          />
        </svg>
      );
    case 'Shop':
      return (
        <svg className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" fill={isActive ? 'white' : 'none'} stroke={isActive ? 'none' : 'currentColor'} strokeWidth={1.5} />
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

function CoinsBadge() {
  const coins = useCoinStore((state) => state.coins);
  return (
    <span className="absolute -top-1 -right-2 min-w-[20px] h-4 px-1 bg-terracotta text-cream text-[10px] font-medium rounded-full flex items-center justify-center">
      {coins > 999 ? '999+' : coins}
    </span>
  );
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
                  {item.label === 'Tasks' && <SeedsBadge />}
                  {item.label === 'Shop' && <CoinsBadge />}
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
