import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Quote, RefreshCw } from 'lucide-react';

const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "What we know is a drop, what we don't know is an ocean.", author: "Isaac Newton" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
];

export function QuotesWidget() {
  const [current, setCurrent] = useState<typeof quotes[0] | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('dailyQuote');
    if (saved) {
      try {
        const { quote, date } = JSON.parse(saved);
        if (date === today) { setCurrent(quote); return; }
      } catch {}
    }
    pick();
  }, []);

  const pick = () => {
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    setCurrent(q);
    localStorage.setItem('dailyQuote', JSON.stringify({ quote: q, date: new Date().toDateString() }));
  };

  const refresh = async () => {
    setSpinning(true);
    await new Promise(r => setTimeout(r, 400));
    pick();
    setSpinning(false);
  };

  if (!current) return null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <Quote className="h-3.5 w-3.5" aria-hidden="true" />
            Quote
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={spinning} className="h-6 w-6 p-0" aria-label="New quote">
            <RefreshCw className={`h-3 w-3 ${spinning ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <blockquote className="text-sm italic leading-relaxed text-foreground">
          "{current.text}"
        </blockquote>
        <p className="text-xs text-muted-foreground mt-2 text-right">— {current.author}</p>
      </CardContent>
    </Card>
  );
}
