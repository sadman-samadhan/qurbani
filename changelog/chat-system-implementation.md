# Changelog — Chat System Implementation

**Branch**: `chat-system-implementation`  
**Merged into**: `main`  
**Date**: 2026-05-13

---

## Summary

Full end-to-end messaging system for QurbaniSathi. Users can now send messages directly to listing owners from the dashboard map. Conversations are tied to specific share request listings for context.

---

## New Features

### Messaging (`/messages`, `/messages/[requestId]/[userId]`)

- **Inbox page** (`/messages`): Lists all conversations for the current user, sorted by most recent message. Each row shows the other user's name, listing context (shares + area), last message preview, and an unread count badge.
- **Thread page** (`/messages/[requestId]/[userId]`): Full conversation view with real-time message delivery via Supabase Realtime. Sends and marks messages read on open.
- **Optimistic UI**: Sent messages appear immediately before the server confirms.
- **Graceful degradation**: If the originating listing is deleted, the thread shows an expiry banner but remains fully accessible.
- **Empty states**: Inbox and thread both have contextual empty state prompts.

### Dashboard Integration

- **"Send Message" button** on the bottom sheet now navigates to the correct thread URL instead of showing a "coming soon" toast.
- **Conditional CTA layout**: When a listing has no phone or WhatsApp number, "Send Message" renders as a full-width primary button. When contact info exists, it renders as a secondary button below WhatsApp/Call.
- **Messages nav button**: Removed `disabled` state and "soon" badge. Clicking navigates to `/messages`.
- **Unread badge on nav**: The Messages icon in the bottom nav shows a live unread count (capped at "9+"). Updates in real time via Supabase channel subscription.

### Realtime

- Supabase Realtime enabled on the `messages` table.
- Per-thread channel subscription updates message list without page refresh.
- Global channel in dashboard layout keeps the nav badge current.

---

## Database Changes

**Migration**: `supabase/migrations/002_chat_system.sql`

| Change | Detail |
|--------|--------|
| `messages.request_id` column | Nullable UUID FK → `share_requests(id) ON DELETE SET NULL`. Preserves conversations when a listing is deleted. |
| Indexes | `idx_messages_receiver_id`, `idx_messages_sender_id`, `idx_messages_thread` (compound), `idx_messages_unread` (partial — unread only) |
| RLS UPDATE policy | Receivers can mark their own messages as read (`read = true`). Previously only SELECT and INSERT were allowed. |
| Realtime publication | `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages` |

---

## Partial Implementation Completions

### Show Name / Anonymity Toggle

Previously the anonymity toggle existed in the post-request form UI but `show_name` was never persisted.

- **DB**: Added `show_name boolean NOT NULL DEFAULT false` column to `share_requests`.
- **RPC**: Updated `get_nearby_requests` to JOIN `profiles` and return `full_name` only when `show_name = true`. Privacy enforced at DB level — `full_name` is never leaked when `show_name = false`.
- **Post-request form**: `show_name` state now included in the `insert` call.
- **Dashboard bottom sheet**: Avatar initial and name label both respect `show_name`. Displays "Anonymous User" / "পরিচয় গোপন" when off.
- **Public map**: Same conditional display applied to listing popups/bottom sheet.

### PWA Icons

`manifest.json` referenced `/images/icon-192.png` and `/images/icon-512.png` which did not exist, silently breaking PWA install prompts.

- Added `scripts/generate-pwa-icons.mjs` (one-time sharp script).
- Generated `public/images/icon-192.png` and `public/images/icon-512.png` from `logo-big.png`.
- `manifest.json` paths unchanged — files now exist.

### Internationalisation (next-intl Integration)

Language state was previously page-local (`const [lang, setLang]`). Changing language on one page had no effect elsewhere.

- `i18n/request.ts` now reads locale from a cookie (default `"bn"`).
- New server action `app/actions/locale.ts` — sets the locale cookie (1-year expiry), called from client-side toggles followed by `router.refresh()`.
- `app/layout.tsx` wraps the tree with `NextIntlClientProvider` using locale + messages from the server.
- `messages/en.json` and `messages/bn.json` expanded with full string coverage across all namespaces: `location`, `requests`, `profile`, `map_page`, `post`, `forgot`, `landing`, `Chat`.
- Auth and dashboard components migrated to `useTranslations()`.
- All `TRANSLATIONS` inline objects, `localStorage` language reads/writes, and `const [lang, setLang]` state removed from migrated pages.

---

## Testing

**Playwright E2E test suite added** (`e2e/`):

| File | Scenarios |
|------|-----------|
| `e2e/chat-inbox.spec.ts` | Authenticated navigation, empty state, conversation appears after send, unread badge, unauthenticated redirect |
| `e2e/chat-thread.spec.ts` | Thread load, listing context header, send message, optimistic UI, mark-read on open, expired listing banner, self-message edge case |
| `e2e/chat-dashboard-integration.spec.ts` | Bottom sheet button navigation, conditional CTA layout (with/without phone), nav button enabled, unread badge on nav |
| `e2e/chat-realtime.spec.ts` | Cross-context realtime delivery (two browser sessions), nav badge increments on incoming message |

**Supporting files**:

- `playwright.config.ts` — Chromium, sequential (shared Supabase state), `reuseExistingServer`
- `e2e/fixtures/auth.ts` — shared `loginAs()` helper
- `e2e/global-setup.ts` — test user seeding and data cleanup via service role key
- `.env.test.local` (gitignored) — service role key + test credentials

**Script added**: `"test:e2e": "playwright test"` in `package.json`

---

## Files Changed

```
app/(protected)/messages/page.tsx                    ← new (inbox)
app/(protected)/messages/[requestId]/[userId]/page.tsx ← new (thread)
app/(protected)/dashboard/page.tsx                   ← modified
app/layout.tsx                                       ← modified (NextIntlClientProvider)
app/actions/locale.ts                                ← new
app/(auth)/login/page.tsx                            ← modified (useTranslations)
app/(auth)/register/page.tsx                         ← modified (useTranslations)

supabase/migrations/002_chat_system.sql              ← new

messages/en.json                                     ← expanded
messages/bn.json                                     ← expanded

i18n/request.ts                                      ← modified (cookie-based locale)

public/images/icon-192.png                           ← new (generated)
public/images/icon-512.png                           ← new (generated)
scripts/generate-pwa-icons.mjs                       ← new (one-time script)

e2e/fixtures/auth.ts                                 ← new
e2e/global-setup.ts                                  ← new
e2e/chat-inbox.spec.ts                               ← new
e2e/chat-thread.spec.ts                              ← new
e2e/chat-dashboard-integration.spec.ts               ← new
e2e/chat-realtime.spec.ts                            ← new
playwright.config.ts                                 ← new
```

---

## Known Limitations

- Inbox grouping is client-side (JS-level deduplication). Acceptable at current scale; a Postgres view can replace it later if needed.
- Phase 3 (next-intl) migration is partial — admin pages and some lower-priority routes retain inline translations.
- PWA install prompt not verified on a physical Android device (Chrome DevTools manifest check only).
- Realtime tests require Supabase Realtime to be enabled on the `messages` table before running.
