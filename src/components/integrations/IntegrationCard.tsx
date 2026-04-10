import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink } from "lucide-react";
import type { Integration } from "./types";

interface IntegrationCardProps {
  integration: Integration;
  isConnected: boolean;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export function IntegrationCard({ integration, isConnected, onConnect, onDisconnect }: IntegrationCardProps) {
  const isComingSoon = integration.status === 'coming-soon';

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-border/60">
      {/* Accent top bar */}
      <div className="h-1 w-full" style={{ backgroundColor: integration.color }} />

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{integration.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate">{integration.name}</h3>
              {isConnected && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">
                  <Check className="h-3 w-3 mr-0.5" /> Connected
                </Badge>
              )}
              {isComingSoon && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  Coming Soon
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{integration.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            {integration.category.replace('-', ' / ')}
          </span>
          {isComingSoon ? (
            <Button variant="outline" size="sm" disabled className="h-7 text-xs">
              Coming Soon
            </Button>
          ) : isConnected ? (
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onDisconnect(integration.id)}>
              Disconnect
            </Button>
          ) : (
            <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => onConnect(integration.id)}>
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
