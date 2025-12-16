import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Cookie, ChevronDown, ChevronUp } from "lucide-react";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  timestamp: number;
}

const COOKIE_CONSENT_KEY = "pendragonx_cookie_consent";

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always required
  analytics: false,
  functional: false,
  marketing: false,
  timestamp: 0,
};

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CookiePreferences;
      // Show banner again if consent is older than 1 year
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > oneYear) {
        setIsVisible(true);
      }
      setPreferences(parsed);
    } else {
      setIsVisible(true);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const toSave = { ...prefs, timestamp: Date.now() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(toSave));
    setPreferences(toSave);
    setIsVisible(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true,
      timestamp: Date.now(),
    });
  };

  const rejectAll = () => {
    savePreferences({
      necessary: true, // Necessary cookies can't be rejected
      analytics: false,
      functional: false,
      marketing: false,
      timestamp: Date.now(),
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-lg shadow-lg">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Cookie Preferences</h3>
                <p className="text-sm text-muted-foreground">Manage your cookie settings</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={rejectAll}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">
            We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
            By clicking "Accept All", you consent to our use of cookies. You can customize your preferences 
            or reject non-essential cookies. For more information, please read our{" "}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
          </p>

          {/* Cookie Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 mb-4 transition-colors"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showDetails ? "Hide Details" : "Customize Cookies"}
          </button>

          {/* Cookie Categories */}
          {showDetails && (
            <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">Necessary Cookies</h4>
                    <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Essential for the website to function properly. These cookies enable core functionality 
                    such as security, authentication, and session management. They cannot be disabled.
                  </p>
                </div>
                <Switch checked={true} disabled className="shrink-0" />
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Analytics Cookies</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Help us understand how visitors interact with our website by collecting and reporting 
                    information anonymously. This data helps us improve our services and user experience.
                  </p>
                </div>
                <Switch
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                  className="shrink-0"
                />
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Functional Cookies</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable enhanced functionality and personalization, such as remembering your preferences, 
                    theme settings, and display options. Disabling may affect your user experience.
                  </p>
                </div>
                <Switch
                  checked={preferences.functional}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, functional: checked })}
                  className="shrink-0"
                />
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-border">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">Marketing Cookies</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Used to track visitors across websites to display relevant advertisements. These cookies 
                    may be set by our advertising partners to build a profile of your interests.
                  </p>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                  className="shrink-0"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={rejectAll}
              className="flex-1"
            >
              Reject All
            </Button>
            {showDetails && (
              <Button
                variant="outline"
                onClick={saveCustom}
                className="flex-1"
              >
                Save Preferences
              </Button>
            )}
            <Button
              onClick={acceptAll}
              className="flex-1"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function to check cookie consent
export function getCookieConsent(): CookiePreferences | null {
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (stored) {
    return JSON.parse(stored) as CookiePreferences;
  }
  return null;
}

// Utility function to check if specific cookie type is allowed
export function isCookieAllowed(type: keyof Omit<CookiePreferences, 'timestamp'>): boolean {
  const consent = getCookieConsent();
  if (!consent) return type === 'necessary';
  return consent[type];
}
