import { NavLink } from 'react-router-dom';

function MobileMenu({ open, onClose, navItems, onLogout, logoutLabel }) {
  if (!open) return null;

  return (
    <div className="border-t border-fwm-line bg-fwm-bg-elev px-4 py-4 lg:hidden">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `rounded-fwm px-3 py-2.5 font-head text-sm font-bold ${
                isActive
                  ? 'bg-fwm-accent text-fwm-ink'
                  : 'text-fwm-text hover:bg-fwm-pill'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {onLogout && (
          <button
            type="button"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="rounded-fwm px-3 py-2.5 text-left font-head text-sm font-bold text-fwm-pink hover:bg-fwm-pill"
          >
            {logoutLabel}
          </button>
        )}
      </nav>
    </div>
  );
}

export default MobileMenu;
