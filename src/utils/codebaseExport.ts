import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileEntry {
  path: string;
  content: string;
}

// Dynamically fetch and export all source files
const getAllSourceFiles = async (): Promise<FileEntry[]> => {
  const sourceFiles: FileEntry[] = [];
  
  // Static files list based on your project structure
  const filesToExport = [
    // Config files
    'vite.config.ts',
    'tailwind.config.ts',
    'eslint.config.js',
    'index.html',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'postcss.config.js',
    'components.json',
    
    // Source files
    'src/main.tsx',
    'src/App.tsx',
    'src/App.css',
    'src/index.css',
    'src/vite-env.d.ts',
    
    // Types
    'src/types/zettel.ts',
    
    // Hooks
    'src/hooks/useAuth.ts',
    'src/hooks/useZettelCards.ts',
    'src/hooks/use-mobile.tsx',
    'src/hooks/use-toast.ts',
    
    // Utils
    'src/lib/utils.ts',
    'src/utils/deweySystem.ts',
    'src/utils/security.ts',
    'src/utils/exportUtils.ts',
    
    // Pages
    'src/pages/Index.tsx',
    'src/pages/Auth.tsx',
    'src/pages/NotFound.tsx',
    
    // Components
    'src/components/Dashboard.tsx',
    'src/components/MaterialTabBar.tsx',
    'src/components/ScratchPad.tsx',
    'src/components/AIEditDialog.tsx',
    'src/components/AccountManagement.tsx',
    'src/components/BulletJournal.tsx',
    'src/components/Calendar.tsx',
    'src/components/CardActionsMenu.tsx',
    'src/components/ConfirmDialog.tsx',
    'src/components/CreateCardDialog.tsx',
    'src/components/DeleteAllCardsDialog.tsx',
    'src/components/DocumentViewer.tsx',
    'src/components/EditCardDialog.tsx',
    'src/components/FastLoadingFallback.tsx',
    'src/components/FileUploadDialog.tsx',
    'src/components/Graph3D.tsx',
    'src/components/GraphView.tsx',
    'src/components/GraphViewHeavy.tsx',
    'src/components/HabitTracker.tsx',
    'src/components/ImportDialog.tsx',
    'src/components/InfiniteWhiteboard.tsx',
    'src/components/LoadingSpinner.tsx',
    'src/components/MediaUpload.tsx',
    'src/components/MobileOptimizedLayout.tsx',
    'src/components/MobileWhiteboard.tsx',
    'src/components/Notebooks.tsx',
    'src/components/Notes.tsx',
    'src/components/OrganizationMethodDialog.tsx',
    'src/components/RecommendationSidebar.tsx',
    'src/components/SearchBar.tsx',
    'src/components/SecurityNotice.tsx',
    'src/components/StickyNotes.tsx',
    'src/components/StickyNotesEnhanced.tsx',
    'src/components/VaultImportDialog.tsx',
    'src/components/WordDefinitionPopover.tsx',
    'src/components/ZettelCard.tsx',
    
    // UI Components
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
    'src/components/ui/use-toast.ts',
    
    // Integrations
    'src/integrations/supabase/client.ts',
    
    // Supabase
    'supabase/config.toml',
    'supabase/functions/ai-edit-card/index.ts',
    'supabase/functions/ai-reorganize-cards/index.ts',
    
    // Public
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

// Core application files to export
const getCoreFiles = (): FileEntry[] => [
  // Package files
  {
    path: 'package.json',
    content: JSON.stringify({
      "name": "zettelkasten-knowledge-system",
      "private": true,
      "version": "1.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        "preview": "vite preview"
      },
      "dependencies": {
        "@hookform/resolvers": "^3.10.0",
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
        "@react-three/drei": "^9.122.0",
        "@react-three/fiber": "^8.18.0",
        "@supabase/storage-js": "^2.12.2",
        "@supabase/supabase-js": "^2.56.1",
        "@tanstack/react-query": "^5.85.6",
        "@xyflow/react": "^12.8.4",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "cmdk": "^1.1.1",
        "date-fns": "^3.6.0",
        "embla-carousel-react": "^8.6.0",
        "fabric": "^6.7.1",
        "html2canvas": "^1.4.1",
        "input-otp": "^1.4.2",
        "jspdf": "^3.0.2",
        "jszip": "^3.10.1",
        "file-saver": "^2.0.5",
        "lucide-react": "^0.462.0",
        "next-themes": "^0.4.6",
        "react": "^18.3.1",
        "react-colorful": "^5.6.1",
        "react-day-picker": "^8.10.1",
        "react-dom": "^18.3.1",
        "react-draggable": "^4.5.0",
        "react-hook-form": "^7.61.1",
        "react-resizable-panels": "^2.1.9",
        "react-router-dom": "^6.30.1",
        "recharts": "^2.15.4",
        "sonner": "^1.7.4",
        "tailwind-merge": "^2.6.0",
        "tailwindcss-animate": "^1.0.7",
        "three": "^0.158.0",
        "vaul": "^0.9.9",
        "zod": "^3.25.76"
      },
      "devDependencies": {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        "@typescript-eslint/eslint-plugin": "^7.15.0",
        "@typescript-eslint/parser": "^7.15.0",
        "@vitejs/plugin-react": "^4.3.1",
        "autoprefixer": "^10.4.19",
        "eslint": "^8.57.0",
        "eslint-plugin-react-hooks": "^4.6.2",
        "eslint-plugin-react-refresh": "^0.4.7",
        "postcss": "^8.4.38",
        "tailwindcss": "^3.4.4",
        "typescript": "^5.2.2",
        "vite": "^5.3.4"
      }
    }, null, 2)
  },
  
  // README
  {
    path: 'README.md',
    content: `# ZettelWeave Nexus - Complete Zettelkasten Knowledge System

A comprehensive, production-ready knowledge management system built with React, TypeScript, and Supabase.

## 🚀 Features

- 📝 **Rich Note-Taking**: Advanced text formatting and media support
- 🔗 **Zettelkasten Method**: Interconnected knowledge cards with graph visualization  
- 📊 **Visual Knowledge Graph**: Interactive 3D graph of your knowledge network
- 🎨 **Infinite Whiteboard**: Creative thinking space with drawing tools
- 📅 **Integrated Calendar**: Scheduling and time management
- 📖 **Notebook Organization**: Hierarchical content organization
- 🏷️ **Advanced Tagging**: Categorization with Dewey Decimal System
- 📱 **Mobile Responsive**: Perfect experience on all devices
- 🎭 **Dark/Light Themes**: Beautiful Apple-inspired design
- 🔒 **Secure Authentication**: User accounts with data privacy
- ☁️ **Cloud Synchronization**: Real-time data sync across devices
- 🤖 **AI Integration**: Smart recommendations and content assistance
- 📈 **Analytics Dashboard**: Insights into your knowledge growth
- 📤 **Export Options**: Multiple formats (PDF, Markdown, JSON)
- 🔍 **Powerful Search**: Full-text search across all content

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Apple-inspired design)
- **State Management**: React Query + Custom hooks
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL with RLS)
- **Visualization**: React Flow + Three.js
- **Canvas**: Fabric.js for whiteboard functionality

## ⚡ Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Environment Setup
Create a \`.env\` file in the root directory:
\`\`\`env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 3. Database Setup
1. Create a new [Supabase](https://supabase.com) project
2. Run the SQL migrations in \`supabase/migrations/\` (if available)
3. Set up the following tables with Row Level Security (RLS):

**Required Tables:**
- \`zettel_cards\` - Core knowledge cards
- \`notes\` - Free-form notes
- \`notebooks\` - Organization containers
- \`calendar_events\` - Scheduling data
- \`profiles\` - User profile information

**RLS Policies:**
All tables should have policies allowing users to CRUD their own data only.

### 4. Development Server
\`\`\`bash
npm run dev
\`\`\`

Visit \`http://localhost:5173\` to see your application.

## 📦 Production Deployment

### Build for Production
\`\`\`bash
npm run build
\`\`\`

### Deploy Options

**Netlify/Vercel (Recommended):**
1. Connect your GitHub repository
2. Set build command: \`npm run build\`
3. Set publish directory: \`dist\`
4. Add environment variables in the dashboard

**Manual Deployment:**
1. Build the project: \`npm run build\`
2. Upload the \`dist\` folder to your hosting provider
3. Configure environment variables
4. Set up redirects for SPA routing

## 🏗️ Project Structure

\`\`\`
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── ZettelCard.tsx  # Knowledge card component
│   └── ...
├── hooks/              # Custom React hooks
├── pages/              # Main application pages
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── integrations/       # External service integrations
    └── supabase/       # Supabase configuration
\`\`\`

## 🔧 Configuration

### Supabase Setup
1. Enable Row Level Security on all tables
2. Set up authentication providers (email, Google, etc.)
3. Configure storage buckets for file uploads
4. Set up real-time subscriptions for live updates

### Environment Variables
- \`VITE_SUPABASE_URL\`: Your Supabase project URL
- \`VITE_SUPABASE_ANON_KEY\`: Your Supabase anonymous key

## 🎨 Design System

The application uses an Apple-inspired design system with:
- Clean, minimal aesthetics
- Glassmorphic elements
- Smooth animations and transitions
- Consistent spacing and typography
- Accessible color contrast ratios

## 🔒 Security

- Row Level Security (RLS) on all database tables
- Secure authentication flows
- Data validation and sanitization
- HTTPS enforcement
- Regular security audits

## 📱 Mobile Support

Fully responsive design optimized for:
- Mobile phones (iOS/Android)
- Tablets
- Desktop computers
- Progressive Web App (PWA) capabilities

## 🤝 Contributing

This is a complete, production-ready knowledge management system. 
Feel free to customize and extend for your specific needs.

## 📄 License

MIT License - feel free to use this codebase for personal or commercial projects.

## 🆘 Troubleshooting

### Common Issues

**Build Errors:**
- Ensure all dependencies are installed: \`npm install\`
- Check Node.js version compatibility (16+ recommended)
- Clear cache: \`npm run build --force\`

**Database Connection:**
- Verify Supabase credentials in \`.env\`
- Check RLS policies are properly configured
- Ensure tables exist with correct schemas

**Authentication Issues:**
- Confirm Supabase Auth is enabled
- Check redirect URLs in Supabase dashboard
- Verify email templates are configured

**Performance:**
- Enable image optimization
- Use lazy loading for large datasets
- Implement proper caching strategies

### Getting Help

1. Check the browser console for error messages
2. Verify network requests in developer tools
3. Test database queries directly in Supabase
4. Review component state management

This application is designed to be self-hosted and fully functional out of the box. 
Follow the setup instructions carefully for the best experience.`
  },

  // Environment template
  {
    path: '.env.template',
    content: `# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Replace with your actual Supabase project credentials
# Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api`
  },

  // .gitignore
  {
    path: '.gitignore',
    content: `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Supabase
.branches
.temp`
  }
];

export const exportCodebase = async (userEmail: string): Promise<void> => {
  // Security check - only allow specific email
  if (userEmail !== 'mpalmero197@gmail.com') {
    throw new Error('Export functionality is restricted to authorized users only.');
  }

  const zip = new JSZip();
  
  try {
    // Add core configuration files
    const coreFiles = getCoreFiles();
    coreFiles.forEach(file => {
      zip.file(file.path, file.content);
    });

    // Attempt to fetch and add all source files
    try {
      const sourceFiles = await getAllSourceFiles();
      sourceFiles.forEach(file => {
        zip.file(file.path, file.content);
      });
      console.log(`Successfully packaged ${sourceFiles.length} source files`);
    } catch (error) {
      console.warn('Could not fetch all source files, exporting core files only:', error);
    }

    // Generate and download zip
    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(blob, `zettelweave-nexus-complete-${timestamp}.zip`);
    
    console.log('Codebase export completed successfully');
    
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export codebase. Please try again.');
  }
};