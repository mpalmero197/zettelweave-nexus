export interface ZettelCard {
  id: string;
  number: string; // Dewey-like number (e.g., "100.23.4")
  title: string;
  content: string;
  tags: string[];
  category: string;
  created: Date;
  modified: Date;
  linkedCards: string[]; // IDs of linked cards
  description?: string;
  author?: string;
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
}

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