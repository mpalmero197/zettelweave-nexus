export type DocumentTheme = {
  id: string;
  name: string;
  description: string;
  className: string;
  category: string;
};

export const DOCUMENT_THEMES: DocumentTheme[] = [
  // Documents
  { id: 'default', name: 'Word Default', description: 'Standard professional styling', className: 'catalyst-theme-default', category: 'Documents' },
  { id: 'modern', name: 'Modern Minimalist', description: 'Clean sans-serif with subtle accents', className: 'catalyst-theme-modern', category: 'Documents' },
  { id: 'classic', name: 'Classic Serif', description: 'Traditional academic and editorial', className: 'catalyst-theme-classic', category: 'Documents' },
  { id: 'academic', name: 'Academic / Thesis', description: 'Formal double-spaced research styling', className: 'catalyst-theme-academic', category: 'Documents' },

  // Creative / Marketing
  { id: 'creative', name: 'Creative Expression', description: 'Bold typography with high contrast', className: 'catalyst-theme-creative', category: 'Creative' },
  { id: 'poster', name: 'Poster / Flyer', description: 'Large headings, high-impact visual layout', className: 'catalyst-theme-poster', category: 'Creative' },
  { id: 'newsletter', name: 'Newsletter', description: 'Two-column friendly, editorial styling', className: 'catalyst-theme-newsletter', category: 'Creative' },

  // Professional
  { id: 'resume', name: 'Resume / CV', description: 'Clean structured layout for CVs', className: 'catalyst-theme-resume', category: 'Professional' },
  { id: 'business', name: 'Business Report', description: 'Corporate professional with headers', className: 'catalyst-theme-business', category: 'Professional' },
  { id: 'technical', name: 'Technical / Code', description: 'Monospaced styling for developers', className: 'catalyst-theme-technical', category: 'Professional' },

  // Books
  { id: 'novel', name: 'Novel / Fiction', description: 'Comfortable reading with indented paragraphs', className: 'catalyst-theme-novel', category: 'Books' },
  { id: 'dark', name: 'Dark Manuscript', description: 'Dark background for night writing', className: 'catalyst-theme-dark', category: 'Books' },
];

export const getThemeClass = (themeId: string) => {
  return DOCUMENT_THEMES.find(t => t.id === themeId)?.className || 'catalyst-theme-default';
};

export const getThemesByCategory = () => {
  const categories: Record<string, DocumentTheme[]> = {};
  DOCUMENT_THEMES.forEach(theme => {
    if (!categories[theme.category]) categories[theme.category] = [];
    categories[theme.category].push(theme);
  });
  return categories;
};
