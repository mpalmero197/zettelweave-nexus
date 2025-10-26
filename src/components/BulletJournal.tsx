import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Circle, Square, Triangle, ArrowRight, Tag, X } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface BulletItem {
  id: string;
  type: "task" | "event" | "note" | "migration";
  content: string;
  completed?: boolean;
  date: Date;
  tags: string[];
}

interface BulletJournalProps {
  onCreateCard?: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
  onAddHabit?: (habitName: string) => void;
}

const BulletIcon = ({ type, completed }: { type: BulletItem["type"]; completed?: boolean }) => {
  if (type === "task") {
    return completed ? "✓" : "•";
  }
  if (type === "event") return "○";
  if (type === "note") return "–";
  if (type === "migration") return ">";
  return "•";
};

export const BulletJournal = ({ onCreateCard, onAddHabit }: BulletJournalProps) => {
  const [items, setItems] = useState<BulletItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [newTags, setNewTags] = useState("");
  const [selectedType, setSelectedType] = useState<BulletItem["type"]>("task");

  const addItem = () => {
    if (!newItem.trim()) return;

    const tags = newTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    const item: BulletItem = {
      id: crypto.randomUUID(),
      type: selectedType,
      content: newItem,
      completed: false,
      date: new Date(),
      tags: tags
    };

    setItems(prev => [item, ...prev]);
    setNewItem("");
    setNewTags("");
    toast("Bullet journal item added");

    // Auto-sync tasks to habit tracker
    if (selectedType === 'task' && onAddHabit) {
      onAddHabit(newItem);
    }
  };

  const toggleTask = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const addTagToItem = (itemId: string, tag: string) => {
    if (!tag.trim()) return;
    
    setItems(prev => prev.map(item => 
      item.id === itemId ? { 
        ...item, 
        tags: [...item.tags, tag.trim()]
      } : item
    ));
  };

  const removeTagFromItem = (itemId: string, tagToRemove: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { 
        ...item, 
        tags: item.tags.filter(tag => tag !== tagToRemove)
      } : item
    ));
  };

  const migrateToCard = (item: BulletItem) => {
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: item.content.length > 50 ? item.content.substring(0, 50) + "..." : item.content,
      content: `# ${item.type.toUpperCase()}\n\n${item.content}\n\n*Migrated from bullet journal on ${item.date.toLocaleDateString()}*`,
      description: `Bullet journal ${item.type}`,
      category: "000",
      number: "",
      tags: ["bullet-journal", item.type, ...item.tags],
      linkedCards: []
    };

    onCreateCard?.(newCard);
    
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, type: "migration" as const } : i
    ));
    
    toast("Migrated to zettel card");
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast("Item deleted");
  };

  const todayItems = items.filter(item => 
    item.date.toDateString() === new Date().toDateString()
  );

  const olderItems = items.filter(item => 
    item.date.toDateString() !== new Date().toDateString()
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="h-5 w-5" />
            Bullet Journal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a bullet point..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && addItem()}
              className="flex-1"
            />
            <Button onClick={addItem} disabled={!newItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add tags (comma separated)..."
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && addItem()}
              className="flex-1"
            />
          </div>
          
          <div className="flex gap-2">
            {[
              { type: "task" as const, label: "Task", icon: Circle },
              { type: "event" as const, label: "Event", icon: Square },
              { type: "note" as const, label: "Note", icon: Triangle },
            ].map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {todayItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded border bg-muted/20">
                  <span className="font-mono text-sm w-4 text-center mt-1">
                    <BulletIcon type={item.type} completed={item.completed} />
                  </span>
                  
                  {item.type === "task" ? (
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleTask(item.id)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="w-4" />
                  )}
                  
                  <div className="flex-1 space-y-2">
                    <span className={`block ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                      {item.content}
                    </span>
                    
                    {/* Tags display and management */}
                    <div className="flex flex-wrap gap-1 items-center">
                      {item.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                          <Tag className="h-2 w-2" />
                          {tag}
                          <button
                            onClick={() => removeTagFromItem(item.id, tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        type="text"
                        placeholder="Add tag..."
                        className="text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground w-16"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            const target = e.target as HTMLInputElement;
                            addTagToItem(item.id, target.value);
                            target.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => migrateToCard(item)}
                      disabled={item.type === "migration"}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteItem(item.id)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {olderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previous Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {olderItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded border opacity-75 bg-muted/10">
                  <span className="font-mono text-sm w-4 text-center mt-1">
                    <BulletIcon type={item.type} completed={item.completed} />
                  </span>
                  
                  <span className="text-xs text-muted-foreground mt-1">
                    {item.date.toLocaleDateString()}
                  </span>
                  
                  <div className="flex-1 space-y-2">
                    <span className={`block ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                      {item.content}
                    </span>
                    
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                            <Tag className="h-2 w-2" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => migrateToCard(item)}
                      disabled={item.type === "migration"}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteItem(item.id)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulletJournal;