import { Loader2 } from "lucide-react";

interface FastLoadingFallbackProps {
  message?: string;
  icon?: React.ReactNode;
}

export function FastLoadingFallback({ 
  message = "Loading...", 
  icon = <Loader2 className="h-6 w-6 animate-spin" />
}: FastLoadingFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-3 p-4">
      <div className="flex items-center space-x-2 text-primary">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
      </div>
    </div>
  );
}