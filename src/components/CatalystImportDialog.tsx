import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Cloud, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importFile, getSupportedFileTypes } from '@/utils/fileImportUtils';

interface CatalystImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string, fileName: string) => void;
}

export function CatalystImportDialog({ open, onOpenChange, onImport }: CatalystImportDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'computer' | 'googledrive' | 'onedrive'>('computer');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const imported = await importFile(file);
        onImport(imported.content, file.name);
        toast({
          title: 'File imported',
          description: `${file.name} has been added to your document`,
        });
      } catch (error: any) {
        toast({
          title: 'Import failed',
          description: `Failed to import ${file.name}: ${error.message}`,
          variant: 'destructive',
        });
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const handleGoogleDriveImport = () => {
    toast({
      title: 'Google Drive',
      description: 'Google Drive integration coming soon! Use the computer option for now.',
    });
  };

  const handleOneDriveImport = () => {
    toast({
      title: 'OneDrive',
      description: 'OneDrive integration coming soon! Use the computer option for now.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Document</DialogTitle>
          <DialogDescription>
            Choose where to import your document from
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="computer">
              <HardDrive className="h-4 w-4 mr-2" />
              Computer
            </TabsTrigger>
            <TabsTrigger value="googledrive">
              <Cloud className="h-4 w-4 mr-2" />
              Google Drive
            </TabsTrigger>
            <TabsTrigger value="onedrive">
              <Cloud className="h-4 w-4 mr-2" />
              OneDrive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="computer" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
              <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Select files from your computer
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={getSupportedFileTypes()}
                multiple
                onChange={handleLocalFileImport}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-4">
                Supported: TXT, MD, DOCX, PDF, and more
              </p>
            </div>
          </TabsContent>

          <TabsContent value="googledrive" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
              <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Import directly from Google Drive
              </p>
              <Button onClick={handleGoogleDriveImport}>
                Connect Google Drive
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Coming soon - Use computer import for now
              </p>
            </div>
          </TabsContent>

          <TabsContent value="onedrive" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
              <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Import directly from OneDrive
              </p>
              <Button onClick={handleOneDriveImport}>
                Connect OneDrive
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Coming soon - Use computer import for now
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
