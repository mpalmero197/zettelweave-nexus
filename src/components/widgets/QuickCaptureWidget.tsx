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
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-accent rounded-xl">
            <Edit3 className="h-5 w-5 text-accent-foreground" />
          </div>
          Quick Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Jot down quick thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-32 resize-y"
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!content.trim()} size={isMobile ? "icon" : "default"}>
            <Save className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Save Note</span>}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCreateCard} 
            disabled={!content.trim()}
            size={isMobile ? "icon" : "default"}
          >
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Create Card</span>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}