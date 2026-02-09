import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Save, Plus } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuickCaptureWidgetProps {
  onCreateCard?: (card: any) => void;
}

export function QuickCaptureWidget({ onCreateCard }: QuickCaptureWidgetProps) {
  const isMobile = useIsMobile();
  const [content, setContent] = useState("");

  const handleSave = () => {
    if (!content.trim()) return;
    localStorage.setItem('quickCapture', content);
    toast("Note saved");
  };

  const handleCreateCard = () => {
    if (!content.trim()) {
      toast("Cannot create card from empty content");
      return;
    }
    
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
      toast("Created zettel card");
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
          Quick Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Jot down quick thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-28 resize-y text-sm"
          aria-label="Quick capture text"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!content.trim()}>
            <Save className="h-3.5 w-3.5" />
            {!isMobile && <span className="ml-1.5">Save</span>}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCreateCard} 
            disabled={!content.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            {!isMobile && <span className="ml-1.5">Card</span>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
