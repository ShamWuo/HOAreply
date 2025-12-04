type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const formatLog = (level: LogLevel, message: string, context?: LogContext) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ?? {}),
  };

  return JSON.stringify(payload);
};

export const logInfo = (message: string, context?: LogContext) => {
  console.log(formatLog("info", message, context));
};

export const logWarn = (message: string, context?: LogContext) => {
  console.warn(formatLog("warn", message, context));
};

export const logError = (message: string, context?: LogContext) => {
  console.error(formatLog("error", message, context));
};
