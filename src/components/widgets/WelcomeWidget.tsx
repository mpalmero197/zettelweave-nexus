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
      <Card className="relative h-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-card hover:shadow-hover transition-all duration-500 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <CardContent className="relative p-8 h-full flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-2xl shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Welcome back!
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">Your knowledge universe awaits</p>
          </div>
          <div className="flex gap-3">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              onClick={onCreateCard}
            >
              <Plus className="h-5 w-5 mr-2" />
              Quick Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}