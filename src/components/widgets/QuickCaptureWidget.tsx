import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3 } from "lucide-react";
import { ScratchPad } from "@/components/ScratchPad";

interface QuickCaptureWidgetProps {
  onCreateCard?: (card: any) => void;
}

export function QuickCaptureWidget({ onCreateCard }: QuickCaptureWidgetProps) {
  return (
    <div className="relative h-full">
      <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 rounded-3xl blur-2xl opacity-40" />
      <Card className="relative h-full bg-card/70 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-accent rounded-xl">
              <Edit3 className="h-5 w-5 text-white" />
            </div>
            Quick Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <ScratchPad onCreateCard={onCreateCard || (() => {})} />
        </CardContent>
      </Card>
    </div>
  );
}