import { JarvisChat } from "@/components/jarvis/JarvisChat";

export default function Jarvis() {
  return (
    // Use dvh so iOS/Android browser chrome doesn't clip the composer.
    // The JarvisChat root carries the .alice-surface aurora background;
    // we just give it the full viewport real estate it deserves.
    <div className="h-[calc(100dvh-3rem)] md:h-[calc(100vh-3rem)] bg-[hsl(240_33%_6%)]">
      <JarvisChat />
    </div>
  );
}
