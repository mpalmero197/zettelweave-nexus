import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeLivePreviewProps {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  className?: string;
}

export function ThemeLivePreview({
  primary,
  secondary,
  background,
  foreground,
  className
}: ThemeLivePreviewProps) {
  return (
    <div 
      className={cn("rounded-xl border-2 overflow-hidden shadow-lg", className)}
      style={{ backgroundColor: `hsl(${background})` }}
    >
      {/* Header */}
      <div 
        className="p-3 flex items-center justify-between"
        style={{ 
          background: `linear-gradient(135deg, hsl(${primary}), hsl(${secondary}))`,
          color: '#fff'
        }}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="text-sm font-semibold">Preview</span>
        </div>
        <Star className="h-4 w-4" />
      </div>

      {/* Content Area */}
      <div className="p-3 space-y-2">
        {/* Sample Card */}
        <div 
          className="p-2 rounded-lg border"
          style={{ 
            backgroundColor: `hsl(${background})`,
            borderColor: `hsl(${primary} / 0.2)`,
            color: `hsl(${foreground})`
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `hsl(${primary})` }}
            />
            <span className="text-xs font-medium">Sample Card</span>
          </div>
          <p className="text-[10px] opacity-80">
            This is how your content will look
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-1.5">
          <button
            className="flex-1 px-2 py-1 rounded text-xs font-medium transition-transform hover:scale-105"
            style={{ 
              background: `linear-gradient(135deg, hsl(${primary}), hsl(${secondary}))`,
              color: '#fff'
            }}
          >
            Primary
          </button>
          <button
            className="flex-1 px-2 py-1 rounded text-xs font-medium transition-transform hover:scale-105"
            style={{ 
              backgroundColor: `hsl(${primary} / 0.1)`,
              color: `hsl(${primary})`,
              border: `1px solid hsl(${primary} / 0.3)`
            }}
          >
            Outline
          </button>
        </div>

        {/* Badge */}
        <div className="flex gap-1">
          <span 
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ 
              backgroundColor: `hsl(${primary} / 0.15)`,
              color: `hsl(${primary})`
            }}
          >
            Tag
          </span>
          <span 
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ 
              backgroundColor: `hsl(${secondary} / 0.15)`,
              color: `hsl(${secondary})`
            }}
          >
            Label
          </span>
        </div>
      </div>
    </div>
  );
}