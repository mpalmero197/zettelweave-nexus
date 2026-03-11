import { useState } from "react";
import { useSpaces, useSpaceData } from "@/hooks/useSpaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, ArrowLeft, Star, Trash2, MoreHorizontal, Search,
  Loader2, LayoutGrid, List, Columns, GalleryHorizontalEnd,
  Settings2, Box, Layers, Filter, Edit2, Archive,
} from "lucide-react";
import type { Space, ObjectType, SpaceObject, ObjectSet } from "@/types/spaces";
import { RELATION_TYPE_LABELS, type RelationType } from "@/types/spaces";

// ─── Emoji Picker (simple) ─────────────────────────────────────
const SPACE_ICONS = ['🏠', '🚀', '💼', '📚', '🎨', '🧠', '🔬', '🎯', '🌍', '💡', '📐', '🎵', '🏗️', '✨', '🔮', '🌱'];
const TYPE_ICONS = ['📄', '✅', '🔖', '📝', '👤', '📁', '🎯', '💡', '📊', '🔗', '📌', '🗂️', '📋', '🎫', '🏷️', '💬'];

export function SpacesHub() {
  const { spaces, loading, createSpace, deleteSpace, updateSpace } = useSpaces();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🏠");
  const [newDesc, setNewDesc] = useState("");

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId) || null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const space = await createSpace(newName.trim(), newIcon, newDesc.trim());
    if (space) {
      setSelectedSpaceId(space.id);
      setShowCreate(false);
      setNewName("");
      setNewIcon("🏠");
      setNewDesc("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Inside a space
  if (selectedSpace) {
    return (
      <SpaceView
        space={selectedSpace}
        onBack={() => setSelectedSpaceId(null)}
        onDelete={() => { deleteSpace(selectedSpace.id); setSelectedSpaceId(null); }}
        onUpdate={(updates) => updateSpace(selectedSpace.id, updates)}
      />
    );
  }

  // Space list
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Spaces</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize your knowledge into separate workspaces</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />Space
        </Button>
      </div>

      {spaces.length === 0 ? (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="py-16 text-center">
            <Box className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-foreground mb-1">No spaces yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first space to organize objects, types, and relations</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Create Space
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map(space => (
            <Card key={space.id}
              className="border-border/50 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => setSelectedSpaceId(space.id)}>
              <CardContent className="pt-5 pb-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{space.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground leading-snug">{space.name}</h3>
                      {space.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{space.description}</p>
                      )}
                    </div>
                  </div>
                  {space.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add space card */}
          <Card className="border-dashed border-2 border-border/40 hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => setShowCreate(true)}>
            <CardContent className="py-10 text-center">
              <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">New Space</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Space</DialogTitle>
            <DialogDescription>A space is a workspace for your objects, types, and relations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {SPACE_ICONS.map(icon => (
                  <button key={icon}
                    className={`text-xl p-1.5 rounded-md transition-colors ${newIcon === icon ? 'bg-primary/15 ring-2 ring-primary/30' : 'hover:bg-muted'}`}
                    onClick={() => setNewIcon(icon)}>{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Space" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What is this space for?" rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full">Create Space</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Space View ─────────────────────────────────────────────────
function SpaceView({ space, onBack, onDelete, onUpdate }: {
  space: Space;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (u: Partial<Pick<Space, 'name' | 'icon' | 'description'>>) => void;
}) {
  const {
    objectTypes, relations, objects, sets, widgets, loading,
    createObject, updateObject, deleteObject,
    createObjectType, deleteObjectType,
    createSet, deleteSet,
    reload,
  } = useSpaceData(space.id);

  const [activeView, setActiveView] = useState<'home' | 'objects' | 'types' | 'sets'>('home');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateObj, setShowCreateObj] = useState(false);
  const [showCreateType, setShowCreateType] = useState(false);
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [newObjName, setNewObjName] = useState('');
  const [newObjType, setNewObjType] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('📄');
  const [newSetName, setNewSetName] = useState('');
  const [newSetType, setNewSetType] = useState('');
  const [newSetView, setNewSetView] = useState<'grid' | 'list' | 'kanban' | 'gallery'>('grid');
  const [editingObj, setEditingObj] = useState<SpaceObject | null>(null);
  const [editContent, setEditContent] = useState('');

  const filteredObjects = objects.filter(o => {
    if (filterType !== 'all' && o.object_type_id !== filterType) return false;
    if (searchQuery && !o.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const favoriteObjects = objects.filter(o => o.is_favorite);
  const recentObjects = objects.slice(0, 8);

  const getTypeName = (typeId: string) => objectTypes.find(t => t.id === typeId)?.name || '';
  const getTypeIcon = (typeId: string) => objectTypes.find(t => t.id === typeId)?.icon || '📄';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-2xl">{space.icon}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{space.name}</h1>
          {space.description && <p className="text-xs text-muted-foreground truncate">{space.description}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={reload}>Refresh</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete Space</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* View tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'home', label: 'Home', icon: LayoutGrid },
          { id: 'objects', label: `Objects (${objects.length})`, icon: Box },
          { id: 'types', label: `Types (${objectTypes.length})`, icon: Layers },
          { id: 'sets', label: `Sets (${sets.length})`, icon: Filter },
        ].map(tab => (
          <Button key={tab.id} size="sm"
            variant={activeView === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveView(tab.id as any)}
            className="gap-1.5 shrink-0">
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ─── Home View ─── */}
      {activeView === 'home' && (
        <div className="space-y-6">
          {/* Favorites widget */}
          {favoriteObjects.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500" />Favorites
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {favoriteObjects.map(obj => (
                  <ObjectCard key={obj.id} obj={obj} getTypeIcon={getTypeIcon} getTypeName={getTypeName}
                    onToggleFav={() => updateObject(obj.id, { is_favorite: !obj.is_favorite })}
                    onEdit={() => { setEditingObj(obj); setEditContent(obj.content); }}
                    onDelete={() => deleteObject(obj.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Recent widget */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Recent</h3>
            {recentObjects.length === 0 ? (
              <Card className="border-dashed border-border/60">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No objects yet. Create one to get started.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowCreateObj(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Create Object
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {recentObjects.map(obj => (
                  <ObjectCard key={obj.id} obj={obj} getTypeIcon={getTypeIcon} getTypeName={getTypeName}
                    onToggleFav={() => updateObject(obj.id, { is_favorite: !obj.is_favorite })}
                    onEdit={() => { setEditingObj(obj); setEditContent(obj.content); }}
                    onDelete={() => deleteObject(obj.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Sets widget */}
          {sets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />Sets
              </h3>
              <div className="flex flex-wrap gap-2">
                {sets.map(set => (
                  <Badge key={set.id} variant="outline" className="cursor-pointer hover:bg-primary/10 gap-1.5 py-1.5 px-3"
                    onClick={() => setActiveView('sets')}>
                    <span>{set.icon}</span>
                    {set.name}
                    <span className="text-[10px] text-muted-foreground">
                      {set.view_type === 'grid' ? <LayoutGrid className="h-3 w-3" /> :
                       set.view_type === 'list' ? <List className="h-3 w-3" /> :
                       set.view_type === 'kanban' ? <Columns className="h-3 w-3" /> :
                       <GalleryHorizontalEnd className="h-3 w-3" />}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => setShowCreateObj(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Object
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreateSet(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Set
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreateType(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Type
            </Button>
          </div>
        </div>
      )}

      {/* ─── Objects View ─── */}
      {activeView === 'objects' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search objects…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {objectTypes.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.icon} {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" onClick={() => setShowCreateObj(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />New
            </Button>
          </div>

          {filteredObjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Box className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{searchQuery ? 'No matching objects' : 'No objects yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredObjects.map(obj => (
                <ObjectCard key={obj.id} obj={obj} getTypeIcon={getTypeIcon} getTypeName={getTypeName}
                  onToggleFav={() => updateObject(obj.id, { is_favorite: !obj.is_favorite })}
                  onEdit={() => { setEditingObj(obj); setEditContent(obj.content); }}
                  onDelete={() => deleteObject(obj.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Types View ─── */}
      {activeView === 'types' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Object types define the structure of your objects</p>
            <Button size="sm" className="h-8" onClick={() => setShowCreateType(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Type
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {objectTypes.map(type => {
              const count = objects.filter(o => o.object_type_id === type.id).length;
              return (
                <Card key={type.id} className="border-border/50">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{type.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{type.name}</p>
                        <p className="text-[10px] text-muted-foreground">{count} object{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {type.is_builtin && <Badge variant="secondary" className="text-[9px]">Built-in</Badge>}
                      {!type.is_builtin && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => deleteObjectType(type.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Relations */}
          <div className="pt-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Relations</h3>
            <p className="text-xs text-muted-foreground mb-3">Properties that can be attached to objects</p>
            <div className="space-y-1.5">
              {relations.map(rel => (
                <div key={rel.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/30">
                  <span className="text-xs font-medium text-foreground flex-1">{rel.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {RELATION_TYPE_LABELS[rel.relation_type as RelationType] || rel.relation_type}
                  </Badge>
                  {rel.is_builtin && <Badge variant="secondary" className="text-[9px]">Built-in</Badge>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Sets View ─── */}
      {activeView === 'sets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Sets are filtered views of your objects</p>
            <Button size="sm" className="h-8" onClick={() => setShowCreateSet(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Set
            </Button>
          </div>
          {sets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No sets yet. Create one to filter and view objects.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sets.map(set => {
                const setObjects = objects.filter(o => !set.object_type_id || o.object_type_id === set.object_type_id);
                const viewIcon = set.view_type === 'grid' ? LayoutGrid :
                                 set.view_type === 'list' ? List :
                                 set.view_type === 'kanban' ? Columns : GalleryHorizontalEnd;
                const ViewIcon = viewIcon;
                return (
                  <Card key={set.id} className="border-border/50">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{set.icon}</span>
                          <h4 className="text-sm font-medium text-foreground">{set.name}</h4>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <ViewIcon className="h-2.5 w-2.5" />{set.view_type}
                          </Badge>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => deleteSet(set.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Inline set rendering */}
                      {setObjects.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No matching objects</p>
                      ) : set.view_type === 'list' ? (
                        <div className="space-y-1">
                          {setObjects.slice(0, 10).map(obj => (
                            <div key={obj.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                              <span>{getTypeIcon(obj.object_type_id)}</span>
                              <span className="flex-1 truncate font-medium">{obj.name}</span>
                              <span className="text-muted-foreground">{getTypeName(obj.object_type_id)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {setObjects.slice(0, 6).map(obj => (
                            <div key={obj.id} className="flex items-center gap-1.5 text-xs px-2 py-2 rounded-md bg-muted/30 border border-border/20">
                              <span>{getTypeIcon(obj.object_type_id)}</span>
                              <span className="truncate font-medium">{obj.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {setObjects.length > (set.view_type === 'list' ? 10 : 6) && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          +{setObjects.length - (set.view_type === 'list' ? 10 : 6)} more
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Create Object Dialog ─── */}
      <Dialog open={showCreateObj} onOpenChange={setShowCreateObj}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Object</DialogTitle>
            <DialogDescription>Add a new object to this space</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Type</label>
              <Select value={newObjType || ''} onValueChange={setNewObjType}>
                <SelectTrigger><SelectValue placeholder="Choose a type" /></SelectTrigger>
                <SelectContent>
                  {objectTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input value={newObjName} onChange={e => setNewObjName(e.target.value)} placeholder="Untitled" autoFocus />
            </div>
            <Button disabled={!newObjType || !newObjName.trim()} className="w-full"
              onClick={async () => {
                await createObject(newObjType, newObjName.trim());
                setShowCreateObj(false);
                setNewObjName('');
                setNewObjType('');
              }}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create Type Dialog ─── */}
      <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Object Type</DialogTitle>
            <DialogDescription>Define a new type of object for this space</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_ICONS.map(icon => (
                  <button key={icon}
                    className={`text-xl p-1.5 rounded-md transition-colors ${newTypeIcon === icon ? 'bg-primary/15 ring-2 ring-primary/30' : 'hover:bg-muted'}`}
                    onClick={() => setNewTypeIcon(icon)}>{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Recipe, Movie, Idea" autoFocus />
            </div>
            <Button disabled={!newTypeName.trim()} className="w-full"
              onClick={async () => {
                await createObjectType(newTypeName.trim(), newTypeIcon);
                setShowCreateType(false);
                setNewTypeName('');
                setNewTypeIcon('📄');
              }}>Create Type</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create Set Dialog ─── */}
      <Dialog open={showCreateSet} onOpenChange={setShowCreateSet}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Set</DialogTitle>
            <DialogDescription>A set is a filtered view of objects by type</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="e.g. My Tasks, Reading List" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Filter by Type</label>
              <Select value={newSetType || 'all'} onValueChange={v => setNewSetType(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {objectTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">View</label>
              <div className="flex gap-2">
                {(['grid', 'list', 'kanban', 'gallery'] as const).map(v => (
                  <Button key={v} size="sm" variant={newSetView === v ? 'default' : 'outline'}
                    onClick={() => setNewSetView(v)} className="capitalize gap-1">
                    {v === 'grid' ? <LayoutGrid className="h-3 w-3" /> :
                     v === 'list' ? <List className="h-3 w-3" /> :
                     v === 'kanban' ? <Columns className="h-3 w-3" /> :
                     <GalleryHorizontalEnd className="h-3 w-3" />}
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <Button disabled={!newSetName.trim()} className="w-full"
              onClick={async () => {
                await createSet(newSetName.trim(), newSetType || undefined, newSetView);
                setShowCreateSet(false);
                setNewSetName('');
                setNewSetType('');
                setNewSetView('grid');
              }}>Create Set</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Object Sheet ─── */}
      <Sheet open={!!editingObj} onOpenChange={open => !open && setEditingObj(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {editingObj && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span>{getTypeIcon(editingObj.object_type_id)}</span>
                  {editingObj.name}
                </SheetTitle>
                <SheetDescription>
                  {getTypeName(editingObj.object_type_id)} · Created {new Date(editingObj.created_at).toLocaleDateString()}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
                  <Input value={editingObj.name}
                    onChange={e => {
                      const name = e.target.value;
                      setEditingObj({ ...editingObj, name });
                      updateObject(editingObj.id, { name });
                    }} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Content</label>
                  <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8}
                    placeholder="Write something…"
                    onBlur={() => updateObject(editingObj.id, { content: editContent })} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline"
                    onClick={() => updateObject(editingObj.id, { is_favorite: !editingObj.is_favorite })}>
                    <Star className={`h-3.5 w-3.5 mr-1 ${editingObj.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                    {editingObj.is_favorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => { updateObject(editingObj.id, { is_archived: true }); setEditingObj(null); }}>
                    <Archive className="h-3.5 w-3.5 mr-1" />Archive
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive"
                    onClick={() => { deleteObject(editingObj.id); setEditingObj(null); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Object Card ────────────────────────────────────────────────
function ObjectCard({ obj, getTypeIcon, getTypeName, onToggleFav, onEdit, onDelete }: {
  obj: SpaceObject;
  getTypeIcon: (id: string) => string;
  getTypeName: (id: string) => string;
  onToggleFav: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
      onClick={onEdit}>
      <CardContent className="py-3 px-3.5 space-y-1.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base shrink-0">{obj.icon || getTypeIcon(obj.object_type_id)}</span>
            <h4 className="text-xs font-medium text-foreground truncate">{obj.name || 'Untitled'}</h4>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-0.5" onClick={e => { e.stopPropagation(); onToggleFav(); }}>
              <Star className={`h-3 w-3 ${obj.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
            </button>
          </div>
        </div>
        {obj.content && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{obj.content}</p>
        )}
        <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0">
          {getTypeIcon(obj.object_type_id)} {getTypeName(obj.object_type_id)}
        </Badge>
      </CardContent>
    </Card>
  );
}
