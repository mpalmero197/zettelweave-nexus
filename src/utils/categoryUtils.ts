// Category keywords for smart categorization
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Technology': [
    'software', 'programming', 'code', 'api', 'database', 'algorithm', 'computer',
    'web', 'app', 'development', 'javascript', 'python', 'react', 'node', 'cloud',
    'server', 'frontend', 'backend', 'devops', 'machine learning', 'ai', 'data',
    'security', 'network', 'linux', 'git', 'docker', 'kubernetes', 'typescript',
    'html', 'css', 'mobile', 'ios', 'android', 'framework', 'library', 'tech'
  ],
  'Science': [
    'research', 'experiment', 'hypothesis', 'theory', 'biology', 'chemistry',
    'physics', 'mathematics', 'scientific', 'study', 'discovery', 'lab',
    'molecule', 'atom', 'cell', 'genome', 'evolution', 'quantum', 'particle',
    'astronomy', 'space', 'planet', 'universe', 'ecology', 'climate', 'nature'
  ],
  'Business': [
    'market', 'finance', 'investment', 'startup', 'entrepreneur', 'revenue',
    'profit', 'strategy', 'management', 'leadership', 'marketing', 'sales',
    'customer', 'product', 'company', 'corporate', 'budget', 'growth', 'roi',
    'stakeholder', 'kpi', 'metrics', 'analytics', 'business model', 'venture'
  ],
  'Health': [
    'medical', 'health', 'fitness', 'nutrition', 'diet', 'exercise', 'wellness',
    'mental health', 'therapy', 'medicine', 'doctor', 'hospital', 'treatment',
    'disease', 'symptom', 'diagnosis', 'prevention', 'vitamin', 'sleep', 'stress',
    'mindfulness', 'yoga', 'meditation', 'workout', 'body', 'brain'
  ],
  'Education': [
    'learning', 'teaching', 'student', 'school', 'university', 'course', 'class',
    'curriculum', 'education', 'knowledge', 'study', 'tutorial', 'lesson',
    'training', 'skill', 'certification', 'degree', 'academic', 'professor',
    'lecture', 'exam', 'homework', 'assignment', 'grade', 'scholarship'
  ],
  'Creative': [
    'art', 'design', 'music', 'writing', 'creative', 'photography', 'film',
    'video', 'animation', 'illustration', 'painting', 'drawing', 'sketch',
    'composition', 'color', 'aesthetic', 'style', 'visual', 'audio', 'story',
    'narrative', 'poetry', 'fiction', 'novel', 'screenplay', 'artist'
  ],
  'Personal': [
    'journal', 'diary', 'reflection', 'goal', 'habit', 'routine', 'personal',
    'life', 'memory', 'experience', 'thought', 'feeling', 'emotion', 'dream',
    'aspiration', 'milestone', 'achievement', 'challenge', 'growth', 'self',
    'improvement', 'motivation', 'inspiration', 'gratitude', 'mindset'
  ],
  'Reference': [
    'definition', 'glossary', 'term', 'concept', 'reference', 'documentation',
    'guide', 'manual', 'handbook', 'wiki', 'encyclopedia', 'dictionary',
    'index', 'catalog', 'list', 'collection', 'resource', 'link', 'source',
    'citation', 'bibliography', 'archive', 'record', 'note', 'summary'
  ],
  'Projects': [
    'project', 'task', 'todo', 'milestone', 'deadline', 'timeline', 'planning',
    'roadmap', 'sprint', 'agile', 'kanban', 'scrum', 'backlog', 'deliverable',
    'requirement', 'specification', 'scope', 'phase', 'status', 'progress',
    'team', 'collaboration', 'meeting', 'review', 'feedback'
  ],
  'Philosophy': [
    'philosophy', 'ethics', 'moral', 'existential', 'metaphysics', 'logic',
    'reason', 'argument', 'belief', 'truth', 'knowledge', 'wisdom', 'virtue',
    'consciousness', 'meaning', 'purpose', 'existence', 'reality', 'mind',
    'thought', 'idea', 'concept', 'principle', 'value', 'perspective'
  ],
};

export const CATEGORIES = Object.keys(CATEGORY_KEYWORDS);

/**
 * Smart categorization based on content analysis
 * Focuses on the first paragraph for efficiency with large imports
 */
export function smartCategorize(content: string, filename: string): string {
  // Normalize content - focus on first 500 characters for efficiency
  const normalizedContent = content.slice(0, 500).toLowerCase();
  const normalizedFilename = filename.toLowerCase();
  
  // Extract first paragraph (more relevant for categorization)
  const firstParagraph = normalizedContent.split(/\n\n|\r\n\r\n/)[0] || normalizedContent;
  
  // Remove markdown syntax
  const cleanContent = firstParagraph
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '');
  
  // Score each category
  const scores: Record<string, number> = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    
    for (const keyword of keywords) {
      // Check filename (higher weight)
      if (normalizedFilename.includes(keyword)) {
        score += 3;
      }
      
      // Check first paragraph (medium weight)
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = cleanContent.match(regex);
      if (matches) {
        score += matches.length * 2;
      }
      
      // Check rest of content sample (lower weight)
      const restMatches = normalizedContent.match(regex);
      if (restMatches) {
        score += restMatches.length;
      }
    }
    
    scores[category] = score;
  }
  
  // Find the highest scoring category
  let bestCategory = 'Reference'; // Default fallback
  let highestScore = 0;
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category;
    }
  }
  
  // Return default if no significant matches
  return highestScore > 2 ? bestCategory : 'Reference';
}

/**
 * Extract keywords from content for additional metadata
 */
export function extractKeywords(content: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  ]);
  
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
  
  // Count word frequency
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}
