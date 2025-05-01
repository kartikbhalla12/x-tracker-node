import { getCurrentTimeIST } from "@utils/date.js";

const logLevels = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug'
};

const log = (level, message, meta = {}) => {
  const timestamp = getCurrentTimeIST();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    console.log(logMessage, meta);
  } else {
    console.log(logMessage);
  }
};

export default {
  error: (message, meta) => log(logLevels.error, message, meta),
  warn: (message, meta) => log(logLevels.warn, message, meta),
  info: (message, meta) => log(logLevels.info, message, meta),
  debug: (message, meta) => log(logLevels.debug, message, meta)
};
