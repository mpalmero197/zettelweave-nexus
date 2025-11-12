import { useSubscription } from './useSubscription';
import { useToast } from './use-toast';

const FREE_CARD_LIMIT = 50;

export const useCardLimit = () => {
  const { hasPremium } = useSubscription();
  const { toast } = useToast();

  const canCreateCard = (currentCardCount: number): boolean => {
    if (hasPremium) return true;
    
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
    if (hasPremium) return Infinity;
    return Math.max(0, FREE_CARD_LIMIT - currentCardCount);
  };

  return {
    canCreateCard,
    getRemainingCards,
    cardLimit: hasPremium ? null : FREE_CARD_LIMIT,
  };
};
