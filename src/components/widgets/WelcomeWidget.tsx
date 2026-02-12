import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ZettelCard as ZettelCardType } from "@/types/zettel";

interface WelcomeWidgetProps {
  onCreateCard?: (card: any) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function WelcomeWidget({ onCreateCard }: WelcomeWidgetProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  const handleCapture = () => {
    if (!content.trim()) return;
    
    const lines = content.split('\n');
    const title = lines[0]?.trim() || "Quick Note";
    
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      content,
      description: "Created from quick capture",
      category: "000",
      number: "",
      tags: ["quick-capture"],
      linkedCards: []
    };
    
    if (onCreateCard) {
      onCreateCard(newCard);
      setContent("");
      setIsExpanded(false);
      toast.success("Card created");
    } else {
      localStorage.setItem('quickCapture', content);
      setContent("");
      setIsExpanded(false);
      toast.success("Note saved");
    }
  };

  return (
    <div className="hero-banner p-5 md:p-6">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              {getGreeting()}{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Capture a thought, build your second brain.
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary/40 shrink-0 mt-1" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            className={`resize-none border-border/50 bg-background/60 text-sm transition-all ${
              isExpanded ? 'min-h-24' : 'min-h-10 h-10'
            }`}
            aria-label="Quick capture — jot down a thought"
          />
          {isExpanded && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                First line becomes the title
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setIsExpanded(false); setContent(""); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleCapture}
                  disabled={!content.trim()}
                >
                  <Send className="h-3 w-3" />
                  Capture
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
