import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, AlertTriangle, RefreshCw, Unplug, Plug2, Clock, Database } from "lucide-react";
import type { Integration, ConnectionMeta } from "./types";
import { formatDistanceToNow } from "date-fns";

interface IntegrationCardProps {
  integration: Integration;
  isConnected: boolean;
  connectionMeta?: ConnectionMeta;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

const SETUP_LABELS: Record<string, string> = {
  "file-import": "File Import",
  oauth: "OAuth",
  webhook: "Webhook",
  "api-key": "API Key",
};

function HealthDot({ health }: { health?: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-emerald-500 shadow-emerald-500/40",
    degraded: "bg-amber-500 shadow-amber-500/40",
    error: "bg-red-500 shadow-red-500/40",
    unknown: "bg-muted-foreground/40",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full shadow-[0_0_6px] ${colors[health || "unknown"]}`}
    />
  );
}

export function IntegrationCard({
  integration,
  isConnected,
  connectionMeta,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const health = connectionMeta?.health;
  const hasError = health === "error";

  return (
    <Card
      className={`
        group relative overflow-hidden transition-all duration-300 
        hover:shadow-[var(--shadow-hover)] hover:-translate-y-1
        border-border/50
        ${isConnected 
          ? "ring-1 ring-primary/20 bg-gradient-to-br from-card to-primary/[0.03]" 
          : "bg-card hover:bg-accent/30"
        }
        ${hasError ? "ring-1 ring-destructive/30" : ""}
      `}
    >
      {/* Accent gradient bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${integration.color}, ${integration.color}88)`,
        }}
      />

      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Icon with glow on connected */}
          <div
            className={`
              text-2xl flex-shrink-0 mt-0.5 h-10 w-10 flex items-center justify-center rounded-lg
              transition-all duration-300
              ${isConnected
                ? "bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                : "bg-muted/60 group-hover:bg-muted"
              }
            `}
          >
            {integration.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {integration.name}
              </h3>
              {isConnected && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 gap-1 border-primary/25 bg-primary/10 text-primary"
                >
                  <HealthDot health={health} />
                  {hasError ? "Error" : "Connected"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {integration.description}
            </p>
          </div>
        </div>

        {/* Connection metadata (when connected) */}
        {isConnected && connectionMeta && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5">
            {connectionMeta.lastSyncAt && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(connectionMeta.lastSyncAt, { addSuffix: true })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Last synced</TooltipContent>
              </Tooltip>
            )}
            {(connectionMeta.itemsSynced ?? 0) > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {connectionMeta.itemsSynced} items
                  </span>
                </TooltipTrigger>
                <TooltipContent>Total items synced</TooltipContent>
              </Tooltip>
            )}
            {hasError && connectionMeta.error && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {connectionMeta.error}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Connection error — try reconnecting</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
              {integration.category.replace("-", " / ")}
            </span>
            {integration.setupType && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground/60 border-border/40">
                {SETUP_LABELS[integration.setupType] || integration.setupType}
              </Badge>
            )}
          </div>

          {isConnected ? (
            <div className="flex items-center gap-1">
              {hasError && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-primary hover:text-primary"
                  onClick={() => onConnect(integration.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => onDisconnect(integration.id)}
              >
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1 shadow-sm"
              onClick={() => onConnect(integration.id)}
            >
              <Plug2 className="h-3.5 w-3.5" />
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
