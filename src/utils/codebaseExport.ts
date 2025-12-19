import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

interface FileEntry {
  path: string;
  content: string;
}

// Complete list of all project files for export
const getAllSourceFiles = async (): Promise<FileEntry[]> => {
  const sourceFiles: FileEntry[] = [];
  
  const filesToExport = [
    // ===== ROOT CONFIG FILES =====
    'vite.config.ts',
    'tailwind.config.ts',
    'eslint.config.js',
    'index.html',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'postcss.config.js',
    'components.json',
    
    // ===== MAIN SOURCE FILES =====
    'src/main.tsx',
    'src/App.tsx',
    'src/App.css',
    'src/index.css',
    'src/vite-env.d.ts',
    
    // ===== TYPES =====
    'src/types/zettel.ts',
    'src/types/dashboard.ts',
    'src/types/global.d.ts',
    
    // ===== CUSTOM HOOKS =====
    'src/hooks/useAuth.ts',
    'src/hooks/useZettelCards.ts',
    'src/hooks/useSimilarContent.ts',
    'src/hooks/useDashboardLayout.ts',
    'src/hooks/use-mobile.tsx',
    'src/hooks/use-toast.ts',
    'src/hooks/useActivityTracker.ts',
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
    'src/pages/NotFound.tsx',
    'src/pages/Landing.tsx',
    'src/pages/Settings.tsx',
    'src/pages/Subscription.tsx',
    'src/pages/Install.tsx',
    'src/pages/PrivacyPolicy.tsx',
    'src/pages/TermsOfService.tsx',
    
    // ===== MAIN COMPONENTS =====
    'src/components/AccountManagement.tsx',
    'src/components/AIAssistantSidebar.tsx',
    'src/components/AIEditDialog.tsx',
    'src/components/AISearchBar.tsx',
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
    'src/components/GraphView.tsx',
    'src/components/GraphViewHeavy.tsx',
    'src/components/GraphViewNew.tsx',
    'src/components/GraphViewPremium.tsx',
    'src/components/HabitTracker.tsx',
    'src/components/ImportDialog.tsx',
    'src/components/ImportHistoryPanel.tsx',
    'src/components/InfiniteWhiteboard.tsx',
    'src/components/IntelligentCacheIndicator.tsx',
    'src/components/LandingBackground.tsx',
    'src/components/LoadingSpinner.tsx',
    'src/components/MaterialTabBar.tsx',
    'src/components/MediaRecorder.tsx',
    'src/components/MediaUpload.tsx',
    'src/components/MeetingRecorder.tsx',
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
    'src/components/RecordingsLibrary.tsx',
    'src/components/RecycleBin.tsx',
    'src/components/ResizableGrid.tsx',
    'src/components/RightSidebar.tsx',
    'src/components/ScratchPad.tsx',
    'src/components/SearchBar.tsx',
    'src/components/SearchHistorySidebar.tsx',
    'src/components/SearchResultsCanvas.tsx',
    'src/components/SearchResultsDialog.tsx',
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
    'src/components/admin/AdminOverview.tsx',
    'src/components/admin/AdminSidebar.tsx',
    'src/components/admin/AnalyticsDashboard.tsx',
    'src/components/admin/CodeEditor.tsx',
    'src/components/admin/ContentModeration.tsx',
    'src/components/admin/CookieAnalytics.tsx',
    'src/components/admin/DocumentationViewer.tsx',
    'src/components/admin/DomainManagement.tsx',
    'src/components/admin/ErrorReportsPanel.tsx',
    'src/components/admin/FeatureRequestsPanel.tsx',
    'src/components/admin/SecurityMonitor.tsx',
    'src/components/admin/SystemSettings.tsx',
    'src/components/admin/UserManagement.tsx',
    
    // ===== CATALYST COMPONENTS =====
    'src/components/catalyst/ChapterManager.tsx',
    
    // ===== FRIENDS COMPONENTS =====
    'src/components/friends/ChatPopup.tsx',
    'src/components/friends/FriendsPanel.tsx',
    
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
    
    // ===== SUPABASE EDGE FUNCTIONS =====
    'supabase/config.toml',
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
    'supabase/functions/execute-workflows/index.ts',
    'supabase/functions/export-user-data/index.ts',
    'supabase/functions/fetch-url-content/index.ts',
    'supabase/functions/find-similar-content/index.ts',
    'supabase/functions/generate-embedding/index.ts',
    'supabase/functions/generate-image/index.ts',
    'supabase/functions/generate-writing-suggestions/index.ts',
    'supabase/functions/scratchpad-sync/index.ts',
    'supabase/functions/suggest-smart-links/index.ts',
    'supabase/functions/transcribe-audio-ai/index.ts',
    'supabase/functions/transcribe-audio/index.ts',
    'supabase/functions/web-search/index.ts',
    
    // ===== STYLES =====
    'src/styles/grid-layout.css',
    
    // ===== PUBLIC FILES =====
    'public/robots.txt'
  ];
  
  for (const filePath of filesToExport) {
    try {
      const response = await fetch(`/${filePath}`);
      if (response.ok) {
        const content = await response.text();
        sourceFiles.push({ path: filePath, content });
      }
    } catch (error) {
      console.warn(`Could not fetch ${filePath}:`, error);
    }
  }
  
  return sourceFiles;
};

// Generate complete package.json with all dependencies
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
      "@tiptap/extension-color": "^3.8.0",
      "@tiptap/extension-image": "^3.8.0",
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
      "fabric": "^6.7.1",
      "file-saver": "^2.0.5",
      "gapi-script": "^1.2.0",
      "html2canvas": "^1.4.1",
      "input-otp": "^1.4.2",
      "jspdf": "^3.0.2",
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
      "@vitejs/plugin-react": "^4.3.1",
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

// Generate comprehensive README
const getReadme = (): string => {
  return `# PendragonX - Advanced Knowledge Management System

A comprehensive, production-ready knowledge management system built with React, TypeScript, and Supabase.

## 🚀 Features

- 📝 **Rich Note-Taking**: Advanced text formatting with TipTap editor
- 🔗 **Zettelkasten Method**: Interconnected knowledge cards with AI-powered linking
- 📊 **Visual Knowledge Graph**: Interactive 3D graph visualization
- 🎨 **Infinite Whiteboard**: Creative thinking space with Fabric.js
- 📅 **Integrated Calendar**: Scheduling and time management
- 📖 **Notebook Organization**: Hierarchical content organization
- 🏷️ **Advanced Tagging**: Dewey Decimal System categorization
- 📱 **Mobile Responsive**: PWA with offline support
- 🎭 **Dark/Light Themes**: Beautiful Apple-inspired design
- 🔒 **Secure Authentication**: Supabase Auth with RLS
- ☁️ **Cloud Synchronization**: Real-time data sync
- 🤖 **AI Integration**: OpenAI-powered features
- 📈 **Analytics Dashboard**: Usage insights
- 📤 **Export Options**: PDF, Markdown, DOCX, EPUB
- 🔍 **Powerful Search**: Full-text and semantic search
- 🎙️ **Audio Recording**: Voice notes with transcription
- 📁 **File Management**: Cloud storage for attachments

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with pgvector
- **Storage**: Supabase Storage
- **Edge Functions**: Deno runtime
- **Visualization**: React Flow + Three.js
- **Canvas**: Fabric.js

---

## ⚡ Quick Start (Development)

### Prerequisites
- Node.js 18+ 
- npm or bun
- Supabase CLI (optional, for local development)

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Environment Setup
Create a \`.env\` file:
\`\`\`env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 3. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

Visit \`http://localhost:5173\`

---

## 🏗️ Self-Hosting Guide

### Option 1: Supabase Cloud (Recommended)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Run Database Migrations**
   - Go to SQL Editor in Supabase Dashboard
   - Run \`supabase/migrations/00000000000000_complete_schema.sql\`

3. **Configure Storage Buckets**
   - Run \`supabase/migrations/00000000000001_storage_setup.sql\`

4. **Deploy Edge Functions**
   \`\`\`bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy
   \`\`\`

5. **Set Edge Function Secrets**
   Go to Project Settings > Edge Functions and add:
   - \`OPENAI_API_KEY\` - For AI features
   - \`STRIPE_SECRET_KEY\` - For payments (optional)

6. **Build and Deploy Frontend**
   \`\`\`bash
   npm run build
   \`\`\`
   Deploy \`dist\` folder to Netlify, Vercel, or any static host.

### Option 2: Self-Hosted Supabase (Docker)

1. **Start Supabase Stack**
   \`\`\`bash
   cd docker
   docker-compose up -d
   \`\`\`

2. **Run Migrations**
   \`\`\`bash
   docker exec -i supabase-db psql -U postgres < supabase/migrations/00000000000000_complete_schema.sql
   \`\`\`

3. **Configure Edge Functions**
   Edge functions require Deno runtime. See \`docker/edge-functions-setup.md\`

4. **Update Environment**
   Update \`.env\` with your self-hosted URLs:
   \`\`\`env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=your_local_anon_key
   \`\`\`

### Option 3: Manual PostgreSQL Setup

If you prefer to use your own PostgreSQL instance:

1. **Database Setup**
   - Install PostgreSQL 15+
   - Install pgvector extension
   - Run the schema migration

2. **Modify Supabase Client**
   Update \`src/integrations/supabase/client.ts\` to use your database connection.

---

## 📁 Project Structure

\`\`\`
├── src/
│   ├── components/     # React components
│   │   ├── ui/        # shadcn/ui components
│   │   ├── admin/     # Admin panel components
│   │   ├── widgets/   # Dashboard widgets
│   │   └── ...
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Route pages
│   ├── types/         # TypeScript types
│   ├── utils/         # Utility functions
│   └── integrations/  # External integrations
├── supabase/
│   ├── config.toml    # Supabase configuration
│   ├── functions/     # Edge functions
│   └── migrations/    # Database migrations
├── public/            # Static assets
└── docker/            # Docker configuration
\`\`\`

---

## 🔧 Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| \`VITE_SUPABASE_URL\` | Supabase project URL |
| \`VITE_SUPABASE_ANON_KEY\` | Supabase anonymous key |

### Edge Function Secrets

| Secret | Description | Required |
|--------|-------------|----------|
| \`OPENAI_API_KEY\` | OpenAI API key for AI features | For AI |
| \`STRIPE_SECRET_KEY\` | Stripe secret for payments | For payments |
| \`PERPLEXITY_API_KEY\` | Perplexity API for web search | Optional |

---

## 🔒 Security

- Row Level Security (RLS) on all tables
- User data isolation
- Secure authentication flows
- Client-side encryption support
- Input validation and sanitization

---

## 📱 PWA Support

The app includes full PWA support:
- Offline caching
- Install prompts
- Push notifications (configurable)

---

## 🆘 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY
- Check if Supabase project is active
- Ensure RLS policies are configured

**"Edge function not found"**
- Deploy functions: \`supabase functions deploy\`
- Check function logs in Supabase Dashboard

**"AI features not working"**
- Verify OPENAI_API_KEY is set in Edge Function secrets
- Check API rate limits

**Build errors**
- Clear node_modules and reinstall
- Check Node.js version (18+ required)

---

## 📄 License

MIT License - Free for personal and commercial use.

---

## 🤝 Support

For issues or questions:
1. Check existing documentation
2. Review Supabase logs
3. Check browser console for errors
`;
};

// Generate complete database schema
const getCompleteSchema = (): string => {
  return `-- PendragonX Complete Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enum types
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE shareable_content_type AS ENUM ('card', 'note', 'scratchpad', 'stickynote', 'notebook');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sharing_permission AS ENUM ('view', 'edit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('online', 'busy', 'away', 'dnd', 'offline');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_status AS ENUM ('active', 'paused', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_type AS ENUM ('monitor_topic', 'periodic_search', 'keyword_alert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles table
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

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- User preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  auto_delete_days INTEGER DEFAULT 30,
  encryption_enabled BOOLEAN DEFAULT false,
  encryption_key_salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin licenses
CREATE TABLE IF NOT EXISTS public.admin_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  granted_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions
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

-- Notebooks
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

-- Zettel cards (main knowledge cards)
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

-- Notes
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

-- Documents
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

-- Calendar events
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

-- Scratchpad notes
CREATE TABLE IF NOT EXISTS public.scratchpad_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project tasks
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

-- Files
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

-- Attachments
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

-- Recordings
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

-- Catalyst documents
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

-- Catalyst chapters
CREATE TABLE IF NOT EXISTS public.catalyst_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.catalyst_chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  level INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  word_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catalyst citations
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

-- Catalyst writing goals
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

-- Friend requests
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

-- Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL,
  user_id_2 UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shared content
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

-- Collaboration sessions
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
-- WORKFLOW TABLES
-- ============================================

-- Workflows
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

-- Workflow executions
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

-- Workflow results
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

-- Dashboard layouts
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  layout_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import history
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

-- Cache predictions
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

-- User activity logs
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

-- Error reports
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

-- Feature requests
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

-- Domain restrictions
CREATE TABLE IF NOT EXISTS public.domain_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  restriction_type TEXT NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security audit log
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cookie consent analytics
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
ALTER TABLE public.catalyst_writing_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
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

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can manage their preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Notebooks policies
CREATE POLICY "Users can manage their notebooks" ON public.notebooks FOR ALL USING (auth.uid() = user_id);

-- Zettel cards policies
CREATE POLICY "Users can manage their cards" ON public.zettel_cards FOR ALL USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can manage their notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can manage their documents" ON public.documents FOR ALL USING (auth.uid() = user_id);

-- Calendar events policies
CREATE POLICY "Users can manage their events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);

-- Scratchpad policies
CREATE POLICY "Users can manage their scratchpad" ON public.scratchpad_notes FOR ALL USING (auth.uid() = user_id);

-- Project tasks policies
CREATE POLICY "Users can manage their tasks" ON public.project_tasks FOR ALL USING (auth.uid() = user_id);

-- Files policies
CREATE POLICY "Users can manage their files" ON public.files FOR ALL USING (auth.uid() = user_id);

-- Attachments policies
CREATE POLICY "Users can manage their attachments" ON public.attachments FOR ALL USING (auth.uid() = user_id);

-- Recordings policies
CREATE POLICY "Users can manage their recordings" ON public.recordings FOR ALL USING (auth.uid() = user_id);

-- Catalyst documents policies
CREATE POLICY "Users can manage their catalyst docs" ON public.catalyst_documents FOR ALL USING (auth.uid() = user_id);

-- Catalyst chapters policies
CREATE POLICY "Users can manage their chapters" ON public.catalyst_chapters FOR ALL USING (auth.uid() = user_id);

-- Catalyst citations policies
CREATE POLICY "Users can manage their citations" ON public.catalyst_citations FOR ALL USING (auth.uid() = user_id);

-- Catalyst writing goals policies
CREATE POLICY "Users can manage their goals" ON public.catalyst_writing_goals FOR ALL USING (auth.uid() = user_id);

-- Workflows policies
CREATE POLICY "Users can manage their workflows" ON public.workflows FOR ALL USING (auth.uid() = user_id);

-- Workflow executions policies
CREATE POLICY "Users can manage their executions" ON public.workflow_executions FOR ALL USING (auth.uid() = user_id);

-- Workflow results policies
CREATE POLICY "Users can manage their results" ON public.workflow_results FOR ALL USING (auth.uid() = user_id);

-- Dashboard layouts policies
CREATE POLICY "Users can manage their layouts" ON public.dashboard_layouts FOR ALL USING (auth.uid() = user_id);

-- Import history policies
CREATE POLICY "Users can manage their imports" ON public.import_history FOR ALL USING (auth.uid() = user_id);

-- Cache predictions policies
CREATE POLICY "Users can manage their cache" ON public.cache_predictions FOR ALL USING (auth.uid() = user_id);

-- User activity logs policies
CREATE POLICY "Users can manage their activity" ON public.user_activity_logs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s', tbl, tbl);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
  END LOOP;
END $$;

-- Handle new user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Is admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Has premium access function
CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id uuid)
RETURNS boolean AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.admin_licenses 
      WHERE user_id = _user_id 
      AND (expires_at IS NULL OR expires_at > now())
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = _user_id 
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
    ) THEN true
    ELSE false
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Find similar zettel cards function
CREATE OR REPLACE FUNCTION public.find_similar_zettel_cards(
  target_id uuid,
  similarity_threshold double precision DEFAULT 0.85,
  max_results integer DEFAULT 5
)
RETURNS TABLE(id uuid, title text, content text, created_at timestamptz, similarity double precision)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_embedding vector(1536);
  target_user_id uuid;
BEGIN
  SELECT content_embedding, user_id INTO target_embedding, target_user_id
  FROM zettel_cards WHERE zettel_cards.id = target_id AND deleted_at IS NULL;
  
  IF target_embedding IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT zc.id, zc.title, zc.content, zc.created_at,
    (1 - (zc.content_embedding <=> target_embedding))::float as similarity
  FROM zettel_cards zc
  WHERE zc.id != target_id AND zc.user_id = target_user_id
    AND zc.deleted_at IS NULL AND zc.content_embedding IS NOT NULL
    AND (1 - (zc.content_embedding <=> target_embedding)) > similarity_threshold
  ORDER BY zc.content_embedding <=> target_embedding
  LIMIT max_results;
END;
$$;

-- Find similar notes function
CREATE OR REPLACE FUNCTION public.find_similar_notes(
  target_id uuid,
  similarity_threshold double precision DEFAULT 0.85,
  max_results integer DEFAULT 5
)
RETURNS TABLE(id uuid, title text, content text, created_at timestamptz, similarity double precision)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_embedding vector(1536);
  target_user_id uuid;
BEGIN
  SELECT content_embedding, user_id INTO target_embedding, target_user_id
  FROM notes WHERE notes.id = target_id AND deleted_at IS NULL;
  
  IF target_embedding IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT n.id, n.title, n.content, n.created_at,
    (1 - (n.content_embedding <=> target_embedding))::float as similarity
  FROM notes n
  WHERE n.id != target_id AND n.user_id = target_user_id
    AND n.deleted_at IS NULL AND n.content_embedding IS NOT NULL
    AND (1 - (n.content_embedding <=> target_embedding)) > similarity_threshold
  ORDER BY n.content_embedding <=> target_embedding
  LIMIT max_results;
END;
$$;

-- Auto delete expired items
CREATE OR REPLACE FUNCTION public.auto_delete_expired_items()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.zettel_cards
  WHERE deleted_at IS NOT NULL AND permanent_delete_at IS NOT NULL AND permanent_delete_at < NOW();
  
  DELETE FROM public.notes
  WHERE deleted_at IS NOT NULL AND permanent_delete_at IS NOT NULL AND permanent_delete_at < NOW();
  
  DELETE FROM public.files
  WHERE deleted_at IS NOT NULL AND permanent_delete_at IS NOT NULL AND permanent_delete_at < NOW();
END;
$$;
`;
};

// Generate storage setup SQL
const getStorageSetup = (): string => {
  return `-- Storage Buckets Setup
-- Run after main schema migration

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('card-media', 'card-media', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-snippets', 'audio-snippets', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-recordings', 'meeting-recordings', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('video-recordings', 'video-recordings', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('screen-recordings', 'screen-recordings', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage policies for private buckets
CREATE POLICY "Users can upload to their folder" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their files" ON storage.objects 
FOR SELECT USING (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their files" ON storage.objects 
FOR UPDATE USING (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their files" ON storage.objects 
FOR DELETE USING (bucket_id IN ('card-media', 'audio-snippets', 'meeting-recordings', 'documents', 'video-recordings', 'screen-recordings') AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatar bucket policies (public read)
CREATE POLICY "Avatars are publicly accessible" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their avatar" ON storage.objects 
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their avatar" ON storage.objects 
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
`;
};

// Generate Docker compose file
const getDockerCompose = (): string => {
  return `version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: supabase/postgres:15.1.0.147
    container_name: supabase-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-super-secret-password
      POSTGRES_DB: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Supabase Studio (Optional - for database management)
  studio:
    image: supabase/studio:20240101-ce42139
    container_name: supabase-studio
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: your-super-secret-password
      DEFAULT_ORGANIZATION: Default Organization
      DEFAULT_PROJECT: Default Project
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: your-anon-key
      SUPABASE_SERVICE_KEY: your-service-key
    depends_on:
      - db

  # Kong API Gateway
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
      - ./docker/kong/kong.yml:/var/lib/kong/kong.yml
    depends_on:
      - db

  # GoTrue Auth Service
  auth:
    image: supabase/gotrue:v2.143.0
    container_name: supabase-auth
    restart: unless-stopped
    ports:
      - "9999:9999"
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:your-super-secret-password@db:5432/postgres?search_path=auth
      GOTRUE_SITE_URL: http://localhost:5173
      GOTRUE_URI_ALLOW_LIST: "*"
      GOTRUE_JWT_SECRET: your-jwt-secret-at-least-32-characters
      GOTRUE_JWT_EXP: 3600
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
    depends_on:
      - db

  # PostgREST
  rest:
    image: postgrest/postgrest:v12.0.2
    container_name: supabase-rest
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      PGRST_DB_URI: postgres://postgres:your-super-secret-password@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: your-jwt-secret-at-least-32-characters
    depends_on:
      - db

  # Storage API
  storage:
    image: supabase/storage-api:v0.43.11
    container_name: supabase-storage
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      ANON_KEY: your-anon-key
      SERVICE_KEY: your-service-key
      DATABASE_URL: postgres://postgres:your-super-secret-password@db:5432/postgres
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

  # Frontend App
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pendragonx-app
    restart: unless-stopped
    ports:
      - "5173:80"
    environment:
      VITE_SUPABASE_URL: http://localhost:8000
      VITE_SUPABASE_ANON_KEY: your-anon-key
    depends_on:
      - kong

volumes:
  postgres_data:
  storage_data:
`;
};

// Generate Dockerfile
const getDockerfile = (): string => {
  return `# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`;
};

// Generate nginx config
const getNginxConfig = (): string => {
  return `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # SPA routing - redirect all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
`;
};

// Get deployment scripts
const getDeployScripts = (): { bash: string; windows: string } => {
  const bash = `#!/bin/bash
set -e

echo "🚀 PendragonX Deployment Setup"
echo "=============================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 18+"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check for .env file
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.template .env
    echo ""
    echo "📝 IMPORTANT: Edit .env with your Supabase credentials"
    echo "   Get them from: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
fi

echo ""
echo "🔧 Setup Options:"
echo "1. Supabase Cloud (Recommended)"
echo "   - Run migrations in Supabase SQL Editor"
echo "   - Deploy edge functions: supabase functions deploy"
echo ""
echo "2. Self-hosted Docker"
echo "   - cd docker && docker-compose up -d"
echo ""
echo "3. Development mode"
echo "   - npm run dev"
echo ""

read -p "Start development server now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎉 Starting development server..."
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

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is required. Please install Node.js 18+
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

REM Check for .env file
if not exist .env (
    echo.
    echo [WARN] No .env file found. Creating from template...
    copy .env.template .env
    echo.
    echo [IMPORTANT] Edit .env with your Supabase credentials
    echo Get them from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
)

echo.
echo ==========================================
echo  Setup Options:
echo ==========================================
echo.
echo 1. Supabase Cloud (Recommended)
echo    - Run migrations in Supabase SQL Editor
echo    - Deploy edge functions: supabase functions deploy
echo.
echo 2. Self-hosted Docker
echo    - cd docker ^&^& docker-compose up -d
echo.
echo 3. Development mode
echo    - npm run dev
echo.
echo ==========================================
echo.

set /p CHOICE="Start development server now? (y/n): "
if /i "%CHOICE%"=="y" (
    echo.
    echo Starting development server...
    call npm run dev
) else (
    echo.
    echo Setup complete! Run 'npm run dev' when ready.
)

pause
`;

  return { bash, windows };
};

// Fetch user data export
const getUserDatabaseExport = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('export-user-data');
    if (error) {
      console.error('Error fetching user data:', error);
      return '-- Error exporting user data\n';
    }
    return data.sql || '-- No user data to export\n';
  } catch (error) {
    console.error('Failed to export user data:', error);
    return '-- Failed to export user data\n';
  }
};

// Main export function
export const exportCodebase = async (userEmail: string): Promise<void> => {
  if (userEmail !== 'mpalmero197@gmail.com') {
    throw new Error('Export functionality is restricted to authorized users only.');
  }

  const zip = new JSZip();
  
  try {
    // Core configuration files
    zip.file('package.json', getPackageJson());
    zip.file('README.md', getReadme());
    zip.file('.env.template', `# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Get credentials from:
# https://app.supabase.com/project/YOUR_PROJECT/settings/api
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

    // Fetch all source files
    console.log('Fetching source files...');
    const sourceFiles = await getAllSourceFiles();
    sourceFiles.forEach(file => {
      zip.file(file.path, file.content);
    });
    console.log(`Packaged ${sourceFiles.length} source files`);

    // Database migrations
    console.log('Adding database schema...');
    zip.file('supabase/migrations/00000000000000_complete_schema.sql', getCompleteSchema());
    zip.file('supabase/migrations/00000000000001_storage_setup.sql', getStorageSetup());

    // User data export
    console.log('Exporting user data...');
    const userDataSQL = await getUserDatabaseExport();
    zip.file('supabase/migrations/99999999999999_user_data.sql', userDataSQL);

    // Docker configuration
    console.log('Adding Docker configuration...');
    zip.file('docker/docker-compose.yml', getDockerCompose());
    zip.file('Dockerfile', getDockerfile());
    zip.file('docker/nginx.conf', getNginxConfig());

    // Deployment scripts
    const deployScripts = getDeployScripts();
    zip.file('deploy.sh', deployScripts.bash);
    zip.file('deploy.bat', deployScripts.windows);

    // Generate and download
    console.log('Generating archive...');
    const blob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(blob, `pendragonx-complete-${timestamp}.zip`);
    
    console.log('Export completed successfully');
    
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export codebase. Please try again.');
  }
};
