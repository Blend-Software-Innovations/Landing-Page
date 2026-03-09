import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  isDev
    ? {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname"
          }
        }
      }
    : {
        level: "info",
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level(label: string) {
            return { level: label };
          }
        }
      }
);

/** Returns a child logger with a request ID attached to every log line. */
export function withRequestId(reqId: string) {
  return logger.child({ reqId });
}
