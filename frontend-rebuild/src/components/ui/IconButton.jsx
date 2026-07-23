function IconButton({ label, active = false, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
        active ? 'border-fwm-accent bg-fwm-accent text-fwm-ink' : 'border-fwm-line bg-fwm-pill text-fwm-text hover:bg-fwm-card'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default IconButton;