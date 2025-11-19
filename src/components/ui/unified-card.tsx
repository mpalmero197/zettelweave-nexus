import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Unified card design system with beautiful styling inspired by WelcomeWidget

interface UnifiedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'premium';
  interactive?: boolean;
  draggable?: boolean;
  withGlow?: boolean;
}

const UnifiedCard = React.forwardRef<HTMLDivElement, UnifiedCardProps>(
  ({ className, variant = 'default', interactive = false, draggable = false, withGlow = false, children, ...props }, ref) => {
    const isMobile = useIsMobile();
    
    const variantStyles = {
      default: "bg-card border border-border/50 shadow-card hover:shadow-hover",
      elevated: "bg-card shadow-material-2 hover:shadow-material-3 border-0",
      outlined: "bg-transparent border-2 border-border",
      glass: "glass-card shadow-material-2 hover:shadow-material-3",
      premium: "glass-card shadow-material-2 hover:shadow-material-3 relative overflow-hidden",
    };

    const cardContent = (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl transition-all duration-300 gpu-accelerate",
          variantStyles[variant],
          interactive && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
          draggable && (isMobile ? "touch-manipulation" : "cursor-move"),
          className
        )}
        {...props}
      >
        {variant === 'premium' && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        )}
        {children}
      </div>
    );

    if (withGlow) {
      return (
        <div className="relative h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-3xl blur-3xl opacity-30" />
          {cardContent}
        </div>
      );
    }

    return cardContent;
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
      "text-lg md:text-2xl font-semibold leading-none tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent",
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
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
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
    className={cn("p-4 md:p-6 pt-0 relative", className)} 
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
