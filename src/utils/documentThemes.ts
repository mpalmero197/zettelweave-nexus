export type DocumentTheme = {
  id: string;
  name: string;
  description: string;
  className: string;
};

export const DOCUMENT_THEMES: DocumentTheme[] = [
  { id: 'default', name: 'Word Default', description: 'Standard professional styling', className: 'catalyst-theme-default' },
  { id: 'modern', name: 'Modern Minimalist', description: 'Clean sans-serif with subtle accents', className: 'catalyst-theme-modern' },
  { id: 'classic', name: 'Classic Serif', description: 'Traditional academic and editorial', className: 'catalyst-theme-classic' },
  { id: 'creative', name: 'Creative Expression', description: 'Bold typography with high contrast', className: 'catalyst-theme-creative' },
  { id: 'technical', name: 'Technical Mono', description: 'Monospaced styling for developers', className: 'catalyst-theme-technical' },
];

export const getThemeClass = (themeId: string) => {
  return DOCUMENT_THEMES.find(t => t.id === themeId)?.className || 'catalyst-theme-default';
};
