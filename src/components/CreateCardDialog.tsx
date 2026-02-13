import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Wand2, X } from "lucide-react";
import { ZettelCard, OrganizationMethod } from "@/types/zettel";
import { categorizeContent, generateZettelNumber, extractKeywords, getCategoryInfo } from "@/utils/deweySystem";
import { MediaUpload } from "./MediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeUserInput } from "@/utils/security";
import { EncryptionToggle } from "./EncryptionToggle";
import { EncryptionPasswordDialog } from "./EncryptionPasswordDialog";
import { encryptData, getUserEncryptionSalt, isEncryptionEnabled, initializeUserEncryption } from "@/utils/encryption";

interface CreateCardDialogProps {
  existingCards: ZettelCard[];
  onCreateCard: (card: Omit<ZettelCard, 'id' | 'created' | 'modified'>) => void;
  trigger?: React.ReactNode;
  organizationMethod?: OrganizationMethod;
}

export function CreateCardDialog({ existingCards, onCreateCard, trigger, organizationMethod = "dewey" }: CreateCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [category, setCategory] = useState("");
  const [number, setNumber] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [setupMode, setSetupMode] = useState(false);

  const handleAutoGenerate = async () => {
    if (!title && !content) return;
    
    setIsGenerating(true);
    try {
      // Use AI to categorize based on current organization method
      const { data, error } = await supabase.functions.invoke('ai-categorize-card', {
        body: {
          title,
          content,
          method: organizationMethod,
          existingNumbers: existingCards.map(c => c.number)
        }
      });

      if (error) throw error;

      if (data?.number && data?.category) {
        setNumber(data.number);
        setCategory(data.category);
        toast.success(`Categorized using ${organizationMethod} system`);
      }

      // Generate keywords and description
      const keywords = extractKeywords(title + " " + content);
      setTags(keywords);
      
      if (!description) {
        const firstSentence = content.split('.')[0] + '.';
        setDescription(firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence);
      }
    } catch (error) {
      toast.error('Failed to categorize card. Please try again.');
      
      // Fallback to old method for Dewey
      if (organizationMethod === 'dewey') {
        const detectedCategory = categorizeContent(content, title);
        const generatedNumber = generateZettelNumber(detectedCategory, existingCards.map(c => c.number));
        setCategory(detectedCategory);
        setNumber(generatedNumber);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleEncryptionToggle = async (enabled: boolean) => {
    const hasEncryption = await isEncryptionEnabled();
    
    if (enabled && !hasEncryption) {
      // Need to setup encryption first
      setSetupMode(true);
      setShowPasswordDialog(true);
      return;
    }
    
    if (enabled) {
      // Need password to encrypt
      setShowPasswordDialog(true);
    } else {
      setEncryptionEnabled(false);
      setEncryptionPassword("");
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (setupMode) {
      // Initialize encryption
      await initializeUserEncryption(password);
      setSetupMode(false);
      toast.success("Encryption enabled successfully");
    }
    
    setEncryptionPassword(password);
    setEncryptionEnabled(true);
    setShowPasswordDialog(false);
  };

  const handleSubmit = async () => {
    if (!title || !content) return;

    // Sanitize all user inputs to prevent XSS and code injection
    const sanitizedTitle = sanitizeUserInput(title);
    const sanitizedContent = sanitizeUserInput(content);
    const sanitizedDescription = sanitizeUserInput(description);
    const sanitizedTags = tags.map(tag => sanitizeUserInput(tag));

    const finalCategory = category || categorizeContent(sanitizedContent, sanitizedTitle);
    const finalNumber = number || generateZettelNumber(finalCategory, existingCards.map(c => c.number));

    const cardData: any = {
      title: sanitizedTitle,
      content: sanitizedContent,
      description: sanitizedDescription,
      tags: sanitizedTags,
      category: finalCategory,
      number: finalNumber,
      linkedCards: [],
      author: "User",
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      is_encrypted: encryptionEnabled
    };

    // Handle encryption if enabled
    if (encryptionEnabled && encryptionPassword) {
      try {
        const salt = await getUserEncryptionSalt();
        if (!salt) throw new Error("Encryption not initialized");

        const { encrypted, iv } = await encryptData(sanitizedContent, encryptionPassword, salt);
        cardData.encrypted_content = encrypted;
        cardData.encryption_iv = iv;
        // Content field will be cleared server-side for encrypted items
      } catch (error: any) {
        toast.error("Encryption failed: " + error.message);
        return;
      }
    }

    onCreateCard(cardData);

    // Reset form
    setTitle("");
    setContent("");
    setDescription("");
    setTags([]);
    setNewTag("");
    setCategory("");
    setNumber("");
    setImageUrl("");
    setVideoUrl("");
    setEncryptionEnabled(false);
    setEncryptionPassword("");
    setOpen(false);
  };

  const categoryInfo = category ? getCategoryInfo(category) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            <span className="hidden md:inline">Create Card</span>
            <span className="md:hidden">New Card</span>
          </DialogTitle>
          <DialogDescription>
            Create a new knowledge card to add to your collection. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter card title..."
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your content here..."
              rows={6}
              className="text-base leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category & Number</Label>
              <div className="flex gap-2">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="w-20 text-center font-mono"
                />
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Number"
                  className="flex-1 font-mono"
                />
              </div>
              {categoryInfo && (
                <p className="text-xs text-muted-foreground">
                  {categoryInfo.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(newTag);
                    }
                  }}
                  placeholder="Add tag..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(newTag)}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <EncryptionToggle
            enabled={encryptionEnabled}
            onChange={handleEncryptionToggle}
          />

          <EncryptionPasswordDialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
            onPasswordSubmit={handlePasswordSubmit}
            mode={setupMode ? 'setup' : 'encrypt'}
          />

          <MediaUpload
            onImageUpload={setImageUrl}
            onVideoUpload={setVideoUrl}
            existingImageUrl={imageUrl}
            existingVideoUrl={videoUrl}
          />

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleAutoGenerate}
              disabled={isGenerating || (!title && !content)}
              className="bg-gradient-accent hover:bg-accent-hover"
            >
              <Wand2 className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Auto-Generate'}
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!title || !content}>
                Create
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}