import { DEWEY_CATEGORIES } from "@/types/zettel";

export function categorizeContent(content: string, title: string): string {
  const text = (title + " " + content).toLowerCase();
  
  // Keywords for each category
  const categoryKeywords: Record<string, string[]> = {
    "000": ["computer", "data", "information", "system", "technology", "digital", "algorithm", "programming"],
    "100": ["philosophy", "ethics", "logic", "psychology", "mind", "consciousness", "existence", "thought"],
    "200": ["religion", "god", "faith", "spiritual", "sacred", "prayer", "belief", "church"],
    "300": ["society", "culture", "politics", "economics", "social", "government", "law", "community"],
    "400": ["language", "grammar", "vocabulary", "communication", "linguistics", "words", "speech"],
    "500": ["science", "mathematics", "physics", "chemistry", "biology", "research", "experiment", "theory"],
    "600": ["medicine", "health", "engineering", "technology", "applied", "practical", "medical"],
    "700": ["art", "music", "painting", "creative", "design", "aesthetic", "beauty", "recreation"],
    "800": ["literature", "poetry", "novel", "writing", "author", "story", "book", "narrative"],
    "900": ["history", "geography", "historical", "past", "location", "place", "biographical"]
  };

  let bestMatch = "000";
  let maxScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.reduce((sum, keyword) => {
      const count = (text.match(new RegExp(keyword, 'g')) || []).length;
      return sum + count;
    }, 0);

    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}

export function generateZettelNumber(category: string, existingNumbers: string[]): string {
  const categoryNumbers = existingNumbers
    .filter(num => num.startsWith(category))
    .map(num => {
      const parts = num.split('.');
      return parts.length > 1 ? parseInt(parts[1]) : 0;
    })
    .filter(n => !isNaN(n));

  const nextSubNumber = categoryNumbers.length > 0 ? Math.max(...categoryNumbers) + 1 : 1;
  return `${category}.${nextSubNumber}`;
}

export function getCategoryInfo(categoryCode: string) {
  return DEWEY_CATEGORIES.find(cat => 
    categoryCode >= cat.range.split('-')[0] && 
    categoryCode <= cat.range.split('-')[1]
  ) || DEWEY_CATEGORIES[0];
}

export function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'other', 'after', 'well', 'many', 'some', 'would', 'make', 'like', 'him', 'her', 'see', 'him', 'two', 'way', 'who', 'may', 'say', 'she', 'use', 'work', 'how', 'get', 'come', 'made', 'year', 'take', 'find', 'part', 'give', 'hand', 'back', 'most', 'look', 'good', 'new', 'write', 'man', 'any', 'could', 'show', 'try', 'ask', 'turn', 'move', 'live', 'seem', 'feel', 'might', 'old', 'great', 'another', 'such', 'should', 'call', 'want', 'still', 'different', 'own'].includes(word));

  // Get unique words and their frequency
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Return top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}