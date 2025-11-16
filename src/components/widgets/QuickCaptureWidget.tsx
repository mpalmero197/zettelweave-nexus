import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3 } from "lucide-react";
import { ScratchPad } from "@/components/ScratchPad";

interface QuickCaptureWidgetProps {
  onCreateCard?: (card: any) => void;
}

export function QuickCaptureWidget({ onCreateCard }: QuickCaptureWidgetProps) {
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
      <CardContent>
        <ScratchPad onCreateCard={onCreateCard || (() => {})} />
      </CardContent>
    </Card>
  );
}