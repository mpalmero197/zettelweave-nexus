# PendragonX Changelog

All notable changes to PendragonX are documented in this file.

---

## [Unreleased] — 2026-05-26

### Added

- **Author Agent — Long-Document Generation & Progress Tracking**
  - Author Agent now generates documents of any requested length by breaking them into sections (5,000–7,000 words each) and processing them sequentially.
  - Added an accurate, real-time progress bar that tracks:
    - Percentage of work completed
    - Current stage (Gathering style, Creating outline, Writing Section N/X, Polishing, Saving)
    - Words written vs. target word count
    - Estimated time remaining (ETA) based on elapsed time and progress rate
  - Added a **Use My Writing Style** toggle; when enabled, the agent analyzes the user’s existing notes to infer tone, vocabulary, and phrasing and applies it to generated documents.

- **Alice / ALICE — SSO Handoff & Website Navigation**
  - Alice can now open external PendragonX pages (e.g., Catalyst) and automatically sign the user in using the Toolbox session.
  - If the user is not yet signed in on the web app, Alice redirects them through the SSO handoff flow before landing them on the requested page.
  - New `SsoHandoff` page handles token exchange and redirects securely.

- **PendragonX Toolbox — Visual Overhaul**
  - Integrated Alice’s updated design language throughout the Toolbox for a cohesive look.
  - Improved layout density, spacing, and typography across the full-window and popup views.

- **Authentication — Branded Transactional Emails**
  - All Supabase auth emails (signup, invite, magic link, recovery, email change, reauthentication) are now fully branded as **PendragonX**.
  - Email subjects prefixed with "PendragonX Registration" (or equivalent) for immediate recognition.
  - Emails include the PendragonX logo and a consistent dark-themed HTML layout (`#282d39` primary, `#1d2128` brand-gray).
  - Sender domain configured as `notify.pendragonx.com`.

### Changed

- **Alice Mobile UI — Usability & Real Estate**
  - Redesigned the Alice popup for mobile to maximize usable screen space.
  - Improved the full-window Alice experience on mobile with better touch targets, scrolling, and responsive layout.
  - Enhanced voice-recognition handling to reduce duplicate words during speech-to-text input on mobile devices.

- **Alice Chat UI**
  - Removed the bottom caption text: **“ALICE shows its work · streaming reasoning”** to reduce visual clutter.

---

## [Previous] — 2026-05-25

> Earlier releases are documented in git history and project memory files.

---

## Format

This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format:

- **Added** — New features.
- **Changed** — Updates to existing functionality.
- **Deprecated** — Soon-to-be removed features.
- **Removed** — Removed features.
- **Fixed** — Bug fixes.
- **Security** — Security-related changes.
