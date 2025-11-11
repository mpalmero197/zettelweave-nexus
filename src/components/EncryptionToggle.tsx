import { Lock, LockOpen, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EncryptionToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function EncryptionToggle({ 
  enabled, 
  onChange, 
  disabled = false,
  label = "High Security Mode"
}: EncryptionToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${enabled ? 'bg-green-500/20' : 'bg-muted'}`}>
          {enabled ? (
            <Lock className="h-4 w-4 text-green-600" />
          ) : (
            <LockOpen className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div>
          <Label htmlFor="encryption-toggle" className="cursor-pointer font-medium">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">
            {enabled ? 'Content will be encrypted' : 'Standard security (searchable)'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                {enabled ? (
                  <>
                    <strong>🔒 Encrypted:</strong> Content is encrypted end-to-end. Only you can
                    decrypt it. AI features and search won't work on encrypted content.
                  </>
                ) : (
                  <>
                    <strong>📂 Standard:</strong> Content is protected by database security but
                    remains searchable. AI features fully available.
                  </>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Switch
          id="encryption-toggle"
          checked={enabled}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
