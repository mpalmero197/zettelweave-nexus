import { format, isToday, isYesterday, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export interface DateSeparator {
  type: 'date-separator';
  label: string;
  date: string;
}

export type ChatItem = (Message & { type: 'message' }) | DateSeparator;

/**
 * Format a timestamp into a human-readable relative string.
 * "Just now", "2m ago", "1h ago", "Yesterday", "Jan 12"
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const mins = differenceInMinutes(now, date);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hrs = differenceInHours(now, date);
  if (hrs < 24) return `${hrs}h ago`;

  if (isYesterday(date)) return 'Yesterday';

  const days = differenceInDays(now, date);
  if (days < 7) return format(date, 'EEEE'); // "Monday"

  return format(date, 'MMM d'); // "Jan 12"
}

/**
 * Get a date label for a separator pill.
 */
function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

/**
 * Insert date separators between messages from different days.
 */
export function groupMessagesByDate(messages: Message[]): ChatItem[] {
  if (messages.length === 0) return [];

  const items: ChatItem[] = [];
  let lastDateKey = '';

  for (const msg of messages) {
    const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');

    if (dateKey !== lastDateKey) {
      items.push({
        type: 'date-separator',
        label: getDateLabel(msg.created_at),
        date: dateKey,
      });
      lastDateKey = dateKey;
    }

    items.push({ ...msg, type: 'message' });
  }

  return items;
}

/**
 * Detect if a message contains only emoji (no text).
 */
export function isEmojiOnly(text: string): boolean {
  // Strip whitespace
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Match emoji sequences including modifiers, ZWJ sequences, flags
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\u200D|\uFE0F|\s)+$/u;
  return emojiRegex.test(trimmed) && trimmed.length <= 20; // cap to avoid huge emoji-only messages
}
