import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, X, Info } from 'lucide-react';

interface SecurityNoticeProps {
  onDismiss?: () => void;
}

export function SecurityNotice({ onDismiss }: SecurityNoticeProps) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('security-notice-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('security-notice-dismissed', 'true');
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="flex items-start justify-between">
        <div className="space-y-2">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200">
            Security & Privacy Notice
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• Your data is encrypted and stored securely</p>
            <p>• AI processing is rate-limited for security</p>
            <p>• Content is automatically sanitized to prevent XSS attacks</p>
            <p>• Authentication sessions are securely managed</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="ml-4 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}