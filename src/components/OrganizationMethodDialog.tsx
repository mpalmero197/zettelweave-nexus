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
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Organization Method
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Organization Method</DialogTitle>
          <DialogDescription>
            Select how you want to organize and number your Zettelkasten cards. Each method has its own approach to structuring knowledge.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <RadioGroup 
            value={selectedMethod} 
            onValueChange={(value) => setSelectedMethod(value as OrganizationMethod)}
            className="space-y-4"
          >
            {ORGANIZATION_METHODS.map((method) => (
              <div key={method.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="font-medium cursor-pointer">
                    {method.name}
                  </Label>
                </div>
                
                <Card className="ml-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{method.description}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <strong>Numbering:</strong> {method.numbering}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Example:</strong> {method.example}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};