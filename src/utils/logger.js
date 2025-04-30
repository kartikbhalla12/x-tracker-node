import path from "path";
import winston from "winston";
import "winston-daily-rotate-file";

import { getCurrentTimeIST } from "@utils/date.js";

const __dirname = path.resolve();

const createLogFormat = () => winston.format.printf(
  ({ level, message, timestamp, ...meta }) => {
    const data = Object.keys(meta).length ? `, ${JSON.stringify(meta)}` : "";
    return `${level}: [${timestamp}]: ${message}${data}`;
  }
);

const createISTTimestamp = () => winston.format((info) => {
  info.timestamp = getCurrentTimeIST();
  return info;
});

const createTransports = () => {
  const logFormat = createLogFormat();
  const istTimestamp = createISTTimestamp();
  const baseFormat = winston.format.combine(istTimestamp(), logFormat);

  const transports = [
    new winston.transports.DailyRotateFile({
      dirname: path.join(__dirname, "logs"),
      filename: "%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "10m",
      maxFiles: "7d",
      level: "info",
      format: baseFormat,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, "logs", "error.log"),
      level: "error",
      format: baseFormat,
    }),
  ];

  if (process.env.NODE_ENV !== "production") {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          istTimestamp(),
          logFormat
        ),
      })
    );
  }

  return transports;
};

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(createISTTimestamp()(), createLogFormat()),
  transports: createTransports(),
});

export default logger;
