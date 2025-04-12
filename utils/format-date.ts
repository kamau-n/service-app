import { formatDistanceToNow } from "date-fns";

export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate();
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return "";
  }
}
