import { Link } from 'react-router-dom';

const VARIANTS = {
  primary:
    'bg-fwm-accent text-fwm-ink hover:brightness-95 shadow-fwm',
  ghost:
    'bg-fwm-pill text-fwm-text border border-fwm-line hover:bg-fwm-card',
};

function Button({ to, href, variant = 'primary', className = '', children, ...rest }) {
  const classes = `font-head inline-flex items-center justify-center gap-2 rounded-fwm-pill px-5 py-3 text-sm font-bold transition active:scale-95 ${VARIANTS[variant]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
