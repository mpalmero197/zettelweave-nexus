import type { DeckTile } from "@/hooks/useDecks";
import { toast } from "@/hooks/use-toast";

/**
 * Execute a deck tile press. Dispatched from local taps AND from
 * phone-companion realtime broadcasts. Keep this the single source of truth
 * for tile → action mapping.
 */
export async function runTile(tile: DeckTile): Promise<void> {
  try {
    switch (tile.kind) {
      case "url": {
        const url = (tile.config?.url as string) || "";
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      case "alice_chat": {
        const prompt = (tile.config?.prompt as string) || tile.label || "";
        // Route into ALICE with a prompt query param — Jarvis page picks this up
        window.dispatchEvent(new CustomEvent("alice:prompt", { detail: { prompt } }));
        // Fallback: also navigate if listener isn't mounted
        setTimeout(() => {
          if (!window.location.pathname.startsWith("/alice")) {
            window.location.href = `/alice?prompt=${encodeURIComponent(prompt)}`;
          }
        }, 50);
        return;
      }
      case "hotkey": {
        // Forward to the extension if available
        const hk = tile.hotkey || "";
        window.dispatchEvent(new CustomEvent("alice:hotkey", { detail: { hotkey: hk } }));
        toast({ title: "Hotkey", description: hk || "(none)" });
        return;
      }
      case "macro": {
        if (!tile.macro_id) return;
        window.dispatchEvent(new CustomEvent("alice:run-macro", { detail: { macroId: tile.macro_id } }));
        toast({ title: "Macro triggered", description: tile.label ?? "" });
        return;
      }
      case "widget":
      case "folder":
      case "multi":
      case "noop":
      default:
        return;
    }
  } catch (e) {
    toast({ title: "Tile failed", description: (e as Error).message, variant: "destructive" });
  }
}

export function generatePairCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
