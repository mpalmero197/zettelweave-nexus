import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { ShareDialog } from "./ShareDialog";
import type { ShareableItemType } from "@/hooks/useItemSharing";

interface ShareButtonProps extends Omit<ButtonProps, "onClick"> {
  itemType: ShareableItemType;
  itemId: string;
  itemTitle?: string;
  iconOnly?: boolean;
  label?: string;
}

export function ShareButton({ itemType, itemId, itemTitle, iconOnly, label = "Share", ...btn }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={btn.variant ?? "ghost"}
        size={btn.size ?? "sm"}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        {...btn}
      >
        <Share2 className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-2"} />
        {!iconOnly && label}
      </Button>
      {open && (
        <ShareDialog
          open={open}
          onOpenChange={setOpen}
          itemType={itemType}
          itemId={itemId}
          itemTitle={itemTitle}
        />
      )}
    </>
  );
}
