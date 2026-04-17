import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search, Users, Eye, Pencil, Copy, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useItemSharing, type ShareableItemType, type SharePermission, type ShareMode, useSharesForItem } from "@/hooks/useItemSharing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Friend {
  friend_user_id: string;
  friend_display_name: string;
  friend_avatar_url: string;
  friend_email: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: ShareableItemType;
  itemId: string;
  itemTitle?: string;
}

export function ShareDialog({ open, onOpenChange, itemType, itemId, itemTitle }: ShareDialogProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [permission, setPermission] = useState<SharePermission>("view");
  const [shareMode, setShareMode] = useState<ShareMode>("collaborate");
  const [message, setMessage] = useState("");
  const { sharing, shareItem, unshareItem } = useItemSharing();
  const { shares, refresh } = useSharesForItem(itemType, open ? itemId : null);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setMessage("");
    (async () => {
      const { data, error } = await supabase.rpc("get_my_friends");
      if (error) { toast.error("Failed to load friends"); return; }
      setFriends((data || []) as Friend[]);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return friends;
    return friends.filter(f =>
      (f.friend_display_name || "").toLowerCase().includes(q) ||
      (f.friend_email || "").toLowerCase().includes(q)
    );
  }, [friends, search]);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast.error("Pick at least one friend");
      return;
    }
    try {
      await shareItem({
        recipient_ids: Array.from(selectedIds),
        item_type: itemType,
        item_id: itemId,
        permission,
        share_mode: shareMode,
        message: message.trim() || undefined,
      });
      refresh();
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share {itemTitle ? `"${itemTitle}"` : "item"}
          </DialogTitle>
          <DialogDescription>
            Share with friends. Choose to send a copy or collaborate live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Mode</Label>
            <RadioGroup value={shareMode} onValueChange={(v) => setShareMode(v as ShareMode)} className="grid grid-cols-2 gap-2">
              <label className={cn(
                "flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                shareMode === "collaborate" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}>
                <RadioGroupItem value="collaborate" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-1 font-medium text-sm"><Sparkles className="h-3.5 w-3.5" /> Collaborate</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Live shared item</p>
                </div>
              </label>
              <label className={cn(
                "flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                shareMode === "copy" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}>
                <RadioGroupItem value="copy" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-1 font-medium text-sm"><Copy className="h-3.5 w-3.5" /> Send a Copy</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Independent copy</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Permission (only for collaborate) */}
          {shareMode === "collaborate" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Permission</Label>
              <RadioGroup value={permission} onValueChange={(v) => setPermission(v as SharePermission)} className="grid grid-cols-2 gap-2">
                <label className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors",
                  permission === "view" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}>
                  <RadioGroupItem value="view" />
                  <Eye className="h-3.5 w-3.5" />
                  <span className="text-sm">Can view</span>
                </label>
                <label className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors",
                  permission === "edit" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}>
                  <RadioGroupItem value="edit" />
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="text-sm">Can edit</span>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Friend search */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Friends {selectedIds.size > 0 && <Badge variant="secondary" className="ml-1">{selectedIds.size}</Badge>}
            </Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends..."
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-44 rounded-md border">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {friends.length === 0 ? "No friends yet. Add friends in Collab Studio." : "No matches."}
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((f) => {
                    const selected = selectedIds.has(f.friend_user_id);
                    const initials = (f.friend_display_name || f.friend_email || "?").slice(0, 2).toUpperCase();
                    return (
                      <button
                        key={f.friend_user_id}
                        type="button"
                        onClick={() => toggle(f.friend_user_id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                          selected ? "bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={f.friend_avatar_url} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.friend_display_name || f.friend_email}</p>
                        </div>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Optional message */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Message (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a note..." rows={2} maxLength={500} />
          </div>

          {/* Existing shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Already shared with {shares.length}
              </Label>
              <div className="space-y-1">
                {shares.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs">
                    <span className="truncate">
                      {s.share_mode === "copy" ? "📨 Copy" : `🤝 ${s.permission === "edit" ? "Edit" : "View"}`}
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={async () => { await unshareItem(s.id); refresh(); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={sharing || selectedIds.size === 0}>
            {sharing ? "Sharing..." : `Share with ${selectedIds.size || 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
