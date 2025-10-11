import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentationViewer() {
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadme();
  }, []);

  const fetchReadme = async () => {
    try {
      // Try fetching from root first (for production), then from public folder
      let response = await fetch('/README.md');
      if (!response.ok) {
        // Fallback to fetching from GitHub or showing error
        throw new Error('README not accessible');
      }
      const text = await response.text();
      setReadmeContent(text);
    } catch (error) {
      console.error('Error loading README:', error);
      // Full hardcoded README as fallback
      setReadmeContent(`# PendragonX - Advanced Knowledge Management System

A comprehensive knowledge management platform built with React, TypeScript, Supabase, and modern web technologies. PendragonX helps you organize, connect, and explore your knowledge using multiple organizational systems including Dewey Decimal, Luhmann, and Folgezettel methods.

**Lovable Project URL**: https://lovable.dev/projects/4eb34d34-fd9d-491d-b4fe-83f99b554cfb

## 🚀 Features Overview

### Core Knowledge Management
- **Zettelkasten Cards** with clickable, persistent links between cards
- **Notes & Notebooks** with expandable views showing contents
- **File Manager** for documents (PDF, DOCX, XLSX, TXT, CSV, MD, JSON)
- **Recycle Bin** with configurable auto-delete (7/15/30/60 days)
- **Visual Knowledge Graph** for exploring connections
- **Calendar & Events** linked to cards and notes

### Organizational Systems
- Dewey Decimal Classification (000-999)
- Luhmann Zettelkasten (1, 1a, 1a1)
- Folgezettel Note Sequences (1, 1.1, 1.1.1)
- Thematic Custom Categories

### Creative Tools
- **Infinite Whiteboard** for brainstorming
- **Bullet Journal** for daily planning
- **Habit Tracker** with streaks
- **Sticky Notes** for quick capture
- **Meeting Recorder** with AI transcription

### AI Features
- Content recommendations
- Auto-categorization (Dewey)
- Card editing assistance
- Meeting transcription
- Content summarization

### Accessibility (WCAG 2.1 AA)
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Focus indicators
- Screen reader support
- High contrast mode
- Responsive design

## 📋 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

Visit \`http://localhost:5173\`

## 📖 Complete Feature Guide

### Zettelkasten Cards

**Creating Cards:**
1. Click "+" button or "New Card" in Cards tab
2. Add title, description, and content
3. Choose organization method and category
4. Add tags (press Enter after each)
5. Link to other cards by entering card IDs
6. Attach media if needed
7. Save

**Linking Cards:**
- Links persist between sessions automatically
- Click any linked card in the viewer to navigate
- Build knowledge networks by connecting related ideas
- View all connections in the card viewer

**Organization Methods:**
- **Dewey**: Library classification (000-999)
- **Luhmann**: Sequential branching (1, 1a, 1a1)
- **Folgezettel**: Decimal tree (1, 1.1, 1.1.1)
- **Thematic**: Custom categories
- Use AI to reorganize between systems

### Notebooks

**Creating:**
1. Go to Notebooks tab
2. Click "New Notebook"
3. Add name, description, and color
4. Save

**Using:**
- Assign notes and cards to notebooks
- Click chevron (▼) to expand and view contents
- See 5 most recent items in each notebook
- Color-code for visual organization

### File Manager

**Supported Formats:**
- Documents: PDF, DOC, DOCX, TXT, MD
- Spreadsheets: XLSX, XLS, CSV
- Data: JSON, XML
- Images: JPG, PNG, GIF, WEBP

**Usage:**
1. Navigate to Files tab
2. Upload via drag-drop or browse
3. View files with built-in previewer
4. Download or delete as needed
5. Search by filename

**File Viewer:**
- Text files: In-browser preview
- PDFs: Embedded viewer
- Images: Full preview
- Other: Download to view

### Recycle Bin

**Features:**
- Soft-delete for cards, notes, and files
- Configurable auto-delete: 7, 15, 30, or 60 days
- Restore or permanently delete items
- View days until permanent deletion
- Filter by type (cards/notes/files)

**Usage:**
1. Go to Recycle tab
2. Set auto-delete period (top right)
3. Review deleted items
4. Click "Restore" to recover
5. Click "X" for permanent deletion (cannot be undone)

### Calendar

1. Navigate to Calendar tab
2. Click date to create event
3. Add title, description, time
4. Link to cards or notes
5. View in calendar grid

### Knowledge Graph

1. Go to Graph tab
2. View cards as connected nodes
3. Colors represent categories
4. Click nodes to view cards
5. Drag to rotate, scroll to zoom
6. Explore knowledge connections

### Whiteboard

1. Navigate to Whiteboard tab
2. Use drawing tools (pen, shapes, text)
3. Adjust colors and sizes
4. Create cards from content
5. Export as image
6. Clear when done

### Bullet Journal

1. Go to Journal tab
2. Add daily tasks
3. Track mood
4. Mark tasks complete
5. Review weekly/monthly
6. Convert tasks to cards

### Habit Tracker

1. Navigate to Habits tab
2. Create new habits
3. Set frequency (daily/weekly)
4. Check off daily
5. Track streaks
6. View completion analytics

### Meeting Recorder

1. Go to Recorder tab
2. Start recording (allow mic access)
3. AI transcribes automatically
4. Attach to cards/notes
5. Playback anytime

## 🔒 Security Features

- Row-Level Security (RLS) on all tables
- User authentication via Supabase
- Secure file storage
- Security audit logging
- Password requirements (8+ chars, mixed case, numbers, symbols)
- Session management

## 🗄️ Database Schema

**Core Tables:**
- \`zettel_cards\` - Knowledge cards with links
- \`notes\` - Simple notes
- \`notebooks\` - Organization containers
- \`files\` - File metadata
- \`calendar_events\` - Events
- \`user_preferences\` - Settings (auto-delete, etc.)
- \`profiles\` - User info
- \`user_roles\` - Access control

**Storage Buckets:**
- \`documents\` - User files
- \`card-media\` - Images/videos
- \`audio-snippets\` - Recordings

## 🎨 Customization

**Theme:**
- Toggle light/dark mode (header button)
- Automatic theme adaptation

**Dashboard:**
- Drag widgets to rearrange
- Resize by dragging corners
- Add/remove from sidebar
- Auto-save layout

## 🚢 Deployment

**Via Lovable:**
1. Click "Publish" button
2. Deployed to \`yoursite.lovable.app\`

**Custom Domain:**
1. Go to Project > Settings > Domains
2. Add your domain
3. Update DNS records
4. SSL auto-provisioned

**Self-Hosting:**
\`\`\`bash
npm run build
# Deploy dist/ folder to:
# - Vercel, Netlify, GitHub Pages
# - AWS S3 + CloudFront
# - Your own server
\`\`\`

## 🔧 Development

**Project Structure:**
\`\`\`
src/
├── components/       # React components
├── hooks/           # Custom hooks
├── pages/           # Main pages
├── types/           # TypeScript types
├── utils/           # Utilities
└── integrations/    # Supabase, etc.

supabase/
├── functions/       # Edge Functions
└── migrations/      # Database changes
\`\`\`

**Technologies:**
- Frontend: React 18, TypeScript, Vite
- UI: shadcn/ui, Tailwind, Radix UI
- Backend: Supabase (PostgreSQL, Auth, Storage)
- State: React Query, Local Storage
- Viz: React Flow, Three.js

## 🐛 Troubleshooting

**Build Errors:**
\`\`\`bash
rm -rf node_modules && npm install
rm -rf .vite
\`\`\`

**Auth Issues:**
- Check Supabase project is active
- Verify API keys
- Clear browser storage

**Database Errors:**
- Check RLS policies
- Verify authentication
- Review Supabase logs

**File Upload:**
- Check storage bucket exists
- Verify storage policies
- Check file size limits (20MB)

## 📄 License

MIT License

## 🙏 Credits

- Built with [Lovable](https://lovable.dev)
- UI: [shadcn/ui](https://ui.shadcn.com)
- Backend: [Supabase](https://supabase.com)
- Icons: [Lucide](https://lucide.dev)

---

**Built with ❤️ using Lovable**`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([readmeContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('README downloaded');
  };

  const renderMarkdown = (markdown: string) => {
    return markdown
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return (
            <h1 key={index} className="text-3xl font-bold mt-6 mb-4 text-foreground">
              {line.replace('# ', '')}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-2xl font-bold mt-5 mb-3 text-foreground">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-xl font-semibold mt-4 mb-2 text-foreground">
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('#### ')) {
          return (
            <h4 key={index} className="text-lg font-semibold mt-3 mb-2 text-foreground">
              {line.replace('#### ', '')}
            </h4>
          );
        }

        // Lists
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-6 mb-1 text-foreground">
              {line.replace('- ', '')}
            </li>
          );
        }

        // Code blocks
        if (line.startsWith('```')) {
          return (
            <div key={index} className="bg-muted rounded p-1 my-2 font-mono text-sm">
              {line.replace(/```/g, '')}
            </div>
          );
        }

        // Bold
        const boldRegex = /\*\*(.+?)\*\*/g;
        if (boldRegex.test(line)) {
          const parts = line.split(boldRegex);
          return (
            <p key={index} className="mb-2 text-foreground">
              {parts.map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
          );
        }

        // Inline code
        const codeRegex = /`(.+?)`/g;
        if (codeRegex.test(line)) {
          const parts = line.split(codeRegex);
          return (
            <p key={index} className="mb-2 text-foreground">
              {parts.map((part, i) =>
                i % 2 === 1 ? (
                  <code key={i} className="bg-muted px-1 rounded font-mono text-sm">
                    {part}
                  </code>
                ) : (
                  part
                )
              )}
            </p>
          );
        }

        // Horizontal rule
        if (line === '---') {
          return <hr key={index} className="my-4 border-border" />;
        }

        // Empty line
        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }

        // Regular paragraph
        return (
          <p key={index} className="mb-2 text-foreground">
            {line}
          </p>
        );
      });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            System Documentation
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download README
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full rounded-md border p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {renderMarkdown(readmeContent)}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
