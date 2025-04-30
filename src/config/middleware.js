import morgan from "morgan";
import logger from "@utils/logger.js";

export const configureMorgan = () => {
  return [
    morgan("combined", {
      stream: logger.stream,
      skip: (_req, res) => res.statusCode >= 400,
    }),
    morgan("combined", {
      stream: {
        write: (message) => logger.error(message.trim()),
      },
      skip: (_req, res) => res.statusCode < 400,
    }),
  ];
}; 