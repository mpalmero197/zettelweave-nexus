# Baku Scribe - Advanced Knowledge Management & Creation Platform

A comprehensive knowledge management and long-form writing platform built with React, TypeScript, Supabase, and modern web technologies. Baku Scribe helps you organize, connect, and explore your knowledge while providing powerful tools for creating books, theses, dissertations, and more.

**Lovable Project URL**: https://lovable.dev/projects/4eb34d34-fd9d-491d-b4fe-83f99b554cfb

## 🚀 Features Overview

### Core Knowledge Management
- **Zettelkasten Cards** with clickable, persistent links between cards
- **Notes & Notebooks** with expandable views showing contents
- **File Manager** for documents (PDF, DOCX, XLSX, TXT, CSV, MD, JSON)
- **Recycle Bin** with configurable auto-delete (7/15/30/60 days)
- **Visual Knowledge Graph** (2D and 3D) for exploring connections
- **Calendar & Events** linked to cards and notes
- **AI-Powered Search** and content recommendations
- **Similar Content Detection** using vector embeddings

### Organizational Systems
- Dewey Decimal Classification (000-999)
- Luhmann Zettelkasten (1, 1a, 1a1)
- Folgezettel Note Sequences (1, 1.1, 1.1.1)
- Thematic Custom Categories
- AI-assisted reorganization between systems

### Catalyst - Long-Form Writing Platform
**Professional writing tool for books, theses, and dissertations:**

- **Hierarchical Chapter Management**
  - Multi-level chapter structure (chapters, sections, subsections)
  - Drag-and-drop organization
  - Word count tracking per chapter
  - Visual chapter tree navigation

- **AI-Powered Writing Tools**
  - AI Chapter Generation from outlines
  - Content Enhancement (paraphrase, expand, summarize)
  - Academic tone adjustment (formalize/simplify)
  - Smart writing suggestions

- **Citation Management**
  - Multiple citation styles (APA, MLA, Chicago, Harvard)
  - AI-powered citation formatting
  - Citation database with metadata
  - Automatic bibliography generation

- **Writing Goals & Progress**
  - Word count targets per chapter/document
  - Deadline tracking
  - Progress visualization

- **Export Options**
  - PDF with custom formatting
  - DOCX for Word
  - EPUB for e-readers
  - Professional templates

### Creative Tools
- **Infinite Whiteboard** (Desktop & Mobile-Optimized)
  - Desktop: Full-featured drawing with advanced tools
  - Mobile: Touch-optimized interface with bottom toolbar
  - Pan, draw, shapes, text, sticky notes
  - Export as images
  
- **Bullet Journal** for daily planning
- **Habit Tracker** with streaks and analytics
- **Sticky Notes** for quick capture
- **Customizable Dashboard** with draggable widgets

### Audio & Recording
- **Meeting Recorder** with AI transcription
- **Audio Snippets** with playback
- **Voice Notes** integration with cards

### AI Features
- Content recommendations based on similarity
- Auto-categorization (Dewey Decimal)
- Card editing assistance
- Meeting transcription
- Content summarization
- Smart content enhancement
- Vector-based semantic search

### Admin Panel (Admin Role Required)
**Complete platform control hub with privacy-first design:**

- **Overview Dashboard**
  - Real-time activity statistics
  - System health monitoring
  - Today's content creation metrics

- **User Management**
  - View all users
  - Manage user roles (user, admin)
  - Account status monitoring
  - User activity tracking

- **Content Metadata Monitor**
  - View content titles and timestamps
  - Monitor creation trends
  - Content counts and statistics
  - **Privacy Protection**: Admins CANNOT see actual content of notes/cards

- **Security Monitor**
  - Security audit logs
  - Access monitoring
  - Security event tracking

- **System Settings**
  - Database management
  - Auto-cleanup configuration
  - System statistics
  - Storage usage monitoring

- **Site Export & Backup**
  - Export complete codebase
  - Download source, configs, Supabase functions
  - Deployment ready ZIP file
  - Includes deployment instructions

- **Documentation Viewer**
  - Built-in platform documentation
  - Feature guides
  - API references

### Account Management
**Comprehensive user profile settings:**

- **Profile Management**
  - Display name customization
  - Avatar upload and management
  - About me section
  - Profile information persistence

- **Security Settings**
  - Password change with validation
  - Current password verification
  - Secure password requirements

- **Appearance Customization**
  - 8 theme options (Light, Dark, Midnight, Ocean, Forest, Sunset, Lavender, System)
  - Real-time theme preview
  - Theme persistence across sessions

- **Debug Logs**
  - Console log viewer
  - Error tracking
  - Performance monitoring

- **Backup & Export**
  - Full codebase export (admin only)
  - Data backup functionality

### Global Features
- **Dictionary Toggle** - Enable/disable word definitions globally from user menu
- **Mobile-First Design** - Optimized experiences for all screen sizes
- **Responsive Layouts** - Adaptive UI for tablets and phones
- **Touch Controls** - Native touch gestures on mobile devices

### Accessibility (WCAG 2.1 AA)
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Focus indicators
- Screen reader support
- High contrast mode
- Responsive design
- Mobile accessibility

## 📋 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173`

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
- Find similar cards automatically using AI

**Organization Methods:**
- **Dewey**: Library classification (000-999)
- **Luhmann**: Sequential branching (1, 1a, 1a1)
- **Folgezettel**: Decimal tree (1, 1.1, 1.1.1)
- **Thematic**: Custom categories
- Use AI to reorganize between systems

### Catalyst Writing Platform

**Starting a New Document:**
1. Navigate to Catalyst tab
2. Click "New Document"
3. Add title and choose source (cards, notes, files, or scratch)
4. Select items to include (optional)
5. Begin writing

**Managing Chapters:**
1. Use Chapter Manager in sidebar
2. Click "Add Chapter" for new chapters
3. Select parent chapter for subsections
4. Use AI to generate chapters from outlines
5. Track word counts per chapter
6. Drag to reorder chapters

**AI Chapter Generation:**
1. Click "AI Generate" in Chapter Manager
2. Enter chapter title
3. Provide outline or context
4. Select document type (book, thesis, dissertation, etc.)
5. Choose tone (professional, academic, creative, etc.)
6. AI generates complete chapter content

**Content Enhancement:**
1. Select text in editor
2. Click enhancement tool
3. Choose operation:
   - Paraphrase for variety
   - Expand for detail
   - Summarize for brevity
   - Improve for clarity
   - Formalize for academic tone
   - Simplify for readability

**Citation Management:**
1. Open Citations panel
2. Add citation with metadata (authors, title, year, etc.)
3. Select citation type (book, journal, website, etc.)
4. Click "Format" to generate citation in chosen style
5. Insert into document
6. Auto-generate bibliography

**Setting Writing Goals:**
1. Open Writing Goals panel
2. Set target word count
3. Set deadline date
4. Assign to document or specific chapter
4. Track progress in real-time

**Exporting:**
1. Click "Export" button
2. Choose format (PDF, DOCX, EPUB)
3. Select options (TOC, citations, formatting)
4. Download file

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

### Whiteboard

**Desktop Usage:**
1. Navigate to Whiteboard tab
2. Use drawing tools (pen, shapes, text, sticky notes)
3. Adjust colors and sizes
4. Group objects together
5. Export as image
6. Clear when done

**Mobile Usage:**
1. Touch-optimized bottom toolbar
2. Large, easy-to-tap tool buttons
3. Pan tool as default for easy navigation
4. Swipe to pan across canvas
5. Tap tools to draw shapes
6. Color picker for drawing tools
7. Menu button for export/clear options

### Admin Panel

**Accessing:**
1. Must have admin role assigned
2. Navigate to /admin or click Admin Panel from user menu
3. Only visible to users with admin privileges

**Overview Tab:**
- Today's cards created
- Today's notes created  
- System health status
- Quick activity metrics

**Users Tab:**
- View all registered users
- See user roles and permissions
- Monitor last login times
- Manage user access

**Content Tab:**
- View content metadata (titles, timestamps)
- Monitor content creation trends
- Track platform usage
- **Privacy Protected**: Content itself is never visible

**Security Tab:**
- Security audit logs
- Access monitoring
- Failed login attempts
- Security event tracking

**System Tab:**
- Database statistics
- Storage usage
- Cleanup operations
- System health checks

**Export Tab:**
- Export complete site codebase
- Download as ZIP file
- Includes all source code, configs, Supabase functions
- Ready for deployment to any platform

**Docs Tab:**
- Platform documentation
- Feature guides
- Best practices

### Account Settings

**Accessing:**
1. Click User icon in header
2. Select "Settings"

**Profile Tab:**
- Upload avatar image
- Set display name
- Write about me section
- Save changes

**Security Tab:**
- Change password
- Current password verification
- Strong password requirements
- Security confirmation

**Appearance Tab:**
- Choose from 8 themes
- Real-time preview
- Light/dark mode variants
- Custom color schemes

**Debug Logs Tab:**
- View console logs
- Error tracking
- Performance data

## 🔒 Security Features

- Row-Level Security (RLS) on all tables
- User authentication via Supabase
- Secure file storage with RLS policies
- Security audit logging
- Password requirements (8+ chars, mixed case, numbers, symbols)
- Session management
- Admin role-based access control
- Encrypted secrets for API keys

## 🗄️ Database Schema

**Core Tables:**
- `zettel_cards` - Knowledge cards with links and embeddings
- `notes` - Simple notes with embeddings
- `notebooks` - Organization containers
- `files` - File metadata
- `calendar_events` - Events linked to content
- `user_preferences` - Settings (auto-delete, etc.)
- `profiles` - User info with avatar and bio
- `user_roles` - Access control (user, admin)
- `catalyst_documents` - Long-form writing projects
- `catalyst_chapters` - Hierarchical chapter structure
- `catalyst_citations` - Citation database
- `catalyst_writing_goals` - Writing targets and deadlines
- `security_audit_log` - Security event tracking

**Storage Buckets:**
- `documents` - User files
- `card-media` - Images/videos for cards
- `audio-snippets` - Voice recordings
- `meeting-recordings` - Meeting audio files
- `avatars` - User profile pictures

## 🎨 Customization

**Themes:**
- System (auto light/dark)
- Light
- Dark
- Midnight (pure black)
- Ocean (blue tones)
- Forest (green palette)
- Sunset (warm orange)
- Lavender (purple hues)

**Dashboard:**
- Drag widgets to rearrange
- Resize by dragging corners
- Add/remove from sidebar
- Auto-save layout
- 15+ widget types

**Global Settings:**
- Dictionary toggle (enable/disable globally)
- Theme selection
- Auto-delete preferences
- Notification preferences

## 🚢 Deployment

**Via Lovable:**
1. Click "Publish" button
2. Deployed to `yoursite.lovable.app`

**Custom Domain:**
1. Go to Project > Settings > Domains
2. Add your domain
3. Update DNS records
4. SSL auto-provisioned

**Self-Hosting:**
```bash
npm run build
# Deploy dist/ folder to:
# - Vercel, Netlify, GitHub Pages
# - AWS S3 + CloudFront
# - Your own server
```

**Supabase Setup:**
1. Create Supabase project
2. Set environment variables
3. Run migrations from `supabase/migrations/`
4. Deploy edge functions from `supabase/functions/`
5. Configure storage buckets and RLS policies

## 🔧 Development

**Project Structure:**
```
src/
├── components/          # React components
│   ├── admin/          # Admin panel components
│   ├── catalyst/       # Writing platform components
│   ├── ui/             # shadcn/ui components
│   └── widgets/        # Dashboard widgets
├── hooks/              # Custom hooks
├── pages/              # Main pages
│   ├── Index.tsx       # Main app
│   ├── Admin.tsx       # Admin panel
│   └── Auth.tsx        # Authentication
├── types/              # TypeScript types
├── utils/              # Utilities
└── integrations/       # Supabase client

supabase/
├── functions/          # Edge Functions
│   ├── ai-categorize-card/
│   ├── ai-edit-card/
│   ├── ai-search/
│   ├── catalyst-ai-generate-chapter/
│   ├── catalyst-ai-enhance-content/
│   ├── catalyst-ai-generate-citations/
│   ├── find-similar-content/
│   └── transcribe-audio/
└── migrations/         # Database changes
```

**Technologies:**
- Frontend: React 18, TypeScript, Vite
- UI: shadcn/ui, Tailwind CSS, Radix UI
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- State: React Query, Local Storage
- Visualization: React Flow, Three.js, D3.js
- Rich Text: TipTap Editor
- Canvas: Fabric.js v6
- Mobile: Progressive Web App (PWA) ready

**Edge Functions:**
- AI content generation (OpenAI)
- Document processing
- Citation formatting
- Content enhancement
- Transcription services
- Vector embedding generation

## 🧪 Testing

```bash
# Run type checking
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐛 Troubleshooting

**Build Errors:**
```bash
rm -rf node_modules && npm install
rm -rf .vite
```

**Auth Issues:**
- Check Supabase project is active
- Verify API keys in integrations
- Clear browser storage
- Check RLS policies

**Database Errors:**
- Check RLS policies are enabled
- Verify user authentication
- Review Supabase logs
- Check security audit log

**File Upload:**
- Check storage bucket exists
- Verify storage policies
- Check file size limits (20MB default)
- Verify bucket permissions

**Mobile Whiteboard:**
- Ensure touch events are enabled
- Check canvas initialization
- Verify Fabric.js v6 compatibility
- Test on actual device if emulator issues

**Admin Access:**
- Verify user has admin role in `user_roles` table
- Check `has_role` and `is_admin` database functions
- Review admin RLS policies

## 📱 Mobile Support

**Progressive Web App (PWA):**
- Install to home screen
- Offline support
- Fast loading
- Native app feel

**Mobile Optimizations:**
- Touch-friendly controls
- Responsive layouts
- Mobile-optimized whiteboard
- Bottom navigation on mobile
- Swipe gestures
- Large touch targets

## 🔐 Admin Features

**Requirements:**
- Admin role in `user_roles` table
- Access via /admin route
- RLS policies enforced

**Capabilities:**
- User management
- Role assignment
- System monitoring
- Database cleanup
- Activity tracking
- Documentation access

## 📄 License

MIT License

## 🙏 Credits

- Built with [Lovable](https://lovable.dev)
- UI: [shadcn/ui](https://ui.shadcn.com)
- Backend: [Supabase](https://supabase.com)
- Icons: [Lucide](https://lucide.dev)
- Editor: [TipTap](https://tiptap.dev)
- Canvas: [Fabric.js](http://fabricjs.com)

---

**Built with ❤️ using Lovable**

## 🆕 Recent Updates

### v2.0 - Catalyst & Enhanced Admin (2025)
- Added Catalyst long-form writing platform
- AI chapter generation and content enhancement
- Citation management with multiple styles
- Hierarchical chapter structure
- Writing goals and progress tracking
- Enhanced Admin panel with activity monitoring
- Improved Account Management with profile features
- Mobile-optimized whiteboard
- Dictionary toggle in user menu
- Profile avatar and about me sections

### v1.5 - Mobile & UI Enhancements
- Touch-optimized whiteboard interface
- Responsive navigation improvements
- Enhanced theme system
- Dashboard widget customization

### v1.0 - Initial Release
- Zettelkasten card system
- Notes and notebooks
- File management
- Knowledge graph visualization
- Calendar integration