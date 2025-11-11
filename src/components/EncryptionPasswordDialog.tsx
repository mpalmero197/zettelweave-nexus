import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface EncryptionPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordSubmit: (password: string) => void | Promise<void>;
  mode: 'encrypt' | 'decrypt' | 'setup';
  title?: string;
  description?: string;
}

export function EncryptionPasswordDialog({
  open,
  onOpenChange,
  onPasswordSubmit,
  mode,
  title,
  description
}: EncryptionPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!password) {
      setError('Password is required');
      return;
    }

    if (mode === 'setup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (mode === 'setup' && password.length < 12) {
      setError('Password must be at least 12 characters for security');
      return;
    }

    setLoading(true);
    try {
      await onPasswordSubmit(password);
      setPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const getDialogContent = () => {
    switch (mode) {
      case 'setup':
        return {
          title: title || 'Setup Encryption',
          description: description || 'Create a strong password to encrypt your sensitive data. This password cannot be recovered if forgotten!',
          buttonText: 'Enable Encryption'
        };
      case 'encrypt':
        return {
          title: title || 'Encrypt Item',
          description: description || 'Enter your encryption password to encrypt this item',
          buttonText: 'Encrypt'
        };
      case 'decrypt':
        return {
          title: title || 'Decrypt Item',
          description: description || 'Enter your encryption password to view this encrypted content',
          buttonText: 'Decrypt'
        };
    }
  };

  const content = getDialogContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {content.title}
          </DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        {mode === 'setup' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical:</strong> If you forget this password, your encrypted data will be
              permanently lost. There is no password recovery!
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              {mode === 'setup' ? 'Encryption Password' : 'Password'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={mode === 'setup' ? 'Min. 12 characters' : 'Enter password'}
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {mode === 'setup' && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Re-enter password"
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'setup' && password && (
            <div className="text-sm space-y-1">
              <p className="font-medium">Password Strength:</p>
              <div className="space-y-1 text-muted-foreground">
                <div className={password.length >= 12 ? 'text-green-600' : ''}>
                  ✓ At least 12 characters {password.length >= 12 && '✓'}
                </div>
                <div className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  ✓ Contains uppercase letter {/[A-Z]/.test(password) && '✓'}
                </div>
                <div className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                  ✓ Contains lowercase letter {/[a-z]/.test(password) && '✓'}
                </div>
                <div className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                  ✓ Contains number {/[0-9]/.test(password) && '✓'}
                </div>
                <div className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>
                  ✓ Contains special character {/[^A-Za-z0-9]/.test(password) && '✓'}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : content.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
