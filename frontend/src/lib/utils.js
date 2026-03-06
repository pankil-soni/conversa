/**
 * Shared helpers used across multiple components.
 */
import { marked } from "marked";

/* ─── date / time formatting ───────────────────────────────────────────── */

export const isToday = (date) =>
  new Date(date).toDateString() === new Date().toDateString();

export const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(date).toDateString() === yesterday.toDateString();
};

export const formatDateLabel = (date) => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return new Date(date).toLocaleDateString();
};

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const getLastSeenString = (lastSeen) => {
  if (!lastSeen) return "";
  let str = "last seen ";
  if (isToday(lastSeen)) str += "today ";
  else if (isYesterday(lastSeen)) str += "yesterday ";
  else str += `on ${new Date(lastSeen).toLocaleDateString()} `;
  str += `at ${formatTime(lastSeen)}`;
  return str;
};

/* ─── markdown ─────────────────────────────────────────────────────────── */

export const markdownToHtml = (text) => {
  if (!text) return { __html: "" };
  return { __html: marked(text) };
};

/* ─── shared scrollbar style (Chakra sx prop) ──────────────────────────── */

export const scrollbarSx = {
  "&::-webkit-scrollbar": { width: "5px", height: "5px" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "gray.300",
    borderRadius: "5px",
  },
  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "gray.400" },
  "&::-webkit-scrollbar-track": { display: "none" },
};
