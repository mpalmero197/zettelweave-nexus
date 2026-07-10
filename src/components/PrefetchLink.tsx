import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";

/**
 * Drop-in replacement for react-router's <Link> that also warms the route's
 * code-split chunk on hover/focus. Use anywhere a link points at one of our
 * lazy() routes; the prefetch registry silently no-ops for unknown paths.
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function PrefetchLink({ to, onMouseEnter, onFocus, onMouseLeave, onBlur, onTouchStart, ...rest }, ref) {
    const path = typeof to === "string" ? to : (to as any)?.pathname ?? "";
    const prefetch = usePrefetchOnHover(path);
    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={(e) => { prefetch.onMouseEnter(); onMouseEnter?.(e); }}
        onFocus={(e) => { prefetch.onFocus(); onFocus?.(e); }}
        onMouseLeave={(e) => { prefetch.onMouseLeave(); onMouseLeave?.(e); }}
        onBlur={(e) => { prefetch.onBlur(); onBlur?.(e); }}
        onTouchStart={(e) => { prefetch.onTouchStart(); onTouchStart?.(e); }}
        {...rest}
      />
    );
  }
);
