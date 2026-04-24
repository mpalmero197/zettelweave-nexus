import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * A window is in "popout mode" when it was opened via the pop-out button
 * (URL has ?popout=1). We hide the global header/nav so the window is a
 * focused, single-feature surface.
 */
export function usePopoutMode() {
  const { search } = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("popout") === "1";
  }, [search]);
}
