import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus } from "lucide-react";

interface WelcomeWidgetProps {
  onCreateCard?: () => void;
}

export function WelcomeWidget({ onCreateCard }: WelcomeWidgetProps) {
  return (
    <div className="relative h-full">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-3xl blur-3xl opacity-30" />
      <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardContent className="relative p-8 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-primary rounded-2xl shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Welcome back!
                </h1>
                <p className="text-muted-foreground text-base lg:text-lg">Your knowledge universe awaits</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Build your second brain with zettel cards, organize notes, and create connections between ideas.
            </p>
            <Button 
              size="lg" 
              className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 h-12 text-base"
              onClick={onCreateCard}
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Card
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}