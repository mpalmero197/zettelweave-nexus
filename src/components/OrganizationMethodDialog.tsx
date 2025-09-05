import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Bot, AlertTriangle } from "lucide-react";
import { OrganizationMethod, ORGANIZATION_METHODS } from "@/types/zettel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface OrganizationMethodDialogProps {
  currentMethod: OrganizationMethod;
  onMethodChange: (method: OrganizationMethod) => void;
  onReorganizeCards?: (fromMethod: OrganizationMethod, toMethod: OrganizationMethod) => Promise<void>;
  cardCount?: number;
}

export function OrganizationMethodDialog({ 
  currentMethod, 
  onMethodChange, 
  onReorganizeCards,
  cardCount = 0 
}: OrganizationMethodDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<OrganizationMethod>(currentMethod);
  const [shouldReorganize, setShouldReorganize] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);

  const handleSave = async () => {
    if (selectedMethod === currentMethod) {
      setIsOpen(false);
      return;
    }

    try {
      // If reorganization is requested and we have cards
      if (shouldReorganize && cardCount > 0 && onReorganizeCards) {
        setIsReorganizing(true);
        await onReorganizeCards(currentMethod, selectedMethod);
      }
      
      onMethodChange(selectedMethod);
      setIsOpen(false);
      toast(`Organization method changed to ${ORGANIZATION_METHODS.find(m => m.id === selectedMethod)?.name}`);
    } catch (error) {
      console.error('Error changing organization method:', error);
      toast(`Failed to change organization method: ${error.message}`);
    } finally {
      setIsReorganizing(false);
    }
  };

  const handleCancel = () => {
    setSelectedMethod(currentMethod);
    setShouldReorganize(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 border-accent/20">
          <Settings className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Organization Method</span>
          <span className="sm:hidden">Method</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Organization Method
          </DialogTitle>
          <DialogDescription>
            Choose how your Zettelkasten cards should be organized and numbered.
            {cardCount > 0 && " You can optionally reorganize existing cards to match the new system."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-4">
            {ORGANIZATION_METHODS.map((method) => (
              <Card 
                key={method.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedMethod === method.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{method.name}</CardTitle>
                    {selectedMethod === method.id && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {method.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Numbering System:</p>
                      <p className="text-sm">{method.numbering}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Example:</p>
                      <p className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                        {method.example}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reorganization option */}
          {cardCount > 0 && selectedMethod !== currentMethod && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p>
                    You have {cardCount} existing cards organized using the{" "}
                    <strong>{ORGANIZATION_METHODS.find(m => m.id === currentMethod)?.name}</strong> system.
                  </p>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="reorganize"
                      checked={shouldReorganize}
                      onCheckedChange={(checked) => setShouldReorganize(checked === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="reorganize"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          Reorganize existing cards with AI
                        </div>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        AI will intelligently convert your cards to the new system, updating numbering and maintaining relationships.
                      </p>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isReorganizing}>
            {isReorganizing ? (
              <>
                <Bot className="mr-2 h-4 w-4 animate-spin" />
                Reorganizing...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}