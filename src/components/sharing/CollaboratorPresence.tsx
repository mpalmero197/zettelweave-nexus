import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useItemPresence } from "@/hooks/useItemPresence";
import type { ShareableItemType } from "@/hooks/useItemSharing";
import { cn } from "@/lib/utils";

interface Props {
  itemType: ShareableItemType;
  itemId: string | null;
  isEditing?: boolean;
  max?: number;
  className?: string;
}

export function CollaboratorPresence({ itemType, itemId, isEditing, max = 4, className }: Props) {
  const { collaborators } = useItemPresence(itemType, itemId, isEditing);
  if (collaborators.length === 0) return null;
  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - visible.length;
  return (
    <TooltipProvider>
      <div className={cn("flex items-center -space-x-2", className)}>
        {visible.map(c => {
          const initials = (c.display_name || "?").slice(0, 2).toUpperCase();
          return (
            <Tooltip key={c.user_id}>
              <TooltipTrigger asChild>
                <Avatar className={cn("h-6 w-6 ring-2 ring-background", c.is_editing && "ring-primary")}>
                  <AvatarImage src={c.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                {c.display_name || "User"} {c.is_editing ? "(editing)" : "(viewing)"}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow > 0 && (
          <div className="h-6 w-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] font-medium">
            +{overflow}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
