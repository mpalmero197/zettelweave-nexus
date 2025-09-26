import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileEntry {
  path: string;
  content: string;
}

// Core application files to export
const coreFiles: FileEntry[] = [
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
    content: `# Zettelkasten Knowledge System

A comprehensive knowledge management system built with React, TypeScript, and Supabase.

## Features

- 📝 Note-taking with rich text formatting
- 🔗 Interconnected knowledge cards (Zettelkasten method)
- 📊 Visual knowledge graph
- 🎨 Infinite whiteboard for creative thinking
- 📅 Integrated calendar and scheduling
- 📖 Notebook organization
- 🏷️ Tagging system
- 📱 Mobile-responsive design
- 🎭 Multiple themes
- 🔒 Secure authentication
- ☁️ Cloud synchronization

## Quick Start

1. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**
   Create a \`.env\` file with your Supabase credentials:
   \`\`\`env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   \`\`\`

3. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL migrations in the \`supabase/migrations\` folder
   - Enable Row Level Security (RLS) policies

4. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

## Deployment

### Build for production
\`\`\`bash
npm run build
\`\`\`

### Deploy to Netlify/Vercel
1. Build the project: \`npm run build\`
2. Upload the \`dist\` folder to your hosting provider
3. Configure environment variables in your hosting dashboard

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query + Custom hooks
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## License

MIT License`
  },

  // Environment template
  {
    path: '.env.template',
    content: `# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`
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
    coreFiles.forEach(file => {
      zip.file(file.path, file.content);
    });

    // Generate and download zip
    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(blob, `zettelkasten-backup-${timestamp}.zip`);
    
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export codebase. Please try again.');
  }
};