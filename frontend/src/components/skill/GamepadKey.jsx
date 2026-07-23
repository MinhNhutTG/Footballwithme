const KIND_STYLES = {
  cir: 'border-red-400/50 bg-red-500/20 text-red-300',
  sq: 'border-pink-400/50 bg-pink-500/20 text-pink-300',
  tri: 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300',
  cross: 'border-blue-400/50 bg-blue-500/20 text-blue-300',
  default: 'border-fwm-line bg-fwm-pill text-fwm-text',
};

function GamepadKey({ kind = 'default', label }) {
  const shape = kind === 'default' ? 'rounded-fwm-sm px-2.5' : 'rounded-full';
  return (
    <span
      className={`inline-flex h-8 min-w-8 items-center justify-center border font-head text-xs font-bold ${shape} ${
        KIND_STYLES[kind] || KIND_STYLES.default
      }`}
    >
      {label}
    </span>
  );
}

export default GamepadKey;
