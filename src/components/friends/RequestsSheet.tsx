import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Clock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FriendRequest } from './CollabStudio';

interface RequestsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingRequests: FriendRequest[];
  messageRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  onRespond: (requestId: string, accept: boolean) => void;
  onCancel: (requestId: string) => void;
}

export function RequestsSheet({
  open,
  onOpenChange,
  pendingRequests,
  messageRequests,
  sentRequests,
  onRespond,
  onCancel,
}: RequestsSheetProps) {
  const total = pendingRequests.length + messageRequests.length + sentRequests.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-base">Requests</SheetTitle>
          <SheetDescription className="text-xs">Manage friend and message requests</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-2">
          {total === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Friend requests */}
              {pendingRequests.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">
                    Friend Requests — {pendingRequests.length}
                  </p>
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-[10px] font-medium bg-muted">
                          {req.sender_id.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Friend Request</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => onRespond(req.id, true)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onRespond(req.id, false)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Message requests */}
              {messageRequests.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">
                    Message Requests — {messageRequests.length}
                  </p>
                  {messageRequests.map(req => (
                    <div key={req.id} className="px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-[10px] font-medium bg-muted">
                            <Mail className="h-3.5 w-3.5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Message Request</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => onRespond(req.id, true)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onRespond(req.id, false)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {req.message && (
                        <p className="text-xs text-muted-foreground mt-1.5 ml-11 bg-muted/50 rounded-md px-2.5 py-1.5 leading-relaxed">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Sent requests */}
              {sentRequests.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1.5">
                    Sent — {sentRequests.length}
                  </p>
                  {sentRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Pending</p>
                        <p className="text-[11px] text-muted-foreground">
                          Sent {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onCancel(req.id)}>
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
