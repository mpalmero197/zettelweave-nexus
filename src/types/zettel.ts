export interface ZettelCard {
  id: string;
  number: string; // Dewey-like number (e.g., "100.23.4")
  title: string;
  content: string;
  tags: string[];
  category: string;
  created: string; // Changed from Date to string for compatibility
  modified: string; // Changed from Date to string for compatibility
  linkedCards: string[]; // IDs of linked cards
  description?: string;
  author?: string;
  imageUrl?: string;
  videoUrl?: string;
  image_url?: string; // Alternative naming for compatibility
  video_url?: string; // Alternative naming for compatibility
  notebook_id?: string; // For notebook organization
  is_favorite?: boolean; // For marking favorites
  created_at?: string; // For Supabase compatibility
  updated_at?: string; // For Supabase compatibility
  cardColor?: string; // For card color customization
  enable_dictionary?: boolean; // For dictionary hover feature
}

export interface CategoryDefinition {
  range: string; // e.g., "000-099"
  name: string;
  description: string;
  color: string;
}

export interface WordDefinition {
  word: string;
  definition: string;
  partOfSpeech: string;
  examples?: string[];
  cardReference?: ZettelCard;
  etymology?: string;
  phonetic?: string;
}

export type OrganizationMethod = "dewey" | "luhmann" | "folgezettel" | "thematic";

export interface OrganizationMethodDefinition {
  id: OrganizationMethod;
  name: string;
  description: string;
  numbering: string;
  example: string;
}

export const ORGANIZATION_METHODS: OrganizationMethodDefinition[] = [
  {
    id: "dewey",
    name: "Dewey Decimal",
    description: "Hierarchical classification system based on subject areas",
    numbering: "000-999 with subdivisions",
    example: "150.1 (Psychology - Theory)"
  },
  {
    id: "luhmann",
    name: "Luhmann System",
    description: "Niklas Luhmann's alphanumeric branching system",
    numbering: "Alphanumeric branching (1, 1a, 1a1, 1b, etc.)",
    example: "1a3b2 (Branching sequence)"
  },
  {
    id: "folgezettel",
    name: "Folgezettel",
    description: "Sequential numbering with connections",
    numbering: "Sequential with decimal subdivisions",
    example: "21.3.4 (Sequential branching)"
  },
  {
    id: "thematic",
    name: "Thematic",
    description: "Organization by themes and topics",
    numbering: "Theme-based prefixes",
    example: "PHIL-001 (Philosophy theme)"
  }
];

export const DEWEY_CATEGORIES: CategoryDefinition[] = [
  { range: "000-099", name: "Computer Science & Knowledge", description: "Information, knowledge, systems", color: "000" },
  { range: "100-199", name: "Philosophy & Psychology", description: "Logic, ethics, psychology", color: "100" },
  { range: "200-299", name: "Religion & Theology", description: "Sacred texts, beliefs, practices", color: "200" },
  { range: "300-399", name: "Social Sciences", description: "Sociology, politics, economics", color: "300" },
  { range: "400-499", name: "Language & Linguistics", description: "Languages, dictionaries, communication", color: "400" },
  { range: "500-599", name: "Pure Sciences", description: "Mathematics, physics, chemistry", color: "500" },
  { range: "600-699", name: "Applied Sciences", description: "Medicine, engineering, technology", color: "600" },
  { range: "700-799", name: "Arts & Recreation", description: "Fine arts, music, sports", color: "700" },
  { range: "800-899", name: "Literature", description: "Novels, poetry, rhetoric", color: "800" },
  { range: "900-999", name: "History & Geography", description: "History, biography, geography", color: "900" }
];