import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Link } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { DEWEY_CATEGORIES } from "@/types/zettel";
import { sanitizeUserInput } from "@/utils/security";
import { RichTextEditor } from "./workspace/RichTextEditor";
import { LinkPicker } from "./workspace/LinkPicker";

interface EditCardDialogProps {
  card: ZettelCardType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCard: ZettelCardType) => void;
  organizationMethod?: string;
  availableCategories?: string[];
}

export function EditCardDialog({ card, isOpen, onClose, onSave, organizationMethod = "dewey", availableCategories = [] }: EditCardDialogProps) {
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || "",
    content: card.content,
    category: card.category,
    tags: card.tags,
    number: card.number,
    linkedCards: card.linkedCards || [],
    image_url: card.image_url || "",
    video_url: card.video_url || ""
  });
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: card.title,
        description: card.description || "",
        content: card.content,
        category: card.category,
        tags: card.tags,
        number: card.number,
        linkedCards: card.linkedCards || [],
        image_url: card.image_url || "",
        video_url: card.video_url || ""
      });
    }
  }, [card, isOpen]);

  const handleSave = () => {
    // Sanitize all user inputs to prevent XSS and code injection
    const updatedCard: ZettelCardType = {
      ...card,
      title: sanitizeUserInput(formData.title),
      description: sanitizeUserInput(formData.description),
      content: sanitizeUserInput(formData.content),
      category: sanitizeUserInput(formData.category),
      tags: formData.tags.map(tag => sanitizeUserInput(tag)),
      number: formData.number,
      linkedCards: formData.linkedCards,
      image_url: formData.image_url,
      video_url: formData.video_url,
      modified: new Date().toISOString()
    };
    onSave(updatedCard);
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const addCategory = () => {
    if (newCategory.trim() && !availableCategories.includes(newCategory.trim())) {
      setFormData(prev => ({ ...prev, category: newCategory.trim() }));
      setNewCategory("");
    }
  };

  const getAvailableCategories = () => {
    switch (organizationMethod) {
      case "dewey":
        return DEWEY_CATEGORIES;
      case "luhmann":
        return [...availableCategories.map(cat => ({ range: cat, name: `Sequence ${cat}` }))];
      case "folgezettel":
        return [...availableCategories.map(cat => ({ range: cat, name: `Branch ${cat}` }))];
      case "thematic":
        return [...availableCategories.map(cat => ({ range: cat, name: `Theme ${cat}` }))];
      default:
        return DEWEY_CATEGORIES;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
          <DialogDescription>
            Update the details of your knowledge card below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="number">Card Number</Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              placeholder="Card number (e.g., 1a2b)"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter card title"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description (optional)"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <div className="flex gap-2">
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCategories().map((category) => (
                    <SelectItem key={category.range} value={category.range.split('-')[0]}>
                      {category.range.split('-')[0]} - {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Add new category"
                className="flex-1"
              />
              <Button onClick={addCategory} size="sm" variant="outline">Add</Button>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <RichTextEditor
              value={formData.content}
              onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
              placeholder="Write your card content. Use the toolbar for bold, italic, lists, checkboxes…"
              minHeight="240px"
            />
          </div>

          
          <div className="grid gap-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag"
                className="flex-1"
              />
              <Button onClick={addTag} size="sm">Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Image URL</Label>
            <div className="flex gap-2">
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="flex-1"
              />
              {formData.image_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {formData.image_url && (
              <img 
                src={formData.image_url} 
                alt="Preview" 
                className="w-full max-h-48 object-cover rounded-md border mt-2"
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label>Video URL</Label>
            <div className="flex gap-2">
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://example.com/video.mp4"
                className="flex-1"
              />
              {formData.video_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormData(prev => ({ ...prev, video_url: "" }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Linked Cards</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLinkPickerOpen(true)}>
                <Link className="h-3.5 w-3.5 mr-1.5" />
                Browse &amp; link cards
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Search and check multiple cards to link them all at once.</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.linkedCards.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No linked cards yet.</span>
              )}
              {formData.linkedCards.map((cardNumber, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  #{cardNumber}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      linkedCards: prev.linkedCards.filter(num => num !== cardNumber)
                    }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <LinkPicker
              open={linkPickerOpen}
              onOpenChange={setLinkPickerOpen}
              source="cards"
              byCardNumber
              excludeId={card.number}
              selected={formData.linkedCards}
              onSave={(picked) => setFormData(prev => ({ ...prev, linkedCards: picked }))}
            />
          </div>
        </div>

        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}