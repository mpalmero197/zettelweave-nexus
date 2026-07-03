import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Copy, Check, ExternalLink, Shield, KeyRound, RefreshCw, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ProviderItem {
  provider: string;
  label: string;
  client_id: string | null;
  has_secret: boolean;
  enabled: boolean;
  scopes: string;
  authorize_url: string;
  updated_at: string | null;
}

interface ProviderGuide {
  consoleUrl: string;
  consoleLabel: string;
  scopesUrl?: string;
  steps: { title: string; body: string; link?: { url: string; label: string } }[];
}

const GUIDES: Record<string, ProviderGuide> = {
  google: {
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    consoleLabel: "Google Cloud Console — Credentials",
    scopesUrl: "https://console.cloud.google.com/apis/credentials/consent",
    steps: [
      {
        title: "Create or pick a Google Cloud project",
        body: "Open Google Cloud Console and create (or select) a project for Baku Scribe.",
        link: { url: "https://console.cloud.google.com/projectcreate", label: "Create project" },
      },
      {
        title: "Configure the OAuth consent screen",
        body: "Set User Type to External, fill in app name, support email, and add your email under Test users while in testing mode. Required scopes: openid, email, profile, drive.readonly, calendar, gmail.readonly.",
        link: { url: "https://console.cloud.google.com/apis/credentials/consent", label: "OAuth consent screen" },
      },
      {
        title: "Enable the APIs you need",
        body: "Enable: Google Drive API, Google Calendar API, Gmail API. Each takes one click.",
        link: { url: "https://console.cloud.google.com/apis/library", label: "API Library" },
      },
      {
        title: "Create an OAuth 2.0 Client ID",
        body: "Credentials → Create credentials → OAuth client ID → Application type: Web application. Add the Redirect URI shown below to 'Authorized redirect URIs'.",
        link: { url: "https://console.cloud.google.com/apis/credentials", label: "Credentials" },
      },
      {
        title: "Copy Client ID & Secret",
        body: "Google shows them once on the create screen. Paste them into the fields on the right and click Save.",
      },
    ],
  },
  microsoft: {
    consoleUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    consoleLabel: "Microsoft Entra — App registrations",
    steps: [
      {
        title: "Register a new application",
        body: "Microsoft Entra → App registrations → New registration. Supported account types: 'Accounts in any organizational directory and personal Microsoft accounts'. Add the Redirect URI below under Web.",
        link: {
          url: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade",
          label: "New registration",
        },
      },
      {
        title: "Add API permissions",
        body: "API permissions → Add → Microsoft Graph → Delegated. Add: User.Read, Mail.Read, Mail.Send, Calendars.ReadWrite, Files.Read.All, Notes.Read.All, offline_access. Grant admin consent if available.",
      },
      {
        title: "Create a client secret",
        body: "Certificates & secrets → New client secret. Copy the Value (not the Secret ID) immediately — it's only shown once.",
      },
      {
        title: "Copy Application (client) ID",
        body: "Back on the Overview page. Paste the Application ID + the secret value into the fields on the right and click Save.",
      },
    ],
  },
  notion: {
    consoleUrl: "https://www.notion.so/my-integrations",
    consoleLabel: "Notion — My integrations",
    steps: [
      {
        title: "Create a public integration",
        body: "Notion → My integrations → New integration. Type: Public. Fill in name, logo, and contact email.",
        link: { url: "https://www.notion.so/my-integrations", label: "Open Notion integrations" },
      },
      {
        title: "Add the Redirect URI",
        body: "Under OAuth Domain & URIs → Add the Redirect URI below. Capabilities: Read content (and Write if you want Baku Scribe to push back).",
      },
      {
        title: "Copy OAuth client ID & secret",
        body: "From the integration's Secrets tab. Paste them into the fields on the right and click Save.",
      },
    ],
  },
};

export function OAuthProvidersPanel() {
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("oauth-admin-config", {
      body: { action: "list" },
    });
    if (error) {
      toast.error(error.message || "Could not load OAuth config");
    } else {
      setItems(data?.items || []);
      setRedirectUri(data?.redirect_uri || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyRedirect = useCallback(() => {
    if (!redirectUri) return;
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    toast.success("Redirect URI copied");
    setTimeout(() => setCopied(false), 1500);
  }, [redirectUri]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">OAuth Providers</h2>
          <p className="text-sm text-muted-foreground">
            Configure one-click "log in with…" for connectors. Credentials are stored encrypted at rest, admin-only.
            Every change is written to the security audit log.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <strong>Shared redirect URI</strong> — paste this exact URL into every provider's "Authorized redirect URIs" field.
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 px-2 py-1.5 bg-muted rounded text-[11px] font-mono break-all">
              {redirectUri || "Loading…"}
            </code>
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={copyRedirect} disabled={!redirectUri}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {items.map((p) => (
        <ProviderCard key={p.provider} item={p} redirectUri={redirectUri} onSaved={load} />
      ))}
    </div>
  );
}

function ProviderCard({
  item,
  redirectUri,
  onSaved,
}: {
  item: ProviderItem;
  redirectUri: string;
  onSaved: () => void;
}) {
  const guide = GUIDES[item.provider];
  const [clientId, setClientId] = useState(item.client_id || "");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [enabled, setEnabled] = useState(item.enabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setClientId(item.client_id || "");
    setEnabled(item.enabled);
  }, [item.client_id, item.enabled]);

  const dirty = useMemo(() => {
    return (
      clientId !== (item.client_id || "") ||
      clientSecret.length > 0 ||
      enabled !== item.enabled
    );
  }, [clientId, clientSecret, enabled, item]);

  const isConfigured = !!item.client_id;

  const save = useCallback(async () => {
    if (!clientId.trim()) {
      toast.error("Client ID is required");
      return;
    }
    if (!isConfigured && !clientSecret) {
      toast.error("Client Secret is required for the initial setup");
      return;
    }
    setSaving(true);
    const payload: any = {
      action: "save",
      provider: item.provider,
      client_id: clientId.trim(),
      enabled,
    };
    if (clientSecret) payload.client_secret = clientSecret;
    const { error } = await supabase.functions.invoke("oauth-admin-config", { body: payload });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Save failed");
      return;
    }
    toast.success(`${item.label} saved`);
    setClientSecret("");
    onSaved();
  }, [clientId, clientSecret, enabled, isConfigured, item.provider, item.label, onSaved]);

  const remove = useCallback(async () => {
    if (!confirm(`Delete saved credentials for ${item.label}? Existing user connections will keep working until the next refresh.`)) return;
    setSaving(true);
    const { error } = await supabase.functions.invoke("oauth-admin-config", {
      body: { action: "delete", provider: item.provider },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Delete failed");
      return;
    }
    toast.success(`${item.label} cleared`);
    onSaved();
  }, [item.provider, item.label, onSaved]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {item.label}
              {isConfigured && enabled ? (
                <Badge variant="default" className="text-[10px] h-5 gap-1">
                  <Check className="h-3 w-3" /> Live
                </Badge>
              ) : isConfigured ? (
                <Badge variant="secondary" className="text-[10px] h-5">Disabled</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  Not configured
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Scopes:{" "}
              <code className="text-[10px] font-mono">
                {item.scopes.split(/\s+/).slice(0, 4).join(" ")}
                {item.scopes.split(/\s+/).length > 4 ? " …" : ""}
              </code>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${item.provider}-enabled`} className="text-xs text-muted-foreground">
              Enabled
            </Label>
            <Switch
              id={`${item.provider}-enabled`}
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!isConfigured && !clientSecret}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${item.provider}-cid`} className="text-xs">Client ID</Label>
            <Input
              id={`${item.provider}-cid`}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 1234567890-abc.apps.googleusercontent.com"
              className="font-mono text-xs h-9"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${item.provider}-cs`} className="text-xs flex items-center justify-between">
              Client Secret
              {isConfigured && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  {clientSecret ? "Will replace stored secret" : "•••• stored (leave blank to keep)"}
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id={`${item.provider}-cs`}
                type={showSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={isConfigured ? "Leave blank to keep current" : "Paste the provider secret"}
                className="font-mono text-xs h-9 pr-9"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {guide && (
          <Accordion type="single" collapsible className="border rounded-md">
            <AccordionItem value="how" className="border-0">
              <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                <span className="flex items-center gap-2">
                  📘 How to set up {item.label}
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {guide.steps.length} steps
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 space-y-2.5">
                <a
                  href={guide.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {guide.consoleLabel}
                </a>
                <ol className="space-y-2 text-xs">
                  {guide.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium leading-snug">{s.title}</p>
                        <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                        {s.link && (
                          <a
                            href={s.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline mt-0.5"
                          >
                            <ExternalLink className="h-3 w-3" /> {s.link.label}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {redirectUri && (
                  <div className="text-[11px] text-muted-foreground border-t pt-2 mt-2 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>
                      Don't forget to add{" "}
                      <code className="bg-muted px-1 rounded">{redirectUri}</code> to the provider's
                      authorized redirect URIs.
                    </span>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <Separator />
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            {item.updated_at
              ? `Last updated ${new Date(item.updated_at).toLocaleString()}`
              : "Never configured"}
          </div>
          <div className="flex items-center gap-2">
            {isConfigured && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={remove}
                disabled={saving}
              >
                Clear
              </Button>
            )}
            <Button size="sm" className="h-8 text-xs" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
