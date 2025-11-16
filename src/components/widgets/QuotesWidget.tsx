import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Quote, RefreshCw } from 'lucide-react';

interface QuoteData {
  text: string;
  author: string;
  category: string;
}

const inspirationalQuotes: QuoteData[] = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "Motivation"
  },
  {
    text: "Knowledge is power. Information is liberating.",
    author: "Kofi Annan",
    category: "Knowledge"
  },
  {
    text: "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
    category: "Learning"
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "Innovation"
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
    category: "Action"
  },
  {
    text: "What we know is a drop, what we don't know is an ocean.",
    author: "Isaac Newton",
    category: "Wisdom"
  },
  {
    text: "The expert in anything was once a beginner.",
    author: "Helen Hayes",
    category: "Growth"
  },
  {
    text: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
    category: "Productivity"
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "Action"
  },
  {
    text: "Your limitation—it's only your imagination.",
    author: "Unknown",
    category: "Mindset"
  }
];

export function QuotesWidget() {
  const [currentQuote, setCurrentQuote] = useState<QuoteData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check if we have a quote for today
    const today = new Date().toDateString();
    const savedQuoteData = localStorage.getItem('dailyQuote');
    
    if (savedQuoteData) {
      try {
        const { quote, date } = JSON.parse(savedQuoteData);
        if (date === today) {
          setCurrentQuote(quote);
          return;
        }
      } catch (error) {
        console.error('Error parsing saved quote:', error);
      }
    }

    // Get new quote for today
    generateDailyQuote();
  }, []);

  const generateDailyQuote = () => {
    const today = new Date().toDateString();
    const randomIndex = Math.floor(Math.random() * inspirationalQuotes.length);
    const quote = inspirationalQuotes[randomIndex];
    
    setCurrentQuote(quote);
    
    // Save to localStorage with today's date
    localStorage.setItem('dailyQuote', JSON.stringify({
      quote,
      date: today
    }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate API delay for smooth animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const randomIndex = Math.floor(Math.random() * inspirationalQuotes.length);
    const newQuote = inspirationalQuotes[randomIndex];
    
    setCurrentQuote(newQuote);
    setIsRefreshing(false);
  };

  if (!currentQuote) {
    return (
      <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-center">
            <Quote className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-xs text-muted-foreground">Loading inspiration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Quote className="h-4 w-4" />
            Daily Quote
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          <div className="relative">
            <Quote className="h-4 w-4 text-primary/30 absolute -top-1 -left-1" />
            <blockquote className="text-sm italic leading-relaxed pl-4">
              "{currentQuote.text}"
            </blockquote>
          </div>
          
          <div className="text-right">
            <p className="text-xs font-medium">— {currentQuote.author}</p>
            <p className="text-xs text-muted-foreground">{currentQuote.category}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}