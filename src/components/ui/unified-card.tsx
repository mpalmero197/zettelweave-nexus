import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Unified card design system with consistent styling and mobile optimization

interface UnifiedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  interactive?: boolean;
  draggable?: boolean;
}

const UnifiedCard = React.forwardRef<HTMLDivElement, UnifiedCardProps>(
  ({ className, variant = 'default', interactive = false, draggable = false, ...props }, ref) => {
    const isMobile = useIsMobile();
    
    const variantStyles = {
      default: "bg-card border border-border/50",
      elevated: "bg-card shadow-lg hover:shadow-xl border-0",
      outlined: "bg-transparent border-2 border-border",
      glass: "bg-card/70 backdrop-blur-xl border border-border/30",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl transition-all duration-200 gpu-accelerate",
          variantStyles[variant],
          interactive && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
          draggable && (isMobile ? "touch-manipulation" : "cursor-move"),
          isMobile && "shadow-md",
          !isMobile && "shadow-card hover:shadow-hover",
          className
        )}
        {...props}
      />
    );
  }
);
UnifiedCard.displayName = "UnifiedCard";

const UnifiedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 md:p-6", className)}
    {...props}
  />
));
UnifiedCardHeader.displayName = "UnifiedCardHeader";

const UnifiedCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg md:text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
UnifiedCardTitle.displayName = "UnifiedCardTitle";

const UnifiedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
UnifiedCardDescription.displayName = "UnifiedCardDescription";

const UnifiedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-4 md:p-6 pt-0", className)} 
    {...props} 
  />
));
UnifiedCardContent.displayName = "UnifiedCardContent";

const UnifiedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 md:p-6 pt-0 gap-2", className)}
    {...props}
  />
));
UnifiedCardFooter.displayName = "UnifiedCardFooter";

export { 
  UnifiedCard, 
  UnifiedCardHeader, 
  UnifiedCardFooter, 
  UnifiedCardTitle, 
  UnifiedCardDescription, 
  UnifiedCardContent 
};
