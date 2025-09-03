import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface DeleteAllCardsDialogProps {
  onDeleteAll: () => void;
  cardCount: number;
  isDeleting?: boolean;
}

export const DeleteAllCardsDialog = ({ onDeleteAll, cardCount, isDeleting = false }: DeleteAllCardsDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  const confirmationPhrase = "DELETE ALL CARDS";
  const isConfirmed = confirmText === confirmationPhrase;

  const handleConfirm = () => {
    if (isConfirmed) {
      onDeleteAll();
      setIsOpen(false);
      setConfirmText("");
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
          disabled={cardCount === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete All Cards
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Delete All Cards</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action will permanently delete all <strong>{cardCount} cards</strong> from your collection. 
              This cannot be undone.
            </p>
            <p>
              To confirm, type <strong className="font-mono text-destructive">{confirmationPhrase}</strong> below:
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-text" className="sr-only">
            Confirmation text
          </Label>
          <Input
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmationPhrase}
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete All Cards"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};