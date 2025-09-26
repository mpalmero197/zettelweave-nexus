import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Circle, Square, Triangle, ArrowRight } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface BulletItem {
  id: string;
  type: "task" | "event" | "note" | "migration";
  content: string;
  completed?: boolean;
  date: Date;
}

interface BulletJournalProps {
  onCreateCard?: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
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

export const BulletJournal = ({ onCreateCard }: BulletJournalProps) => {
  const [items, setItems] = useState<BulletItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [selectedType, setSelectedType] = useState<BulletItem["type"]>("task");

  const addItem = () => {
    if (!newItem.trim()) return;

    const item: BulletItem = {
      id: crypto.randomUUID(),
      type: selectedType,
      content: newItem,
      completed: false,
      date: new Date()
    };

    setItems(prev => [item, ...prev]);
    setNewItem("");
    toast("Bullet journal item added");
  };

  const toggleTask = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const migrateToCard = (item: BulletItem) => {
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: item.content.length > 50 ? item.content.substring(0, 50) + "..." : item.content,
      content: `# ${item.type.toUpperCase()}\n\n${item.content}\n\n*Migrated from bullet journal on ${item.date.toLocaleDateString()}*`,
      description: `Bullet journal ${item.type}`,
      category: "000",
      number: "",
      tags: ["bullet-journal", item.type],
      linkedCards: []
    };

    onCreateCard(newCard);
    
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
              onKeyPress={(e) => e.key === "Enter" && addItem()}
              className="flex-1"
            />
            <Button onClick={addItem} disabled={!newItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
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
                <div key={item.id} className="flex items-center gap-3 p-2 rounded border">
                  <span className="font-mono text-sm w-4 text-center">
                    <BulletIcon type={item.type} completed={item.completed} />
                  </span>
                  
                  {item.type === "task" ? (
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleTask(item.id)}
                    />
                  ) : (
                    <div className="w-4" />
                  )}
                  
                  <span className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                    {item.content}
                  </span>
                  
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
                <div key={item.id} className="flex items-center gap-3 p-2 rounded border opacity-75">
                  <span className="font-mono text-sm w-4 text-center">
                    <BulletIcon type={item.type} completed={item.completed} />
                  </span>
                  
                  <span className="text-xs text-muted-foreground">
                    {item.date.toLocaleDateString()}
                  </span>
                  
                  <span className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                    {item.content}
                  </span>
                  
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