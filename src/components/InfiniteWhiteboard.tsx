import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileWhiteboard } from "@/components/MobileWhiteboard";
import { DesktopWhiteboard } from "@/components/DesktopWhiteboard";

interface InfiniteWhiteboardProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

export const InfiniteWhiteboard = ({ onCreateCard }: InfiniteWhiteboardProps) => {
  const isMobile = useIsMobile();
  
  // Conditionally render mobile or desktop version - no hooks violation!
  if (isMobile) {
    return <MobileWhiteboard />;
  }
  
  return <DesktopWhiteboard onCreateCard={onCreateCard} />;
};

export default InfiniteWhiteboard;
