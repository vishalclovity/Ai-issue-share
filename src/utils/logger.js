const formatMessage = (level, ...args) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (args.length === 1 && typeof args[0] === 'string') {
    return `${prefix} ${args[0]}`;
  }
  
  return `${prefix} ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ')}`;
};

export const logger = {
  info: (...args) => console.log(formatMessage('info', ...args)),
  warn: (...args) => console.warn(formatMessage('warn', ...args)),
  error: (...args) => console.error(formatMessage('error', ...args)),
};
