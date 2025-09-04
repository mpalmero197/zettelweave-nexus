import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { ORGANIZATION_METHODS, OrganizationMethod } from "@/types/zettel";

interface OrganizationMethodDialogProps {
  currentMethod: OrganizationMethod;
  onMethodChange: (method: OrganizationMethod) => void;
}

export const OrganizationMethodDialog = ({ 
  currentMethod, 
  onMethodChange 
}: OrganizationMethodDialogProps) => {
  const [selectedMethod, setSelectedMethod] = useState<OrganizationMethod>(currentMethod);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onMethodChange(selectedMethod);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg lg:text-xl">Choose Organization Method</DialogTitle>
          <DialogDescription className="text-sm lg:text-base">
            Select how you want to organize and number your Zettelkasten cards. Each method has its own approach to structuring knowledge.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 lg:space-y-6">
          <RadioGroup 
            value={selectedMethod} 
            onValueChange={(value) => setSelectedMethod(value as OrganizationMethod)}
            className="space-y-3 lg:space-y-4"
          >
            {ORGANIZATION_METHODS.map((method) => (
              <div key={method.id} className="space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="font-medium cursor-pointer text-sm lg:text-base flex-1">
                    {method.name}
                  </Label>
                </div>
                
                <Card className="ml-6 lg:ml-8 bg-gradient-to-br from-muted/30 to-muted/10 border-border/50">
                  <CardHeader className="pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
                    <CardTitle className="text-xs lg:text-sm text-muted-foreground">{method.description}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 lg:px-6 pb-3 lg:pb-6 space-y-2">
                    <div className="text-xs lg:text-sm text-muted-foreground">
                      <strong className="text-foreground">Numbering:</strong> {method.numbering}
                    </div>
                    <div className="text-xs lg:text-sm text-muted-foreground">
                      <strong className="text-foreground">Example:</strong> <code className="bg-muted px-1 py-0.5 rounded text-xs">{method.example}</code>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </RadioGroup>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-hover">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};