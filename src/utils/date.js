import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getCurrentTimeIST = () =>
  dayjs().tz("Asia/Kolkata").format("DD MMM YYYY, hh:mm:ss A");
