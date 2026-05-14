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


# Dashboard and Request Management Improvements
**Date: May 14, 2026**

This phase focused on refining the dashboard UX, resolving database permission issues, and introducing flexible request management (Editing/Privacy).

## Core Improvements

### 1. Dashboard UI/UX & Map Fixes
- **Z-Index Layering**: Resolved a critical issue where the Leaflet map overlapped the details bottom sheet. The sheet now stays on top of all map controls.
- **Map Visualization**: Updated the map to display **all open share requests** as markers, providing better visibility of the platform's activity, while keeping the horizontal cards exclusively for **nearby requests** (within 2km).
- **Location Setup**:
  - Added a "Location Tip" (English & Bengali) advising users to use approximate locations if their exact point is missing.
  - Fixed "Drop a Pin" map rendering by ensuring it defaults to the user's current location or Dhaka.
  - Implemented redirection logic so that changing location from the "Add Request" page returns you to that page instead of the dashboard.

### 2. Request Management (Post/Edit/Fill)
- **Edit Feature**: Created a dedicated Edit page (`/edit-request/[id]`) allowing users to modify their active listings.
- **Mark as Filled**: Fixed a `403 Forbidden` error by updating Supabase RLS policies to allow users to update their own requests.
- **My Requests Page**: Added a prominent, descriptive "Post a new request" button at the bottom of the list to improve discoverability for users with multiple posts.
- **Smart Filtering**: Filtered the user's own posts out of the "Nearby Requests" horizontal list to prevent redundant entries, while keeping their own pins visible on the map for confirmation.

### 3. Privacy & Anonymity
- **Consistent Toggles**: Standardized anonymity settings into "Hide my name" and "Hide phone number".
- **Privacy Defaults**: Both name and phone number are now visible by default (`false`), with explicit "Hide" toggles.
- **Dynamic Action Buttons**: Dashboard cards now automatically switch the primary contact action from "WhatsApp" to "In-app Chat" if the user has chosen to hide their phone number.

## Database & Infrastructure Updates

### SQL Migrations (Applied manually)
- **Column Renaming**: Renamed `show_name` to `hide_name` and added `hide_phone` for consistent logic.
- **RLS Policy Fixes**:
  - Added a policy to allow users to read their own requests regardless of status (`open`, `filled`, `expired`).
  - Strengthened `UPDATE` policies to ensure users can transition their posts to "filled" status without permission errors.
- **RPC Redefinition**: Redefined the `get_nearby_requests` function to explicitly return the new column structure and avoid PostgREST cache issues.

## Internationalization (i18n)
- Added translations for:
  - "Edit Post" and "Update" flows.
  - Location accuracy tips.
  - Updated privacy toggle labels.
  - Generic "Post a new request" CTA (removed "first").

```

---

# Join System Implementation (Backend)
**Date: May 14, 2026**

Implemented the foundation for the collaborative "Join System", allowing users to request to join others' listings and form Qurbani groups.

## Database & Schema (003_join_system.sql)
- **New Tables**:
  - `request_members`: Tracks membership status (`pending`, `approved`, `cancelled`) and shares taken.
  - `join_approvals`: Multi-member voting system where all existing members must approve a new joiner.
  - `notifications`: Centralized notification system for join requests, approvals, and system messages.
- **Automated Sync & Logic (Triggers)**:
  - `sync_shares_filled`: Automatically updates `share_requests.shares_filled` as members are approved.
  - `check_all_approved`: Server-side logic that auto-approves a joiner once all required votes are 'approved'.
  - `check_any_rejected`: Instantly cancels a request if any member rejects the applicant.
- **Row Level Security**: Comprehensive policies ensuring users only see relevant members, approvals, and their own notifications.

## Server-Side Logic (Next.js API Routes)
- **POST `/api/join-request`**:
  - Validates capacity and eligibility.
  - Initializes the voting process by creating `join_approvals` for all current group members (including the owner).
  - Sends initial notifications to approvers.
- **POST `/api/join-request/respond`**:
  - Handles member votes.
  - Broadcasts notifications to the group and applicant once a consensus (or rejection) is reached.
  - Uses `SUPABASE_SERVICE_ROLE_KEY` to securely manage multi-user state transitions.

## Realtime Support
- Enabled Supabase Realtime for `request_members` and `notifications` to power live UI updates.

---

# Join System Expansion & Group Messaging
**Date: May 14, 2026**

This phase integrated the Join System into the core user experience and introduced "fan-out" messaging for listing groups.

## Dashboard & Join Flow
- **Member List View**: Listings on the dashboard now show all approved members and their share counts.
- **Dynamic Join Button**: Replaced static buttons with a multi-state "Join / Pending / Joined" logic.
- **Join Modal**: Implemented a slide-up numeric selector that respects group capacity (max 7 shares).
- **Group Capacity Visualization**: Added a 7-box visual to the bottom sheet showing current vs requested shares.

## Advanced Messaging (Fan-out)
- **POST `/api/listing-message`**:
  - Implemented a "Group Message" fallback using a fan-out pattern.
  - Messages sent to a listing thread are now automatically distributed to all approved members and the original owner.
  - Integrated with the notification system to alert all group members of new activity.
- **Thread UI Integration**: Updated the message thread page to use the new server-side fan-out logic.

## Logic & Polish
- **Cancellation API**: Created `/api/join-request/cancel` for applicants to withdraw pending requests.
- **Notifications Bell**: Added a functional, real-time notification panel to the dashboard top bar.
- **Approval Page**: Built `/notifications/approve` for members to vote on applicants with a real-time capacity preview.
- **I18n**: Added comprehensive Bengali translations for all join-related actions and statuses.


# Final UI Refinements & Landing Page Updates
**Date: May 14, 2026**

This phase focused on visual polish, accessibility for returning users, and resolving layout desync issues.

## UI/UX Enhancements
- **Privacy First (Dashboard)**: Removed the requester's name from the dashboard bottom sheet to focus on the **Area Name** as the primary identifier. This resolves "Anonymous User" display issues and prioritizes listing context.
- **Layering & Visibility**:
  - Increased the `z-index` for the **Top Bar**, **Notification Panel**, and **FAB (Post Button)** to ensure they are never overlapped by Leaflet map markers or tooltips.
  - Standardized the notification panel's z-index to `5000` for consistent accessibility.
- **Map Clarity**: Updated map markers to display the **total combined shares** (Owner + Approved Members). If an owner wants 3 shares and a member joins with 2, the marker now correctly shows **5**.

## Landing Page Improvements
- **Quick Login**: Added a bordered **Login button** with backdrop blur directly under the main CTA buttons on the hero section for faster access by returning users.
- **Feature Messaging**:
  - Updated the "How it Works" section to highlight **In-app Chat** alongside WhatsApp.
  - Renamed "Direct WhatsApp contact" feature badge to **"WhatsApp & In-app Chat"** to reflect the platform's enhanced communication tools.

## Localization & Copy
- Updated `en.json` and `bn.json` with new strings for:
  - "WhatsApp & In-app Chat" feature descriptions.
  - Revised "How it Works" steps in both languages.



