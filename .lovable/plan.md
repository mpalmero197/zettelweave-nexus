
# Site Export Feature -- Complete Overhaul

## Overview

Rebuild the codebase export utility to be comprehensive, accurate, and include everything needed to deploy the app independently. The current implementation has a hardcoded file list that is stale (missing 40+ files), references deleted components, and the fetch-based approach for source files is unreliable. The overhaul replaces this with a complete, auto-maintained file registry, adds a proper export UI with progress tracking, and produces a production-ready deployment package.

## Current Problems

- **Stale file list**: Missing ~40 files added since the list was written -- all agents/ components, most catalyst/ components, most friends/ components, several widgets, newer pages (Agents, Changelog), newer hooks (useAgents), newer types (agents.ts), newer edge functions (generate-mindmap, execute-agent, run-tool-tests), and new admin components (AdminSectionHeader, AdminCommandPalette, adminNavItems)
- **References deleted file**: Still lists `AnalyticsDashboard.tsx` which was deleted
- **Unreliable source fetching**: Uses `fetch('/' + filePath)` which doesn't work for most source files via Vite dev server -- only built/public assets are served this way
- **Hardcoded schema**: The database schema SQL is a 550-line hardcoded string that may drift from actual migrations
- **Outdated Docker images**: References old Supabase image versions
- **No export progress UI**: Export runs silently with no feedback except a toast at the end
- **No user data export option toggle**: Always attempts to export user data which may not be wanted
- **README has wrong port**: References 5173 but Vite is configured for 8080

## File Changes

### 1. Rewrite `src/utils/codebaseExport.ts`

Major changes:

**Complete file registry**: Replace the current list with every file in the project, organized by category. Add all missing files:
- Pages: `Agents.tsx`, `Changelog.tsx`
- Types: `agents.ts`
- Hooks: `useAgents.ts`
- Components: all 6 agents/, all 8 catalyst/, all 7 friends/, `MindMap.tsx`, `ImportStudio.tsx`, `RecorderStudio.tsx`, `SecurityActivityLog.tsx`, `SEOBreadcrumb.tsx`, `SEOHead.tsx`, `DashboardGrid.tsx`, `MobileOptimizedLayout.tsx`, `MobileTouchHandler.tsx`
- Widgets: `ToolHealthWidget.tsx`
- Admin: `AdminSectionHeader.tsx`, `AdminCommandPalette.tsx`, `ToolTester.tsx`, `adminNavItems.ts`
- Edge functions: `generate-mindmap`, `execute-agent`, `run-tool-tests`
- Utils: `codebaseExport.ts` itself, `chatUtils.ts`
- Remove deleted `AnalyticsDashboard.tsx`

**Inline source content**: Since fetching source files via HTTP doesn't work reliably, switch to having the export function embed file contents at build time. Each source file will be imported as a raw string using Vite's `?raw` import suffix for critical config files, and the remaining files will be fetched from the GitHub-connected repository via Supabase edge function.

Actually, a simpler and more robust approach: Create a new edge function `export-codebase` that uses the Supabase service role to read all files from the project's storage or simply generate all the generated content (schema, docker, scripts, README) and let the client-side handle the source file fetching. The current fetch approach actually works for files that exist in `public/` and the source tree when served by Vite in dev mode -- the issue is that Vite only serves files under the project root. Since this runs in the browser with access to the Lovable preview, the fetches should work for the actual deployed build.

The better fix: Keep the fetch-based approach but make it resilient -- log which files succeed/fail and include a manifest of what was exported vs what was skipped.

**Updated README**: Fix port to 8080, add Lovable AI Gateway info, update edge function secrets list to include `LOVABLE_API_KEY`, improve deployment instructions with step-by-step verification checklist.

**Updated package.json**: Sync all dependencies with current versions (add missing ones like `@tiptap/extension-character-count`, `@tiptap/extension-placeholder`, `@types/d3-force`).

**Updated schema**: Add any tables/functions that may be missing from the hardcoded schema.

**Updated Docker**: Bump image versions, add Realtime service for live subscriptions.

### 2. Update Admin Export UI in `src/pages/Admin.tsx`

Enhance the `system-export` section:
- Add a progress bar showing export stages (Fetching source files... Adding database schema... Packaging...)
- Add checkboxes for optional export components: Include user data, Include Docker config, Include deployment scripts
- Show a summary after export: X files packaged, Y skipped, total size
- Add a "What's New" callout showing this is the overhauled export

### 3. Update `src/utils/codebaseExport.ts` export function signature

Change `exportCodebase` to accept options and return a result summary:
```
interface ExportOptions {
  includeUserData: boolean;
  includeDocker: boolean;
  includeDeployScripts: boolean;
  onProgress: (stage: string, percent: number) => void;
}
interface ExportResult {
  filesIncluded: number;
  filesSkipped: string[];
  totalSize: number;
}
```

## Technical Details

- No new dependencies -- uses existing JSZip, file-saver
- No new edge functions -- the existing `export-user-data` is kept as-is
- The file list update adds approximately 45 new entries and removes 1 deleted entry
- README is updated to ~300 lines with comprehensive deployment guide including Vercel, Netlify, Cloudflare Pages, and self-hosted Docker instructions
- Export remains restricted to authorized admin email
- Progress callback enables the Admin UI to show real-time export status
