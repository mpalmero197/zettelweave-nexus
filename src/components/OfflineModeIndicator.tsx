import { Cloud, CloudOff, RefreshCw, Clock } from 'lucide-react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

export const OfflineModeIndicator = () => {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    lastSyncTime,
    syncPendingOperations 
  } = useOfflineMode();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isOnline ? "default" : "destructive"}
              className="gap-2 cursor-help"
            >
              {isOnline ? (
                <>
                  <Cloud className="h-3 w-3" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3" />
                  <span>Offline</span>
                </>
              )}
            </Badge>

            {pendingCount > 0 && (
              <Badge variant="secondary" className="gap-2">
                <Clock className="h-3 w-3" />
                <span>{pendingCount} pending</span>
              </Badge>
            )}

            {(isSyncing || (isOnline && pendingCount > 0)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => syncPendingOperations()}
                disabled={isSyncing || !isOnline}
                className="h-7 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">
              {isOnline ? 'Connected' : 'Offline Mode'}
            </p>
            {!isOnline && (
              <p className="text-sm">
                Changes are saved locally and will sync when you're back online
              </p>
            )}
            {pendingCount > 0 && (
              <p className="text-sm">
                {pendingCount} change{pendingCount !== 1 ? 's' : ''} waiting to sync
              </p>
            )}
            {lastSyncTime && (
              <p className="text-xs text-muted-foreground">
                Last synced {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
              </p>
            )}
            {isSyncing && (
              <p className="text-xs text-muted-foreground">
                Syncing changes...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
