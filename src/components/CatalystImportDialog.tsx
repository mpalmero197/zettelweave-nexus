import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Cloud, HardDrive, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { importFile, getSupportedFileTypes } from '@/utils/fileImportUtils';
import { initGoogleDrive, openGoogleDrivePicker } from '@/utils/googleDriveImport';
import { openOneDrivePicker } from '@/utils/oneDriveImport';

interface CatalystImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string, fileName: string) => void;
}

export function CatalystImportDialog({ open, onOpenChange, onImport }: CatalystImportDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'computer' | 'googledrive' | 'onedrive'>('computer');
  const [isLoading, setIsLoading] = useState(false);
  const [googleDriveReady, setGoogleDriveReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize Google Drive when dialog opens
    if (open && activeTab === 'googledrive' && !googleDriveReady) {
      initGoogleDrive()
        .then(() => setGoogleDriveReady(true))
        .catch(() => {
          // Silently fail - user will see friendly message when they try to use it
        });
    }
  }, [open, activeTab, googleDriveReady]);

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

  const handleGoogleDriveImport = async () => {
    if (!googleDriveReady) {
      setIsLoading(true);
      try {
        await initGoogleDrive();
        setGoogleDriveReady(true);
      } catch (error: any) {
        toast({
          title: 'Configuration Required',
          description: error.message || 'Please configure Google Drive credentials in your environment settings.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      await openGoogleDrivePicker((file) => {
        onImport(file.content, file.name);
        toast({
          title: 'File imported',
          description: `${file.name} has been added from Google Drive`,
        });
      });
      onOpenChange(false);
    } catch (error: any) {
      if (error.message) {
        toast({
          title: 'Import failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOneDriveImport = async () => {
    setIsLoading(true);
    try {
      await openOneDrivePicker((file) => {
        onImport(file.content, file.name);
        toast({
          title: 'File imported',
          description: `${file.name} has been added from OneDrive`,
        });
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Configuration Required',
        description: error.message || 'Please configure OneDrive credentials in your environment settings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
              <Button onClick={handleGoogleDriveImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Select from Google Drive'
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Supports: Docs, TXT, MD, DOCX, PDF
              </p>
            </div>
          </TabsContent>

          <TabsContent value="onedrive" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
              <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Import directly from OneDrive
              </p>
              <Button onClick={handleOneDriveImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Select from OneDrive'
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Supports: TXT, MD, DOCX, PDF, DOC
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
