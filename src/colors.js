// Zero-dependency ANSI styling with NO_COLOR and TTY detection

const isColorSupported = () => {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.TERM === 'dumb') return false;
  if (process.env.FORCE_COLOR === '0') return false;
  if (process.env.FORCE_COLOR === '1' || process.env.FORCE_COLOR === 'true') return true;
  return Boolean(process.stdout && process.stdout.isTTY);
};

export const supportsColor = isColorSupported();

const wrap = (open, close) => (str) => {
  if (!supportsColor) return String(str);
  return `\x1b[${open}m${str}\x1b[${close}m`;
};

export const bold = wrap(1, 22);
export const dim = wrap(2, 22);
export const red = wrap(31, 39);
export const green = wrap(32, 39);
export const yellow = wrap(33, 39);
export const blue = wrap(34, 39);
export const magenta = wrap(35, 39);
export const cyan = wrap(36, 39);
export const gray = wrap(90, 39);

// Strip ANSI escape codes to calculate visual string lengths
export const stripAnsi = (str) => {
  if (typeof str !== 'string') return String(str);
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
};
