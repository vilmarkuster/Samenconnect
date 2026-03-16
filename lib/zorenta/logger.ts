const PREFIX = "[Zorenta]";

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.log(PREFIX, message, meta ?? "");
    }
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(PREFIX, message, meta ?? "");
  },
  error(message: string, err?: unknown) {
    console.error(PREFIX, message, err);
  },
};
