import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { Plus } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";

export function WelcomeWidget() {
  const { cards, createCard } = useZettelCards();
  
  return (
    <Card className="h-full">
      <CardContent className="p-6 h-full flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build your second brain with zettel cards, organize notes, and create connections between ideas.
          </p>
        </div>
        
        <CreateCardDialog
          existingCards={cards}
          onCreateCard={createCard}
          organizationMethod="dewey"
          trigger={
            <Button className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Card
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
