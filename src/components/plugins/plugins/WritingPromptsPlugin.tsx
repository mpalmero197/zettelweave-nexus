import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Copy, Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

const PROMPTS = [
  { category: 'Fiction', text: 'A stranger hands you a note that reads: "They know. Run." You have no idea what it means.' },
  { category: 'Fiction', text: 'You wake up and discover that you can hear everyone\'s thoughts — except one person\'s.' },
  { category: 'Fiction', text: 'Write about a city that exists only between midnight and dawn.' },
  { category: 'Fiction', text: 'The last library on Earth is about to close. A librarian discovers a book that was never supposed to exist.' },
  { category: 'Fiction', text: 'Two rival time travelers keep meeting at the same historical event, each trying to change it differently.' },
  { category: 'Poetry', text: 'Write a poem about the sound that silence makes when you listen closely enough.' },
  { category: 'Poetry', text: 'Describe the color blue to someone who has never seen it.' },
  { category: 'Poetry', text: 'Write a haiku about a forgotten memory.' },
  { category: 'Poetry', text: 'Compose a poem from the perspective of an old photograph.' },
  { category: 'Essay', text: 'Argue for or against: "The most important inventions were accidental."' },
  { category: 'Essay', text: 'What would you tell your past self if you could send one paragraph back in time?' },
  { category: 'Essay', text: 'How does the concept of "home" change throughout a lifetime?' },
  { category: 'Worldbuilding', text: 'Design a society where memories can be traded as currency.' },
  { category: 'Worldbuilding', text: 'Create a planet where gravity works differently depending on emotions.' },
  { category: 'Worldbuilding', text: 'Describe the rules and customs of a civilization that lives entirely underground.' },
  { category: 'Journal', text: 'What is a belief you held five years ago that you no longer hold? What changed?' },
  { category: 'Journal', text: 'Describe a small moment today that you would normally forget.' },
  { category: 'Journal', text: 'Write a letter to someone you\'ve lost touch with. You don\'t have to send it.' },
  { category: 'Flash Fiction', text: 'Write a complete story in exactly 50 words.' },
  { category: 'Flash Fiction', text: 'A door that was never there before appears in your hallway. It\'s slightly ajar.' },
  { category: 'Dialogue', text: 'Write a conversation between two people who are lying to each other — but only the reader knows it.' },
  { category: 'Dialogue', text: 'Two old friends meet after 20 years. Write only their dialogue.' },
];

const CATEGORIES = ['All', ...Array.from(new Set(PROMPTS.map(p => p.category)))];

export function WritingPromptsPlugin({}: PluginProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const filtered = activeCategory === 'All' ? PROMPTS : PROMPTS.filter(p => p.category === activeCategory);
  const current = filtered[currentIndex % filtered.length];

  const next = () => setCurrentIndex(prev => (prev + 1) % filtered.length);
  const copy = () => { navigator.clipboard.writeText(current.text); toast.success('Prompt copied!'); };
  const toggleSave = () => {
    const idx = PROMPTS.indexOf(current);
    setSaved(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(cat => (
          <Button
            key={cat}
            size="sm"
            variant={activeCategory === cat ? 'default' : 'outline'}
            onClick={() => { setActiveCategory(cat); setCurrentIndex(0); }}
            className="text-xs h-7"
          >
            {cat}
          </Button>
        ))}
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-5">
          <Badge variant="secondary" className="mb-3 text-[10px]">{current.category}</Badge>
          <p className="text-base leading-relaxed">{current.text}</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={next} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" /> Next Prompt
        </Button>
        <Button size="icon" variant="outline" onClick={copy}><Copy className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" onClick={toggleSave}>
          {saved.has(PROMPTS.indexOf(current))
            ? <BookmarkCheck className="h-4 w-4 text-primary" />
            : <Bookmark className="h-4 w-4" />
          }
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {currentIndex % filtered.length + 1} / {filtered.length} prompts • {saved.size} saved
      </p>
    </div>
  );
}
