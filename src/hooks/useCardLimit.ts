import { usePremiumAccess } from './usePremiumAccess';
import { useToast } from './use-toast';

const FREE_CARD_LIMIT = 50;

export const useCardLimit = () => {
  const { hasAccess } = usePremiumAccess();
  const { toast } = useToast();

  const canCreateCard = (currentCardCount: number): boolean => {
    if (hasAccess) return true;
    
    if (currentCardCount >= FREE_CARD_LIMIT) {
      toast({
        title: 'Card Limit Reached',
        description: `Free users are limited to ${FREE_CARD_LIMIT} cards. Upgrade to premium for unlimited cards.`,
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const getRemainingCards = (currentCardCount: number): number => {
    if (hasAccess) return Infinity;
    return Math.max(0, FREE_CARD_LIMIT - currentCardCount);
  };

  return {
    canCreateCard,
    getRemainingCards,
    cardLimit: hasAccess ? null : FREE_CARD_LIMIT,
  };
};
