const path = require("path");
const fs = require("fs");
const { createLogger, format, transports } = require("winston");

const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const customFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(
    ({ timestamp, level, message, ...meta }) =>
      `[${timestamp}] ${level}: ${message}${
        Object.keys(meta).length ? " " + JSON.stringify(meta) : ""
      }`
  )
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  transports: [
    new transports.Console({
      format: consoleFormat,
    }),
    new transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

module.exports = logger;
