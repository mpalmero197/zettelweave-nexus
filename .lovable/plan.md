

# Engagement Nudge Notifications (Every 4-6 Hours)

## Overview

Create a new scheduled edge function that sends periodic engagement push notifications to users who have push enabled. Notifications rotate between content-aware messages (longest note, most recent note, most-edited note) and inspirational messages.

## Step 1: New Edge Function `send-engagement-nudges`

Create `supabase/functions/send-engagement-nudges/index.ts` that:

1. Queries all users who have push subscriptions
2. Checks a `last_nudge_sent_at` timestamp per user (new column on `profiles`) to enforce 4-6 hour spacing
3. Randomly picks one of these notification types:
   - **Longest note**: Finds user's note with the most content -- "Your note '{title}' has grown to {word_count} words -- keep building!"
   - **Most recent note**: "You last worked on '{title}' -- ready to continue?"
   - **Habit streak**: If user has active habits -- "Don't break your streak! You've been consistent for {n} days"
   - **Inspirational quote**: Random from a curated list -- "Small steps every day lead to big results"
4. Sends via the same VAPID/Web Push encryption logic already in `send-reminders` (extract shared push utility)
5. Updates `last_nudge_sent_at` after sending

## Step 2: Database Changes

- Add `last_nudge_sent_at TIMESTAMPTZ` column to `profiles` table
- Add `engagement_nudges_enabled BOOLEAN DEFAULT TRUE` to `profiles` (opt-out toggle)

## Step 3: Schedule with pg_cron

Schedule the function to run every hour. The function itself will check the 4-6 hour gap per user (randomized slightly to avoid all notifications at the same time).

## Step 4: Settings Toggle

Add an "Engagement Nudges" toggle in the existing Settings > AI & Automation tab (or a new "Notifications" section) so users can opt out.

## Step 5: Shared Push Utility

Extract the VAPID JWT creation, HKDF, AES-128-GCM encryption, and `sendPushNotification` function into a shared module (`supabase/functions/_shared/webpush.ts`) to avoid duplicating ~150 lines between `send-reminders` and `send-engagement-nudges`. Both functions will import from the shared module.

## Technical Notes

- The nudge function reuses the existing `push_subscriptions` table and VAPID keys
- Notifications use the existing `push-sw.js` service worker
- The randomized 4-6 hour interval is achieved by adding a random offset (0-2 hours) to a 4-hour base when checking `last_nudge_sent_at`
- Curated ~15 inspirational messages embedded in the function, mixed with data-driven content messages

