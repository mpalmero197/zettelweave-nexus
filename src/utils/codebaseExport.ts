import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES
// ============================================================

interface FileEntry {
  path: string;
  content: string;
}

export interface ExportOptions {
  includeUserData: boolean;
  includeDocker: boolean;
  includeDeployScripts: boolean;
  onProgress: (stage: string, percent: number) => void;
}

export interface ExportResult {
  filesIncluded: number;
  filesSkipped: string[];
  totalSize: number;
}

// ============================================================
// COMPLETE FILE REGISTRY
// ============================================================

const ALL_PROJECT_FILES: string[] = [
  // ===== ROOT CONFIG =====
  'vite.config.ts',
  'tailwind.config.ts',
  'eslint.config.js',
  'index.html',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'postcss.config.js',
  'components.json',

  // ===== MAIN SOURCE =====
  'src/main.tsx',
  'src/App.tsx',
  'src/App.css',
  'src/index.css',
  'src/vite-env.d.ts',

  // ===== TYPES =====
  'src/types/zettel.ts',
  'src/types/dashboard.ts',
  'src/types/global.d.ts',
  'src/types/agents.ts',

  // ===== HOOKS =====
  'src/hooks/useAuth.ts',
  'src/hooks/useZettelCards.ts',
  'src/hooks/useSimilarContent.ts',
  'src/hooks/useDashboardLayout.ts',
  'src/hooks/use-mobile.tsx',
  'src/hooks/use-toast.ts',
  'src/hooks/useActivityTracker.ts',
  'src/hooks/useAgents.ts',
  'src/hooks/useAnimationPreference.ts',
  'src/hooks/useCardLimit.ts',
  'src/hooks/useDraggable.ts',
  'src/hooks/useIntelligentCache.ts',
  'src/hooks/useOfflineMode.ts',
  'src/hooks/useOfflineZettelCards.ts',
  'src/hooks/usePWAInstall.ts',
  'src/hooks/useScrollAnimation.ts',
  'src/hooks/useSearchHistory.ts',
  'src/hooks/useSmartLinking.ts',
  'src/hooks/useSubscription.ts',
  'src/hooks/useThemeVariant.ts',

  // ===== UTILITIES =====
  'src/lib/utils.ts',
  'src/utils/deweySystem.ts',
  'src/utils/security.ts',
  'src/utils/exportUtils.ts',
  'src/utils/categoryUtils.ts',
  'src/utils/chatUtils.ts',
  'src/utils/codebaseExport.ts',
  'src/utils/contrastChecker.ts',
  'src/utils/encryption.ts',
  'src/utils/errorReporter.ts',
  'src/utils/fileImportUtils.ts',
  'src/utils/googleDriveImport.ts',
  'src/utils/importTracking.ts',
  'src/utils/logger.ts',
  'src/utils/mediaExportUtils.ts',
  'src/utils/oneDriveImport.ts',
  'src/utils/catalystExportUtils.ts',
  'src/utils/catalystSocialExportUtils.ts',

  // ===== PAGES =====
  'src/pages/Index.tsx',
  'src/pages/Auth.tsx',
  'src/pages/Admin.tsx',
  'src/pages/Agents.tsx',
  'src/pages/Changelog.tsx',
  'src/pages/NotFound.tsx',
  'src/pages/Landing.tsx',
  'src/pages/Settings.tsx',
  'src/pages/Subscription.tsx',
  'src/pages/Install.tsx',
  'src/pages/PrivacyPolicy.tsx',
  'src/pages/TermsOfService.tsx',

  // ===== COMPONENTS =====
  'src/components/AccountManagement.tsx',
  'src/components/AIAssistantSidebar.tsx',
  'src/components/AIEditDialog.tsx',
  'src/components/AISearchBar.tsx',
  'src/components/AppLayout.tsx',
  'src/components/AttachmentDisplay.tsx',
  'src/components/AttachmentSelector.tsx',
  'src/components/AudioManager.tsx',
  'src/components/AvatarEditor.tsx',
  'src/components/BulletJournal.tsx',
  'src/components/Calendar.tsx',
  'src/components/CardActionsMenu.tsx',
  'src/components/CardMergeDialog.tsx',
  'src/components/CardViewer.tsx',
  'src/components/Catalyst.tsx',
  'src/components/CatalystEditor.tsx',
  'src/components/CatalystImportDialog.tsx',
  'src/components/ConfirmDialog.tsx',
  'src/components/ContentSummarizer.tsx',
  'src/components/ContextualInsightsPanel.tsx',
  'src/components/ContrastChecker.tsx',
  'src/components/CookieConsent.tsx',
  'src/components/CosmicBackground.tsx',
  'src/components/CreateCardDialog.tsx',
  'src/components/CustomThemeBuilder.tsx',
  'src/components/CustomizableDashboard.tsx',
  'src/components/Dashboard.tsx',
  'src/components/DashboardCustomizer.tsx',
  'src/components/DashboardGrid.tsx',
  'src/components/DashboardWidgetSidebar.tsx',
  'src/components/DebugLogger.tsx',
  'src/components/DeleteAllCardsDialog.tsx',
  'src/components/DesktopWhiteboard.tsx',
  'src/components/DocumentViewerLegacy.tsx',
  'src/components/EditCardDialog.tsx',
  'src/components/EditNoteDialog.tsx',
  'src/components/EncryptedBadge.tsx',
  'src/components/EncryptionPasswordDialog.tsx',
  'src/components/EncryptionToggle.tsx',
  'src/components/EnhancedImportDialog.tsx',
  'src/components/FastLoadingFallback.tsx',
  'src/components/FeatureRequestDialog.tsx',
  'src/components/FileManager.tsx',
  'src/components/FileUploadDialog.tsx',
  'src/components/FileViewer.tsx',
  'src/components/FloatingChatBubble.tsx',
  'src/components/Footer.tsx',
  'src/components/Graph3D.tsx',
  'src/components/GraphViewHeavy.tsx',
  'src/components/GraphViewNew.tsx',
  'src/components/GraphViewPremium.tsx',
  'src/components/HabitTracker.tsx',
  'src/components/ImportDialog.tsx',
  'src/components/ImportHistoryPanel.tsx',
  'src/components/ImportStudio.tsx',
  'src/components/InfiniteWhiteboard.tsx',
  'src/components/IntelligentCacheIndicator.tsx',
  'src/components/LandingBackground.tsx',
  'src/components/LoadingSpinner.tsx',
  'src/components/MaterialTabBar.tsx',
  'src/components/MediaRecorder.tsx',
  'src/components/MediaUpload.tsx',
  'src/components/MeetingRecorder.tsx',
  'src/components/MindMap.tsx',
  'src/components/MinimalHeader.tsx',
  'src/components/MinimalSidebar.tsx',
  'src/components/MobileBottomNav.tsx',
  'src/components/MobileDetector.tsx',
  'src/components/MobileHeader.tsx',
  'src/components/MobileNavigation.tsx',
  'src/components/MobileOptimizedLayout.tsx',
  'src/components/MobileTouchHandler.tsx',
  'src/components/MobileWhiteboard.tsx',
  'src/components/NavigationBar.tsx',
  'src/components/Notebooks.tsx',
  'src/components/Notes.tsx',
  'src/components/OfflineDataManager.tsx',
  'src/components/OfflineModeIndicator.tsx',
  'src/components/OrganizationMethodDialog.tsx',
  'src/components/PWAInstallPrompt.tsx',
  'src/components/PomodoroTimer.tsx',
  'src/components/PremiumBadge.tsx',
  'src/components/RecommendationSidebar.tsx',
  'src/components/RecorderStudio.tsx',
  'src/components/RecordingsLibrary.tsx',
  'src/components/RecycleBin.tsx',
  'src/components/ResizableGrid.tsx',
  'src/components/RightSidebar.tsx',
  'src/components/ScratchPad.tsx',
  'src/components/SEOBreadcrumb.tsx',
  'src/components/SEOHead.tsx',
  'src/components/SearchBar.tsx',
  'src/components/SearchHistorySidebar.tsx',
  'src/components/SearchResultsCanvas.tsx',
  'src/components/SearchResultsDialog.tsx',
  'src/components/SecurityActivityLog.tsx',
  'src/components/SecurityNotice.tsx',
  'src/components/SimilarContentDialog.tsx',
  'src/components/SkipToMain.tsx',
  'src/components/SmartLinkingSidebar.tsx',
  'src/components/StickyNotes.tsx',
  'src/components/StickyNotesEnhanced.tsx',
  'src/components/StickyNotesSimple.tsx',
  'src/components/TaskManager.tsx',
  'src/components/ThemeLivePreview.tsx',
  'src/components/ThemePreview.tsx',
  'src/components/ThemeVariantSelector.tsx',
  'src/components/UnifiedHeader.tsx',
  'src/components/UnifiedSearchResults.tsx',
  'src/components/UpgradeBanner.tsx',
  'src/components/VaultImportDialog.tsx',
  'src/components/WordDefinitionPopover.tsx',
  'src/components/WorkflowManager.tsx',
  'src/components/ZettelCard.tsx',

  // ===== ADMIN COMPONENTS =====
  'src/components/admin/AdminAuditLog.tsx',
  'src/components/admin/AdminCommandPalette.tsx',
  'src/components/admin/AdminOverview.tsx',
  'src/components/admin/AdminSectionHeader.tsx',
  'src/components/admin/AdminSidebar.tsx',
  'src/components/admin/adminNavItems.ts',
  'src/components/admin/CodeEditor.tsx',
  'src/components/admin/ContentModeration.tsx',
  'src/components/admin/CookieAnalytics.tsx',
  'src/components/admin/DocumentationViewer.tsx',
  'src/components/admin/DomainManagement.tsx',
  'src/components/admin/ErrorReportsPanel.tsx',
  'src/components/admin/FeatureRequestsPanel.tsx',
  'src/components/admin/SecurityMonitor.tsx',
  'src/components/admin/SystemSettings.tsx',
  'src/components/admin/ToolTester.tsx',
  'src/components/admin/UserManagement.tsx',

  // ===== AGENT COMPONENTS =====
  'src/components/agents/AgentActivityFeed.tsx',
  'src/components/agents/AgentConfigFields.tsx',
  'src/components/agents/AgentDetail.tsx',
  'src/components/agents/AgentPipelineBuilder.tsx',
  'src/components/agents/AgentsOverview.tsx',
  'src/components/agents/CreateAgentDialog.tsx',

  // ===== CATALYST COMPONENTS =====
  'src/components/catalyst/CatalystComments.tsx',
  'src/components/catalyst/CatalystFindReplace.tsx',
  'src/components/catalyst/CatalystOutlinePanel.tsx',
  'src/components/catalyst/CatalystSnapshots.tsx',
  'src/components/catalyst/CatalystSplitEditor.tsx',
  'src/components/catalyst/CatalystStatsBar.tsx',
  'src/components/catalyst/CatalystWritingGoals.tsx',
  'src/components/catalyst/ChapterManager.tsx',

  // ===== FRIENDS COMPONENTS =====
  'src/components/friends/ChatPane.tsx',
  'src/components/friends/ChatPopup.tsx',
  'src/components/friends/CollabStudio.tsx',
  'src/components/friends/ContactSidebar.tsx',
  'src/components/friends/DiscoverSheet.tsx',
  'src/components/friends/FriendsPanel.tsx',
  'src/components/friends/RequestsSheet.tsx',

  // ===== WIDGET COMPONENTS =====
  'src/components/widgets/ActivityFeedWidget.tsx',
  'src/components/widgets/CalendarEventsWidget.tsx',
  'src/components/widgets/ContentSummarizerWidget.tsx',
  'src/components/widgets/CustomNoteWidget.tsx',
  'src/components/widgets/DatabaseWidget.tsx',
  'src/components/widgets/DocumentsWidget.tsx',
  'src/components/widgets/FavoritesWidget.tsx',
  'src/components/widgets/HabitTrackerWidget.tsx',
  'src/components/widgets/NotebookListWidget.tsx',
  'src/components/widgets/QuickCaptureWidget.tsx',
  'src/components/widgets/QuotesWidget.tsx',
  'src/components/widgets/RecentCardsWidget.tsx',
  'src/components/widgets/RecentNotesWidget.tsx',
  'src/components/widgets/SectionHeader.tsx',
  'src/components/widgets/StatsWidget.tsx',
  'src/components/widgets/TaskManagerWidget.tsx',
  'src/components/widgets/TaskTrackerWidget.tsx',
  'src/components/widgets/ToolHealthWidget.tsx',
  'src/components/widgets/WeatherWidget.tsx',
  'src/components/widgets/WelcomeWidget.tsx',

  // ===== UI COMPONENTS (shadcn/ui) =====
  'src/components/ui/accordion.tsx',
  'src/components/ui/alert-dialog.tsx',
  'src/components/ui/alert.tsx',
  'src/components/ui/aspect-ratio.tsx',
  'src/components/ui/avatar.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/breadcrumb.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/calendar.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/carousel.tsx',
  'src/components/ui/chart.tsx',
  'src/components/ui/checkbox.tsx',
  'src/components/ui/collapsible.tsx',
  'src/components/ui/command.tsx',
  'src/components/ui/context-menu.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/drawer.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/form.tsx',
  'src/components/ui/hover-card.tsx',
  'src/components/ui/input-otp.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/label.tsx',
  'src/components/ui/menubar.tsx',
  'src/components/ui/navigation-menu.tsx',
  'src/components/ui/pagination.tsx',
  'src/components/ui/popover.tsx',
  'src/components/ui/progress.tsx',
  'src/components/ui/radio-group.tsx',
  'src/components/ui/resizable.tsx',
  'src/components/ui/scroll-area.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/separator.tsx',
  'src/components/ui/sheet.tsx',
  'src/components/ui/sidebar.tsx',
  'src/components/ui/skeleton.tsx',
  'src/components/ui/slider.tsx',
  'src/components/ui/sonner.tsx',
  'src/components/ui/switch.tsx',
  'src/components/ui/table.tsx',
  'src/components/ui/tabs.tsx',
  'src/components/ui/textarea.tsx',
  'src/components/ui/toast.tsx',
  'src/components/ui/toaster.tsx',
  'src/components/ui/toggle-group.tsx',
  'src/components/ui/toggle.tsx',
  'src/components/ui/tooltip.tsx',
  'src/components/ui/unified-card.tsx',
  'src/components/ui/use-toast.ts',

  // ===== INTEGRATIONS =====
  'src/integrations/supabase/client.ts',
  'src/integrations/supabase/types.ts',

  // ===== STYLES =====
  'src/styles/grid-layout.css',

  // ===== SUPABASE CONFIG =====
  'supabase/config.toml',

  // ===== EDGE FUNCTIONS =====
  'supabase/functions/ai-assistant-chat/index.ts',
  'supabase/functions/ai-categorize-card/index.ts',
  'supabase/functions/ai-edit-card/index.ts',
  'supabase/functions/ai-reorganize-cards/index.ts',
  'supabase/functions/ai-search/index.ts',
  'supabase/functions/analyze-cache-patterns/index.ts',
  'supabase/functions/catalyst-ai-enhance-content/index.ts',
  'supabase/functions/catalyst-ai-generate-chapter/index.ts',
  'supabase/functions/catalyst-ai-generate-citations/index.ts',
  'supabase/functions/check-plagiarism/index.ts',
  'supabase/functions/check-subscription/index.ts',
  'supabase/functions/classify-intent/index.ts',
  'supabase/functions/create-checkout/index.ts',
  'supabase/functions/customer-portal/index.ts',
  'supabase/functions/dictionary-lookup/index.ts',
  'supabase/functions/execute-agent/index.ts',
  'supabase/functions/execute-workflows/index.ts',
  'supabase/functions/export-user-data/index.ts',
  'supabase/functions/fetch-url-content/index.ts',
  'supabase/functions/find-similar-content/index.ts',
  'supabase/functions/generate-embedding/index.ts',
  'supabase/functions/generate-image/index.ts',
  'supabase/functions/generate-mindmap/index.ts',
  'supabase/functions/generate-writing-suggestions/index.ts',
  'supabase/functions/run-tool-tests/index.ts',
  'supabase/functions/scratchpad-sync/index.ts',
  'supabase/functions/suggest-smart-links/index.ts',
  'supabase/functions/transcribe-audio-ai/index.ts',
  'supabase/functions/transcribe-audio/index.ts',
  'supabase/functions/web-search/index.ts',

  // ===== PUBLIC =====
  'public/robots.txt',
  'public/sitemap.xml',
  'public/favicon.ico',
  'public/favicon.png',
];

// ============================================================
// FILE FETCHER (resilient)
// ============================================================

const fetchSourceFiles = async (
  onProgress: (stage: string, percent: number) => void
): Promise<{ files: FileEntry[]; skipped: string[] }> => {
  const files: FileEntry[] = [];
  const skipped: string[] = [];
  const total = ALL_PROJECT_FILES.length;
  const batchSize = 10;

  for (let i = 0; i < total; i += batchSize) {
    const batch = ALL_PROJECT_FILES.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        const res = await fetch(`/${filePath}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const text = await res.text();
        // Skip HTML responses (Vite serves index.html for unknown routes)
        if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
          throw new Error('HTML fallback');
        }
        return { path: filePath, content: text };
      })
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        files.push(r.value);
      } else {
        skipped.push(batch[j]);
      }
    }

    const pct = Math.min(Math.round(((i + batch.length) / total) * 60), 60);
    onProgress('Fetching source files...', pct);
  }

  return { files, skipped };
};

// ============================================================
// GENERATED FILES
// ============================================================

const getPackageJson = (): string => {
  return JSON.stringify({
    "name": "pendragonx-knowledge-system",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview",
      "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
      "supabase:start": "supabase start",
      "supabase:stop": "supabase stop",
      "supabase:reset": "supabase db reset",
      "supabase:push": "supabase db push",
      "supabase:functions": "supabase functions serve"
    },
    "dependencies": {
      "@hookform/resolvers": "^3.10.0",
      "@marsidev/react-turnstile": "^1.3.1",
      "@radix-ui/react-accordion": "^1.2.11",
      "@radix-ui/react-alert-dialog": "^1.1.14",
      "@radix-ui/react-aspect-ratio": "^1.1.7",
      "@radix-ui/react-avatar": "^1.1.10",
      "@radix-ui/react-checkbox": "^1.3.2",
      "@radix-ui/react-collapsible": "^1.1.11",
      "@radix-ui/react-context-menu": "^2.2.15",
      "@radix-ui/react-dialog": "^1.1.14",
      "@radix-ui/react-dropdown-menu": "^2.1.15",
      "@radix-ui/react-hover-card": "^1.1.14",
      "@radix-ui/react-label": "^2.1.7",
      "@radix-ui/react-menubar": "^1.1.15",
      "@radix-ui/react-navigation-menu": "^1.2.13",
      "@radix-ui/react-popover": "^1.1.14",
      "@radix-ui/react-progress": "^1.1.7",
      "@radix-ui/react-radio-group": "^1.3.7",
      "@radix-ui/react-scroll-area": "^1.2.9",
      "@radix-ui/react-select": "^2.2.5",
      "@radix-ui/react-separator": "^1.1.7",
      "@radix-ui/react-slider": "^1.3.5",
      "@radix-ui/react-slot": "^1.2.3",
      "@radix-ui/react-switch": "^1.2.5",
      "@radix-ui/react-tabs": "^1.1.12",
      "@radix-ui/react-toast": "^1.2.14",
      "@radix-ui/react-toggle": "^1.1.9",
      "@radix-ui/react-toggle-group": "^1.1.10",
      "@radix-ui/react-tooltip": "^1.2.7",
      "@react-oauth/google": "^0.12.2",
      "@react-three/drei": "^9.122.0",
      "@react-three/fiber": "^8.18.0",
      "@supabase/storage-js": "^2.12.2",
      "@supabase/supabase-js": "^2.56.1",
      "@tanstack/react-query": "^5.85.6",
      "@tiptap/extension-character-count": "^3.19.0",
      "@tiptap/extension-color": "^3.8.0",
      "@tiptap/extension-image": "^3.8.0",
      "@tiptap/extension-placeholder": "^3.19.0",
      "@tiptap/extension-text-align": "^3.8.0",
      "@tiptap/extension-text-style": "^3.8.0",
      "@tiptap/extension-underline": "^3.8.0",
      "@tiptap/react": "^3.8.0",
      "@tiptap/starter-kit": "^3.8.0",
      "@xyflow/react": "^12.8.4",
      "class-variance-authority": "^0.7.1",
      "clsx": "^2.1.1",
      "cmdk": "^1.1.1",
      "d3": "^7.9.0",
      "d3-force": "^3.0.0",
      "date-fns": "^3.6.0",
      "docx": "^9.5.1",
      "dompurify": "^3.3.0",
      "embla-carousel-react": "^8.6.0",
      "epub-gen-memory": "^1.1.2",
      "fabric": "^7.1.0",
      "file-saver": "^2.0.5",
      "gapi-script": "^1.2.0",
      "html2canvas": "^1.4.1",
      "input-otp": "^1.4.2",
      "jspdf": "^4.1.0",
      "jszip": "^3.10.1",
      "lucide-react": "^0.462.0",
      "mammoth": "^1.11.0",
      "next-themes": "^0.4.6",
      "pdf-parse": "^2.4.5",
      "react": "^18.3.1",
      "react-colorful": "^5.6.1",
      "react-day-picker": "^8.10.1",
      "react-dom": "^18.3.1",
      "react-draggable": "^4.5.0",
      "react-grid-layout": "^1.5.2",
      "react-hook-form": "^7.61.1",
      "react-markdown": "^10.1.0",
      "react-resizable-panels": "^2.1.9",
      "react-router-dom": "^6.30.1",
      "react-swipeable": "^7.0.2",
      "recharts": "^2.15.4",
      "sonner": "^1.7.4",
      "tailwind-merge": "^2.6.0",
      "tailwindcss-animate": "^1.0.7",
      "three": "^0.158.0",
      "vaul": "^0.9.9",
      "vite-plugin-pwa": "^1.1.0",
      "zod": "^3.25.76"
    },
    "devDependencies": {
      "@types/d3": "^7.4.3",
      "@types/d3-force": "^3.0.10",
      "@types/dompurify": "^3.2.0",
      "@types/file-saver": "^2.0.7",
      "@types/gapi": "^0.0.47",
      "@types/node": "^20.11.0",
      "@types/react": "^18.3.3",
      "@types/react-dom": "^18.3.0",
      "@types/react-grid-layout": "^1.3.5",
      "@typescript-eslint/eslint-plugin": "^7.15.0",
      "@typescript-eslint/parser": "^7.15.0",
      "@vitejs/plugin-react-swc": "^0.8.0",
      "autoprefixer": "^10.4.19",
      "eslint": "^8.57.0",
      "eslint-plugin-react-hooks": "^4.6.2",
      "eslint-plugin-react-refresh": "^0.4.7",
      "postcss": "^8.4.38",
      "supabase": "^1.200.0",
      "tailwindcss": "^3.4.4",
      "typescript": "^5.2.2",
      "vite": "^5.3.4"
    }
  }, null, 2);
};

const getReadme = (): string => {
  return `# PendragonX — Advanced Knowledge Management System

A production-ready knowledge management platform built with **React 18**, **TypeScript**, **Vite**, and **Supabase**.

---

## Features

- **Zettelkasten Cards** — Interconnected knowledge cards with AI-powered linking
- **Rich Notes** — TipTap editor with full formatting
- **3D Graph View** — Interactive knowledge graph (Three.js / React Flow)
- **Infinite Whiteboard** — Visual thinking canvas (Fabric.js)
- **Catalyst Writer** — Long-form writing with chapters, citations, and AI assistance
- **AI Integration** — OpenAI-powered search, categorization, and content generation
- **Agents** — Autonomous background agents that monitor topics and surface insights
- **Workflows** — Scheduled research pipelines with web search
- **Social** — Friends, chat, content sharing, and real-time collaboration
- **Calendar & Tasks** — Built-in scheduling and task management
- **File Manager** — Cloud storage for documents, images, audio, and video
- **Audio/Video Recording** — In-app recording with AI transcription
- **PWA** — Installable with offline support
- **Admin Panel** — User management, security monitoring, analytics, and export
- **Encryption** — Optional client-side content encryption
- **Export** — PDF, Markdown, DOCX, EPUB, and full codebase export

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite |
| Styling | Tailwind CSS · shadcn/ui |
| State | React Query (TanStack) |
| Auth | Supabase Auth |
| Database | PostgreSQL + pgvector |
| Storage | Supabase Storage |
| Edge Functions | Deno (Supabase Edge Functions) |
| Visualization | React Flow · Three.js · D3.js |
| Canvas | Fabric.js |
| AI | OpenAI · Perplexity |

---

## Quick Start

### Prerequisites

- **Node.js 18+** (or Bun)
- **npm** or **bun**
- A **Supabase** project (free tier works)

### 1. Install

\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment

Create a \`.env\` file in the project root:

\`\`\`env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
\`\`\`

> Get these from **Supabase Dashboard → Settings → API**.

### 3. Set Up Database

1. Open the **SQL Editor** in your Supabase Dashboard
2. Run \`supabase/migrations/00000000000000_complete_schema.sql\`
3. Run \`supabase/migrations/00000000000001_storage_setup.sql\`

### 4. Deploy Edge Functions

\`\`\`bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy
\`\`\`

### 5. Set Edge Function Secrets

In **Supabase Dashboard → Settings → Edge Functions**, add:

| Secret | Required | Description |
|--------|----------|-------------|
| \`OPENAI_API_KEY\` | For AI features | OpenAI API key |
| \`PERPLEXITY_API_KEY\` | For web search | Perplexity API key |
| \`STRIPE_SECRET_KEY\` | For payments | Stripe secret key |
| \`LOVABLE_API_KEY\` | For AI gateway | Lovable platform key |

### 6. Start Dev Server

\`\`\`bash
npm run dev
\`\`\`

Open **http://localhost:8080**

---

## Deployment

### Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables (\`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_PUBLISHABLE_KEY\`)
4. Deploy — Vercel auto-detects Vite

### Netlify

1. Push to GitHub
2. Connect repo in Netlify
3. Build command: \`npm run build\`
4. Publish directory: \`dist\`
5. Add environment variables
6. Add redirect rule: \`/* /index.html 200\`

### Cloudflare Pages

1. Connect GitHub repo
2. Build command: \`npm run build\`
3. Output directory: \`dist\`
4. Add environment variables

### Self-Hosted (Docker)

\`\`\`bash
# Start the full Supabase stack + app
cd docker
docker-compose up -d

# Run database migrations
docker exec -i supabase-db psql -U postgres < supabase/migrations/00000000000000_complete_schema.sql
docker exec -i supabase-db psql -U postgres < supabase/migrations/00000000000001_storage_setup.sql
\`\`\`

---

## Verification Checklist

After deployment, verify each system:

- [ ] App loads without console errors
- [ ] Sign up / sign in works
- [ ] Create a Zettel card → appears in dashboard
- [ ] Create a note → appears in notebooks
- [ ] File upload works (check storage bucket)
- [ ] AI search returns results (requires OPENAI_API_KEY)
- [ ] Edge functions respond (check function logs)
- [ ] PWA installs on mobile

---

## Project Structure

\`\`\`
├── src/
│   ├── components/        # React components
│   │   ├── ui/            # shadcn/ui primitives
│   │   ├── admin/         # Admin panel
│   │   ├── agents/        # AI agent components
│   │   ├── catalyst/      # Writing studio
│   │   ├── friends/       # Social / chat
│   │   └── widgets/       # Dashboard widgets
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Route pages
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   └── integrations/      # Supabase client
├── supabase/
│   ├── config.toml        # Supabase config
│   ├── functions/         # Edge functions (Deno)
│   └── migrations/        # Database schema SQL
├── public/                # Static assets
└── docker/                # Docker config (optional)
\`\`\`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| \`VITE_SUPABASE_URL\` | Supabase project URL |
| \`VITE_SUPABASE_PUBLISHABLE_KEY\` | Supabase anon/publishable key |
| \`VITE_SUPABASE_PROJECT_ID\` | Supabase project reference ID |

---

## Security

- **Row Level Security (RLS)** on all tables
- Per-user data isolation
- Secure authentication with Supabase Auth
- Optional client-side AES encryption for sensitive content
- Input validation and DOMPurify sanitization
- Admin-only access controls via database roles

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to database" | Verify \`VITE_SUPABASE_URL\` and anon key. Check Supabase project status. |
| "Edge function not found" | Run \`supabase functions deploy\`. Check function logs. |
| "AI features not working" | Verify \`OPENAI_API_KEY\` in Edge Function secrets. Check rate limits. |
| "Build errors" | Delete \`node_modules\` and reinstall. Ensure Node.js 18+. |
| "Auth not working" | Ensure \`handle_new_user\` trigger exists. Check auth providers in Supabase. |
| "Storage upload fails" | Verify storage buckets and RLS policies exist. Run storage setup SQL. |

---

## License

MIT — Free for personal and commercial use.
`;
};

const getCompleteSchema = (): string => {
  return `-- PendragonX Complete Database Schema
-- Generated: ${new Date().toISOString()}
-- Run this in Supabase SQL Editor to set up all tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- ENUM TYPES
-- ============================================

DO $$ BEGIN CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'declined'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE shareable_content_type AS ENUM ('card', 'note', 'scratchpad', 'stickynote', 'notebook'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE sharing_permission AS ENUM ('view', 'edit'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('online', 'busy', 'away', 'dnd', 'offline'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE workflow_status AS ENUM ('active', 'paused', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE workflow_type AS ENUM ('monitor_topic', 'periodic_search', 'keyword_alert'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  about_me TEXT,
  is_visible BOOLEAN DEFAULT true,
  user_status user_status DEFAULT 'offline',
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  auto_delete_days INTEGER DEFAULT 30,
  encryption_enabled BOOLEAN DEFAULT false,
  encryption_key_salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  granted_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CONTENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.zettel_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  linked_cards UUID[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  image_url TEXT,
  video_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_encrypted BOOLEAN DEFAULT false,
  encrypted_content TEXT,
  encryption_iv TEXT,
  content_embedding vector(1536),
  deleted_at TIMESTAMPTZ,
  permanent_delete_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  is_encrypted BOOLEAN DEFAULT false,
  encrypted_content TEXT,
  encryption_iv TEXT,
  content_embedding vector(1536),
  deleted_at TIMESTAMPTZ,
  permanent_delete_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  preview TEXT DEFAULT '',
  emoji TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scratchpad_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date DATE NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FILE & MEDIA TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  deleted_at TIMESTAMPTZ,
  permanent_delete_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  recording_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration INTEGER,
  file_size INTEGER,
  thumbnail_url TEXT,
  transcription TEXT,
  metadata JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATALYST (WRITING) TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.catalyst_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  selected_source TEXT NOT NULL,
  selected_items JSONB,
  word_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalyst_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.catalyst_chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  level INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  word_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalyst_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  citation_type TEXT NOT NULL,
  authors JSONB,
  publication_year INTEGER,
  publisher TEXT,
  url TEXT,
  doi TEXT,
  volume TEXT,
  issue TEXT,
  pages TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalyst_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Snapshot',
  content TEXT NOT NULL,
  word_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalyst_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  anchor_text TEXT,
  position_start INTEGER,
  position_end INTEGER,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalyst_writing_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.catalyst_chapters(id) ON DELETE SET NULL,
  target_words INTEGER NOT NULL,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SOCIAL TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status friend_request_status DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL,
  user_id_2 UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shared_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  shared_with_user_id UUID NOT NULL,
  content_id UUID NOT NULL,
  content_type shareable_content_type NOT NULL,
  permission sharing_permission DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL,
  content_id UUID NOT NULL,
  content_type shareable_content_type NOT NULL,
  active_users JSONB DEFAULT '[]',
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AGENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  run_frequency_minutes INTEGER,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running',
  items_processed INTEGER,
  items_found INTEGER,
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.agent_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  finding_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source_type TEXT,
  source_id TEXT,
  relevance_score FLOAT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  finding_id UUID REFERENCES public.agent_findings(id) ON DELETE SET NULL,
  notification_type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- WORKFLOW TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  workflow_type workflow_type DEFAULT 'monitor_topic',
  config JSONB DEFAULT '{}',
  status workflow_status DEFAULT 'active',
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status workflow_status DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  results JSONB,
  results_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  relevance_score FLOAT,
  saved_as_card_id UUID REFERENCES public.zettel_cards(id) ON DELETE SET NULL,
  saved_as_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  saved_to_notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SYSTEM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  layout_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  source_type TEXT NOT NULL,
  card_id UUID,
  metadata JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cache_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_ids TEXT[] NOT NULL,
  day_of_week INTEGER NOT NULL,
  hour_of_day INTEGER NOT NULL,
  confidence_score FLOAT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  day_of_week INTEGER NOT NULL,
  hour_of_day INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_signature TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  filename TEXT,
  line_number INTEGER,
  column_number INTEGER,
  url TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'error',
  status TEXT DEFAULT 'new',
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.domain_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  restriction_type TEXT NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cookie_consent_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT NOT NULL,
  necessary BOOLEAN DEFAULT true,
  functional BOOLEAN DEFAULT false,
  analytics BOOLEAN DEFAULT false,
  marketing BOOLEAN DEFAULT false,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tool_test_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT,
  total_tests INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zettel_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratchpad_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_writing_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their notebooks" ON public.notebooks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their cards" ON public.zettel_cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their scratchpad" ON public.scratchpad_notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their tasks" ON public.project_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their files" ON public.files FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their attachments" ON public.attachments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their recordings" ON public.recordings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their catalyst docs" ON public.catalyst_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their chapters" ON public.catalyst_chapters FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their citations" ON public.catalyst_citations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their snapshots" ON public.catalyst_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their comments" ON public.catalyst_comments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their goals" ON public.catalyst_writing_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their agents" ON public.agents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their agent runs" ON public.agent_runs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their agent findings" ON public.agent_findings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their agent notifications" ON public.agent_notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their workflows" ON public.workflows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their executions" ON public.workflow_executions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their results" ON public.workflow_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their layouts" ON public.dashboard_layouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their imports" ON public.import_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their cache" ON public.cache_predictions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their activity" ON public.user_activity_logs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create triggers for all tables with updated_at
DO $$ 
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s', tbl, tbl);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id uuid)
RETURNS boolean AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN true
    WHEN EXISTS (SELECT 1 FROM public.admin_licenses WHERE user_id = _user_id AND (expires_at IS NULL OR expires_at > now())) THEN true
    WHEN EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status = 'active' AND (current_period_end IS NULL OR current_period_end > now())) THEN true
    ELSE false
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.find_similar_zettel_cards(
  target_id uuid, similarity_threshold double precision DEFAULT 0.85, max_results integer DEFAULT 5
)
RETURNS TABLE(id uuid, title text, content text, created_at timestamptz, similarity double precision)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_embedding vector(1536); target_user_id uuid;
BEGIN
  SELECT content_embedding, user_id INTO target_embedding, target_user_id
  FROM zettel_cards WHERE zettel_cards.id = target_id AND deleted_at IS NULL;
  IF target_embedding IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT zc.id, zc.title, zc.content, zc.created_at,
    (1 - (zc.content_embedding <=> target_embedding))::float as similarity
  FROM zettel_cards zc
  WHERE zc.id != target_id AND zc.user_id = target_user_id AND zc.deleted_at IS NULL
    AND zc.content_embedding IS NOT NULL
    AND (1 - (zc.content_embedding <=> target_embedding)) > similarity_threshold
  ORDER BY zc.content_embedding <=> target_embedding LIMIT max_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_similar_notes(
  target_id uuid, similarity_threshold double precision DEFAULT 0.85, max_results integer DEFAULT 5
)
RETURNS TABLE(id uuid, title text, content text, created_at timestamptz, similarity double precision)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_embedding vector(1536); target_user_id uuid;
BEGIN
  SELECT content_embedding, user_id INTO target_embedding, target_user_id
  FROM notes WHERE notes.id = target_id AND deleted_at IS NULL;
  IF target_embedding IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT n.id, n.title, n.content, n.created_at,
    (1 - (n.content_embedding <=> target_embedding))::float as similarity
  FROM notes n
  WHERE n.id != target_id AND n.user_id = target_user_id AND n.deleted_at IS NULL
    AND n.content_embedding IS NOT NULL
    AND (1 - (n.content_embedding <=> target_embedding)) > similarity_threshold
  ORDER BY n.content_embedding <=> target_embedding LIMIT max_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_delete_expired_items()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.zettel_cards WHERE deleted_at IS NOT NULL AND permanent_delete_at IS NOT NULL AND permanent_delete_at < NOW();
  DELETE FROM public.notes WHERE deleted_at IS NOT NULL AND permanent_delete_at IS NOT NULL AND permanent_delete_at < NOW();
  DELETE FROM public.files WHERE deleted_at IS NOT NULL AND permanent_delete_at IS NOT NULL AND permanent_delete_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid, p_event_type text, p_event_details jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_id, event_type, event_details, ip_address, user_agent)
  VALUES (p_user_id, p_event_type, p_event_details, p_ip_address, p_user_agent);
END;
$$;

CREATE OR REPLACE FUNCTION public.report_error(
  p_error_signature text, p_error_type text, p_error_message text,
  p_stack_trace text DEFAULT NULL, p_filename text DEFAULT NULL,
  p_line_number integer DEFAULT NULL, p_column_number integer DEFAULT NULL,
  p_user_agent text DEFAULT NULL, p_url text DEFAULT NULL, p_severity text DEFAULT 'error'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_error_id UUID;
BEGIN
  SELECT id INTO v_error_id FROM public.error_reports WHERE error_signature = p_error_signature;
  IF v_error_id IS NOT NULL THEN
    UPDATE public.error_reports SET occurrence_count = occurrence_count + 1, last_seen_at = now() WHERE id = v_error_id;
  ELSE
    INSERT INTO public.error_reports (error_signature, error_type, error_message, stack_trace, filename, line_number, column_number, user_agent, url, severity)
    VALUES (p_error_signature, p_error_type, p_error_message, p_stack_trace, p_filename, p_line_number, p_column_number, p_user_agent, p_url, p_severity)
    RETURNING id INTO v_error_id;
  END IF;
  RETURN v_error_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz, banned_until timestamptz, display_name text, roles app_role[])
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT au.id, au.email, au.created_at, au.last_sign_in_at, au.email_confirmed_at, au.banned_until,
    p.display_name, ARRAY_AGG(ur.role) as roles
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE public.is_admin(auth.uid())
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at, au.email_confirmed_at, au.banned_until, p.display_name
$$;

CREATE OR REPLACE FUNCTION public.update_user_role(_user_id uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Access denied. Admin privileges required.'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_all_card_links()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cards_updated integer;
BEGIN
  UPDATE public.zettel_cards SET linked_cards = '{}', updated_at = now()
  WHERE user_id = auth.uid() AND deleted_at IS NULL;
  GET DIAGNOSTICS cards_updated = ROW_COUNT;
  RETURN cards_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.are_friends(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id_1 = _user_id_1 AND user_id_2 = _user_id_2) OR (user_id_1 = _user_id_2 AND user_id_2 = _user_id_1)
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_friend_request_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.friendships (user_id_1, user_id_2)
    VALUES (LEAST(NEW.sender_id, NEW.receiver_id), GREATEST(NEW.sender_id, NEW.receiver_id))
    ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_next_execution(workflow_config jsonb, base_time timestamptz)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE frequency TEXT; next_time TIMESTAMPTZ;
BEGIN
  frequency := workflow_config->>'frequency';
  CASE frequency
    WHEN 'hourly' THEN next_time := base_time + INTERVAL '1 hour';
    WHEN 'daily' THEN next_time := base_time + INTERVAL '1 day';
    WHEN 'weekly' THEN next_time := base_time + INTERVAL '7 days';
    WHEN 'monthly' THEN next_time := base_time + INTERVAL '30 days';
    ELSE next_time := base_time + INTERVAL '1 day';
  END CASE;
  RETURN next_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.security_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF LENGTH(password) < 8 THEN RAISE EXCEPTION 'Password must be at least 8 characters long'; END IF;
  IF password !~ '[A-Z]' THEN RAISE EXCEPTION 'Password must contain at least one uppercase letter'; END IF;
  IF password !~ '[a-z]' THEN RAISE EXCEPTION 'Password must contain at least one lowercase letter'; END IF;
  IF password !~ '[0-9]' THEN RAISE EXCEPTION 'Password must contain at least one number'; END IF;
  IF password !~ '[^A-Za-z0-9]' THEN RAISE EXCEPTION 'Password must contain at least one special character'; END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_domain_banned(email_address text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE email_domain TEXT;
BEGIN
  email_domain := LOWER(SPLIT_PART(email_address, '@', 2));
  RETURN EXISTS (SELECT 1 FROM public.domain_restrictions WHERE LOWER(domain) = email_domain AND restriction_type = 'banned');
END;
$$;
`;
};

const getStorageSetup = (): string => {
  return `-- Storage Buckets Setup
-- Run after main schema migration

INSERT INTO storage.buckets (id, name, public) VALUES ('card-media', 'card-media', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-snippets', 'audio-snippets', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-recordings', 'meeting-recordings', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('video-recordings', 'video-recordings', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('screen-recordings', 'screen-recordings', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload to their folder" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their files" ON storage.objects 
FOR SELECT USING (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their files" ON storage.objects 
FOR UPDATE USING (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their files" ON storage.objects 
FOR DELETE USING (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
`;
};

const getDockerCompose = (): string => {
  return `version: '3.8'

services:
  db:
    image: supabase/postgres:15.6.1.145
    container_name: supabase-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-your-super-secret-password}
      POSTGRES_DB: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  studio:
    image: supabase/studio:2024.12.18-sha-bf126cf
    container_name: supabase-studio
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-your-super-secret-password}
      DEFAULT_ORGANIZATION: PendragonX
      DEFAULT_PROJECT: PendragonX
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: \${ANON_KEY}
      SUPABASE_SERVICE_KEY: \${SERVICE_KEY}
    depends_on:
      - db

  kong:
    image: kong:2.8.1
    container_name: supabase-kong
    restart: unless-stopped
    ports:
      - "8000:8000"
      - "8443:8443"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_PLUGINS: request-transformer,cors,key-auth,acl
    volumes:
      - ./kong/kong.yml:/var/lib/kong/kong.yml
    depends_on:
      - db

  auth:
    image: supabase/gotrue:v2.164.0
    container_name: supabase-auth
    restart: unless-stopped
    ports:
      - "9999:9999"
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD:-your-super-secret-password}@db:5432/postgres?search_path=auth
      GOTRUE_SITE_URL: http://localhost:8080
      GOTRUE_URI_ALLOW_LIST: "*"
      GOTRUE_JWT_SECRET: \${JWT_SECRET:-your-jwt-secret-at-least-32-characters-long}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
    depends_on:
      - db

  rest:
    image: postgrest/postgrest:v12.2.3
    container_name: supabase-rest
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      PGRST_DB_URI: postgres://postgres:\${POSTGRES_PASSWORD:-your-super-secret-password}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: \${JWT_SECRET:-your-jwt-secret-at-least-32-characters-long}
    depends_on:
      - db

  realtime:
    image: supabase/realtime:v2.33.70
    container_name: supabase-realtime
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: \${POSTGRES_PASSWORD:-your-super-secret-password}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: \${JWT_SECRET:-your-jwt-secret-at-least-32-characters-long}
      SECRET_KEY_BASE: \${SECRET_KEY_BASE:-super-secret-key-base-at-least-64-chars-long-for-realtime-service-to-work}
      ERL_AFLAGS: -proto_dist inet_tcp
      DNS_NODES: "''"
      RLIMIT_NOFILE: 10000
    depends_on:
      - db

  storage:
    image: supabase/storage-api:v1.14.5
    container_name: supabase-storage
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      ANON_KEY: \${ANON_KEY}
      SERVICE_KEY: \${SERVICE_KEY}
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD:-your-super-secret-password}@db:5432/postgres
      POSTGREST_URL: http://rest:3000
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: local
      GLOBAL_S3_BUCKET: stub
    volumes:
      - storage_data:/var/lib/storage
    depends_on:
      - db
      - rest

  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: pendragonx-app
    restart: unless-stopped
    ports:
      - "8080:80"
    depends_on:
      - kong

volumes:
  postgres_data:
  storage_data:
`;
};

const getDockerfile = (): string => {
  return `# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
RUN npm run build

# Production stage
FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
};

const getNginxConfig = (): string => {
  return `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
`;
};

const getDeployScripts = (): { bash: string; windows: string } => {
  const bash = `#!/bin/bash
set -e

echo "🚀 PendragonX Deployment Setup"
echo "=============================="
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VER=$(node -v)
echo "✅ Node.js: $NODE_VER"

echo ""
echo "📦 Installing dependencies..."
npm install

if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.template .env
    echo ""
    echo "📝 IMPORTANT: Edit .env with your Supabase credentials"
    echo "   Get them from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api"
    echo ""
fi

echo ""
echo "🔧 Next Steps:"
echo ""
echo "  1. Edit .env with your Supabase URL and anon key"
echo "  2. Run database migrations in Supabase SQL Editor:"
echo "     - supabase/migrations/00000000000000_complete_schema.sql"
echo "     - supabase/migrations/00000000000001_storage_setup.sql"
echo "  3. Deploy edge functions: supabase functions deploy"
echo "  4. Set edge function secrets (OPENAI_API_KEY, etc.)"
echo "  5. Start dev server: npm run dev"
echo ""

read -p "Start development server now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎉 Starting on http://localhost:8080 ..."
    npm run dev
else
    echo "✅ Setup complete! Run 'npm run dev' when ready."
fi
`;

  const windows = `@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo  PendragonX Deployment Setup
echo ==========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is required. Install from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js: %NODE_VERSION%

echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

if not exist .env (
    echo.
    echo [WARN] No .env file found. Creating from template...
    copy .env.template .env
    echo.
    echo [IMPORTANT] Edit .env with your Supabase credentials
)

echo.
echo ==========================================
echo  Next Steps:
echo ==========================================
echo.
echo  1. Edit .env with your Supabase URL and anon key
echo  2. Run database migrations in Supabase SQL Editor
echo  3. Deploy edge functions: supabase functions deploy
echo  4. Set edge function secrets (OPENAI_API_KEY, etc.)
echo  5. Start dev server: npm run dev
echo.

set /p CHOICE="Start development server now? (y/n): "
if /i "%CHOICE%"=="y" (
    echo.
    echo Starting on http://localhost:8080 ...
    call npm run dev
) else (
    echo.
    echo Setup complete! Run 'npm run dev' when ready.
)

pause
`;

  return { bash, windows };
};

// ============================================================
// USER DATA EXPORT
// ============================================================

const getUserDatabaseExport = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('export-user-data');
    if (error) {
      console.warn('User data export skipped:', error);
      return '-- User data export was skipped (edge function error)\n';
    }
    return data?.sql || '-- No user data to export\n';
  } catch {
    return '-- User data export was skipped\n';
  }
};

// ============================================================
// MAIN EXPORT
// ============================================================

export const exportCodebase = async (
  userEmail: string,
  options?: Partial<ExportOptions>
): Promise<ExportResult> => {
  if (userEmail !== 'mpalmero197@gmail.com') {
    throw new Error('Export functionality is restricted to authorized users only.');
  }

  const opts: ExportOptions = {
    includeUserData: options?.includeUserData ?? true,
    includeDocker: options?.includeDocker ?? true,
    includeDeployScripts: options?.includeDeployScripts ?? true,
    onProgress: options?.onProgress ?? (() => {}),
  };

  const zip = new JSZip();
  const skippedFiles: string[] = [];

  try {
    opts.onProgress('Preparing configuration files...', 2);

    // Core generated files
    zip.file('package.json', getPackageJson());
    zip.file('README.md', getReadme());
    zip.file('.env.template', `# PendragonX Environment Configuration
# Get credentials from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
`);
    zip.file('.gitignore', `node_modules
dist
dist-ssr
*.local
.env
.env.local
.env.*.local
.DS_Store
*.log
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.branches
.temp
`);

    // Fetch source files (0-60%)
    opts.onProgress('Fetching source files...', 5);
    const { files: sourceFiles, skipped } = await fetchSourceFiles(opts.onProgress);
    skippedFiles.push(...skipped);

    for (const file of sourceFiles) {
      zip.file(file.path, file.content);
    }

    // Database schema (60-70%)
    opts.onProgress('Adding database schema...', 62);
    zip.file('supabase/migrations/00000000000000_complete_schema.sql', getCompleteSchema());
    zip.file('supabase/migrations/00000000000001_storage_setup.sql', getStorageSetup());

    // User data (70-80%)
    if (opts.includeUserData) {
      opts.onProgress('Exporting user data...', 72);
      const userDataSQL = await getUserDatabaseExport();
      zip.file('supabase/migrations/99999999999999_user_data.sql', userDataSQL);
    }

    // Docker (80-85%)
    if (opts.includeDocker) {
      opts.onProgress('Adding Docker configuration...', 82);
      zip.file('docker/docker-compose.yml', getDockerCompose());
      zip.file('docker/Dockerfile', getDockerfile());
      zip.file('docker/nginx.conf', getNginxConfig());
    }

    // Deploy scripts (85-90%)
    if (opts.includeDeployScripts) {
      opts.onProgress('Adding deployment scripts...', 87);
      const scripts = getDeployScripts();
      zip.file('deploy.sh', scripts.bash);
      zip.file('deploy.bat', scripts.windows);
    }

    // Export manifest
    opts.onProgress('Generating manifest...', 92);
    const manifest = {
      exportedAt: new Date().toISOString(),
      totalFiles: sourceFiles.length,
      skippedFiles: skippedFiles,
      options: {
        includeUserData: opts.includeUserData,
        includeDocker: opts.includeDocker,
        includeDeployScripts: opts.includeDeployScripts,
      },
    };
    zip.file('EXPORT_MANIFEST.json', JSON.stringify(manifest, null, 2));

    // Generate archive (90-100%)
    opts.onProgress('Packaging archive...', 95);
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(blob, `pendragonx-complete-${timestamp}.zip`);

    opts.onProgress('Export complete!', 100);

    return {
      filesIncluded: sourceFiles.length,
      filesSkipped: skippedFiles,
      totalSize: blob.size,
    };
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export codebase. Please try again.');
  }
};
