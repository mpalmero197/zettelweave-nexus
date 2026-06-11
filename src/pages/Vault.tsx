import { useEffect, useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Fingerprint,
  Lock,
  Plus,
  Shield,
  KeyRound,
  StickyNote,
  CreditCard,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Globe,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateTOTP,
  VaultItem,
  VaultItemPayload,
  VaultItemType,
} from "@/lib/vault/crypto";

const TYPE_META: Record<VaultItemType, { icon: typeof KeyRound; label: string }> = {
  login: { icon: KeyRound, label: "Login" },
  note: { icon: StickyNote, label: "Secure note" },
  card: { icon: CreditCard, label: "Card" },
};

export default function Vault() {
  const vault = useVault();
  const [tab, setTab] = useState<VaultItemType>("login");
  const [editor, setEditor] = useState<{
    open: boolean;
    type: VaultItemType;
    id?: string;
    payload: VaultItemPayload;
  }>({ open: false, type: "login", payload: {} });
  const [openItem, setOpenItem] = useState<VaultItem | null>(null);
  const [openPayload, setOpenPayload] = useState<VaultItemPayload | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [totp, setTotp] = useState<{ code: string; remainingMs: number } | null>(null);

  // Re-tick TOTP every second when an item is open
  useEffect(() => {
    if (!openPayload?.totpSecret) {
      setTotp(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const t = await generateTOTP(openPayload.totpSecret!);
      if (!cancelled) setTotp(t);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [openPayload?.totpSecret]);

  // Broadcast unlocked vault to ALICE agent (extension) when ready
  useEffect(() => {
    if (!vault.unlocked) return;
    const bc = new BroadcastChannel("pendragonx-vault");
    const handler = async (ev: MessageEvent) => {
      if (ev.data?.type !== "get-otp") return;
      const host = String(ev.data.host || "");
      const match = vault.items.find(
        (i) => i.item_type === "login" && i.host && host.endsWith(i.host)
      );
      if (!match) {
        bc.postMessage({ type: "otp-result", requestId: ev.data.requestId, code: null });
        return;
      }
      try {
        const p = await vault.decryptItem(match);
        if (!p.totpSecret) {
          bc.postMessage({ type: "otp-result", requestId: ev.data.requestId, code: null });
          return;
        }
        const { code } = await generateTOTP(p.totpSecret);
        bc.postMessage({ type: "otp-result", requestId: ev.data.requestId, code });
      } catch {
        bc.postMessage({ type: "otp-result", requestId: ev.data.requestId, code: null });
      }
    };
    bc.addEventListener("message", handler);
    return () => {
      bc.removeEventListener("message", handler);
      bc.close();
    };
  }, [vault.unlocked, vault.items, vault.decryptItem]);

  const filtered = useMemo(
    () => vault.items.filter((i) => i.item_type === tab),
    [vault.items, tab]
  );

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const openEditor = (type: VaultItemType, item?: VaultItem) => {
    setEditor({
      open: true,
      type,
      id: item?.id,
      payload: {},
    });
    if (item) {
      vault
        .decryptItem(item)
        .then((p) => setEditor((e) => ({ ...e, payload: p })))
        .catch((e) => toast.error(e.message));
    }
  };

  const saveEditor = async () => {
    try {
      await vault.saveItem(editor.type, editor.payload, editor.id);
      toast.success("Saved to vault");
      setEditor((e) => ({ ...e, open: false }));
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  // ---------- Locked / not-enrolled gate ----------
  if (vault.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Loading vault…
      </div>
    );
  }

  if (!vault.unlocked) {
    const hasPasskey = vault.passkeys.length > 0;
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
          <Shield className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Hyper-secure vault</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          End-to-end encrypted with your device passkey. Even PendragonX
          administrators cannot read what's inside.
        </p>
        <div className="mt-8 w-full space-y-3">
          {hasPasskey ? (
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() =>
                vault.unlock().catch((e) => toast.error(e.message || "Unlock failed"))
              }
              disabled={vault.unlocking}
            >
              <Fingerprint className="h-5 w-5" />
              {vault.unlocking ? "Waiting for passkey…" : "Unlock with passkey"}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() =>
                vault
                  .enroll()
                  .then(() => vault.unlock())
                  .catch((e) => toast.error(e.message || "Enrollment failed"))
              }
            >
              <Fingerprint className="h-5 w-5" />
              Set up this device
            </Button>
          )}
          {hasPasskey && (
            <Button
              variant="ghost"
              className="w-full gap-2 text-xs"
              onClick={() =>
                vault
                  .enroll(`Device ${vault.passkeys.length + 1}`)
                  .catch((e) => toast.error(e.message || "Enrollment failed"))
              }
            >
              <Plus className="h-3 w-3" /> Enroll another device
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---------- Unlocked ----------
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Vault</h1>
            <p className="text-xs text-muted-foreground">
              {vault.items.length} encrypted items · auto-locks after 5 min idle
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={vault.lock} className="gap-1">
            <Lock className="h-3.5 w-3.5" /> Lock
          </Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => openEditor(tab)}
          >
            <Plus className="h-3.5 w-3.5" /> New {TYPE_META[tab].label.toLowerCase()}
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as VaultItemType)}>
        <TabsList>
          <TabsTrigger value="login" className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Logins
          </TabsTrigger>
          <TabsTrigger value="note" className="gap-1.5">
            <StickyNote className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="card" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Cards
          </TabsTrigger>
        </TabsList>

        {(["login", "note", "card"] as VaultItemType[]).map((t) => (
          <TabsContent key={t} value={t} className="mt-4 space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                No {TYPE_META[t].label.toLowerCase()}s yet.
              </div>
            ) : (
              filtered.map((item) => {
                const Icon = TYPE_META[item.item_type].icon;
                return (
                  <Card
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 p-3 transition hover:bg-accent"
                    onClick={async () => {
                      setOpenItem(item);
                      setOpenPayload(null);
                      setShowPw(false);
                      try {
                        setOpenPayload(await vault.decryptItem(item));
                      } catch (e: any) {
                        toast.error(e.message || "Decrypt failed");
                      }
                    }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {item.label || "Untitled"}
                      </div>
                      {item.host && (
                        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {item.host}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Encrypted
                    </Badge>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* ---------- Item viewer ---------- */}
      <Dialog open={!!openItem} onOpenChange={(o) => !o && setOpenItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate">
              {openItem?.label || "Item"}
            </DialogTitle>
          </DialogHeader>
          {!openPayload ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Decrypting…
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {openPayload.url && (
                <Row label="URL" value={openPayload.url} onCopy={copy} />
              )}
              {openPayload.username && (
                <Row label="Username" value={openPayload.username} onCopy={copy} />
              )}
              {openPayload.email && (
                <Row label="Email" value={openPayload.email} onCopy={copy} />
              )}
              {openPayload.password && (
                <div>
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <div className="mt-1 flex items-center gap-1">
                    <Input
                      readOnly
                      value={openPayload.password}
                      type={showPw ? "text" : "password"}
                      className="font-mono"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowPw((s) => !s)}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copy(openPayload.password!, "Password")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {totp && (
                <div>
                  <Label className="text-xs text-muted-foreground">One-time code</Label>
                  <div className="mt-1 flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="font-mono text-2xl tracking-[0.3em]">
                      {totp.code}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {Math.ceil(totp.remainingMs / 1000)}s
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copy(totp.code, "OTP")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {openPayload.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea readOnly value={openPayload.notes} className="mt-1" />
                </div>
              )}
              {openPayload.cardNumber && (
                <>
                  <Row label="Card number" value={openPayload.cardNumber} onCopy={copy} mono />
                  <div className="grid grid-cols-2 gap-2">
                    {openPayload.cardExpiry && (
                      <Row label="Expiry" value={openPayload.cardExpiry} onCopy={copy} />
                    )}
                    {openPayload.cardCvc && (
                      <Row label="CVC" value={openPayload.cardCvc} onCopy={copy} />
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={async () => {
                if (!openItem) return;
                if (!confirm("Delete this item permanently?")) return;
                await vault.deleteItem(openItem.id);
                setOpenItem(null);
                toast.success("Deleted");
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (openItem) openEditor(openItem.item_type, openItem);
                setOpenItem(null);
              }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Editor ---------- */}
      <Dialog
        open={editor.open}
        onOpenChange={(o) => setEditor((e) => ({ ...e, open: o }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editor.id ? "Edit" : "New"} {TYPE_META[editor.type].label.toLowerCase()}
            </DialogTitle>
          </DialogHeader>
          <ItemForm
            type={editor.type}
            value={editor.payload}
            onChange={(p) => setEditor((e) => ({ ...e, payload: p }))}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditor((e) => ({ ...e, open: false }))}
            >
              Cancel
            </Button>
            <Button onClick={saveEditor}>Save securely</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy: (t: string, l: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-1">
        <Input readOnly value={value} className={mono ? "font-mono" : ""} />
        <Button size="icon" variant="ghost" onClick={() => onCopy(value, label)}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ItemForm({
  type,
  value,
  onChange,
}: {
  type: VaultItemType;
  value: VaultItemPayload;
  onChange: (v: VaultItemPayload) => void;
}) {
  const set = (k: keyof VaultItemPayload, v: string) =>
    onChange({ ...value, [k]: v });

  if (type === "note") {
    return (
      <div className="space-y-3">
        <Field label="Title">
          <Input value={value.title || ""} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea
            rows={8}
            value={value.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className="space-y-3">
        <Field label="Label">
          <Input value={value.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Visa personal" />
        </Field>
        <Field label="Cardholder">
          <Input value={value.cardholder || ""} onChange={(e) => set("cardholder", e.target.value)} />
        </Field>
        <Field label="Card number">
          <Input
            value={value.cardNumber || ""}
            onChange={(e) => set("cardNumber", e.target.value)}
            inputMode="numeric"
            className="font-mono"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Expiry (MM/YY)">
            <Input value={value.cardExpiry || ""} onChange={(e) => set("cardExpiry", e.target.value)} />
          </Field>
          <Field label="CVC">
            <Input value={value.cardCvc || ""} onChange={(e) => set("cardCvc", e.target.value)} className="font-mono" />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={value.notes || ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    );
  }

  // login
  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input value={value.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Gmail" />
      </Field>
      <Field label="Website / URL">
        <Input
          value={value.url || ""}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://gmail.com"
        />
      </Field>
      <Field label="Username">
        <Input value={value.username || ""} onChange={(e) => set("username", e.target.value)} />
      </Field>
      <Field label="Email">
        <Input value={value.email || ""} onChange={(e) => set("email", e.target.value)} type="email" />
      </Field>
      <Field label="Password">
        <Input
          value={value.password || ""}
          onChange={(e) => set("password", e.target.value)}
          type="password"
          className="font-mono"
        />
      </Field>
      <Field label="TOTP secret (base32)">
        <Input
          value={value.totpSecret || ""}
          onChange={(e) => set("totpSecret", e.target.value)}
          placeholder="JBSWY3DPEHPK3PXP"
          className="font-mono"
        />
      </Field>
      <Field label="Notes">
        <Textarea value={value.notes || ""} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
