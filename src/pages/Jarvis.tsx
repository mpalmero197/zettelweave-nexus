import { JarvisChat } from "@/components/jarvis/JarvisChat";

export default function Jarvis() {
  return (
    // Use dvh so iOS/Android browser chrome doesn't clip the composer.
    <div className="h-[calc(100dvh-3rem)] md:h-[calc(100vh-3rem)]">
      <JarvisChat />
    </div>
  );
}
