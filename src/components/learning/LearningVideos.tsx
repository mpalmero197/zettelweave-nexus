import { Video } from "lucide-react";

export function LearningVideos() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Video className="h-3 w-3" />
        Use the main Search tab to discover educational videos
      </p>
      <div className="text-center py-12 text-muted-foreground">
        <Video className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Search for educational videos from the unified Search page.</p>
        <p className="text-xs mt-1">Searches YouTube, Odysee, Khan Academy, TED & more</p>
      </div>
    </div>
  );
}
