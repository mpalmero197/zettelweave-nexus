import { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  ReactFlowProvider,
  MiniMap,
  BackgroundVariant,
  Panel,
  ConnectionLineType,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Search, Layout, RotateCcw, Maximize2, Minimize2, Link2Off, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useZettelCards } from '@/hooks/useZettelCards';

interface GraphViewProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  onCardUpdate?: (card: ZettelCard) => void;
  className?: string;
}

function GraphViewInner({ cards, onCardSelect, onCardUpdate, className }: GraphViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical' | 'category'>('force');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { autoLinkAll, clearAllLinks, isAutoLinking, isClearingLinks } = useZettelCards();

  // Filter cards based on search
  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards;
    return cards.filter(card =>
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [cards, searchTerm]);

  // Calculate node positions based on layout type
  const getNodePositions = useCallback((cards: ZettelCard[]) => {
    const positions: { [key: string]: { x: number; y: number } } = {};
    const radius = Math.max(300, cards.length * 20);

    switch (layoutType) {
      case 'circular':
        cards.forEach((card, index) => {
          const angle = (index * 2 * Math.PI) / cards.length;
          positions[card.id] = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          };
        });
        break;

      case 'hierarchical':
        // Build a proper hierarchy based on card numbers
        const cardsByLevel: { [level: number]: ZettelCard[] } = {};
        const maxLevel = cards.reduce((max, card) => {
          const level = card.number.split('.').length;
          if (!cardsByLevel[level]) cardsByLevel[level] = [];
          cardsByLevel[level].push(card);
          return Math.max(max, level);
        }, 0);

        // Position cards: parents at top (y=0), children below
        Object.entries(cardsByLevel).forEach(([levelStr, levelCards]) => {
          const level = parseInt(levelStr);
          const cardsInLevel = levelCards.length;
          
          levelCards.forEach((card, index) => {
            positions[card.id] = {
              x: (index - cardsInLevel / 2) * 250,
              y: (level - 1) * 200, // Parents (level 1) at y=0, children below
            };
          });
        });
        break;

      case 'category':
        const categoryGroups: { [key: string]: ZettelCard[] } = {};
        cards.forEach(card => {
          const mainCategory = card.category.charAt(0);
          if (!categoryGroups[mainCategory]) {
            categoryGroups[mainCategory] = [];
          }
          categoryGroups[mainCategory].push(card);
        });

        let categoryIndex = 0;
        Object.entries(categoryGroups).forEach(([category, categoryCards]) => {
          const centerX = (categoryIndex * 400) - (Object.keys(categoryGroups).length * 200);
          const centerY = 0;
          
          categoryCards.forEach((card, index) => {
            const angle = (index * 2 * Math.PI) / categoryCards.length;
            const categoryRadius = Math.max(100, categoryCards.length * 15);
            
            positions[card.id] = {
              x: centerX + Math.cos(angle) * categoryRadius,
              y: centerY + Math.sin(angle) * categoryRadius,
            };
          });
          categoryIndex++;
        });
        break;

      default: // force layout
        cards.forEach((card, index) => {
          positions[card.id] = {
            x: (Math.random() - 0.5) * 800,
            y: (Math.random() - 0.5) * 600,
          };
        });
    }

    return positions;
  }, [layoutType]);

  // Create nodes from cards
  const initialNodes = useMemo(() => {
    const positions = getNodePositions(filteredCards);
    
    return filteredCards.map((card): Node => {
      const categoryInfo = getCategoryInfo(card.category);
      const position = positions[card.id] || { x: 0, y: 0 };

      return {
        id: card.id,
        type: 'default',
        position,
        data: {
          label: (
            <div className="p-3 bg-card border border-border rounded-lg shadow-card hover:shadow-hover transition-all duration-200 max-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ 
                    borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                    color: `hsl(var(--category-${categoryInfo.color}))`
                  }}
                >
                  {card.number}
                </Badge>
              </div>
              <div className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                {card.title}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {card.description || card.content.substring(0, 60) + '...'}
              </div>
              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {card.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )
        },
        style: {
          background: 'transparent',
          border: 'none',
        },
      };
    });
  }, [filteredCards, getNodePositions]);

  // Create edges from card links
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    
    filteredCards.forEach(card => {
      card.linkedCards.forEach(linkedCardId => {
        if (filteredCards.find(c => c.id === linkedCardId)) {
          edges.push({
            id: `${card.id}-${linkedCardId}`,
            source: card.id,
            target: linkedCardId,
            type: 'default',
            style: {
              stroke: 'hsl(var(--primary))',
              strokeWidth: 2,
            },
            animated: true,
          });
        }
      });
    });

    return edges;
  }, [filteredCards]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initialNodes change
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when initialEdges change
  useMemo(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const card = filteredCards.find(c => c.id === node.id);
    if (card && onCardSelect) {
      onCardSelect(card);
    }
  }, [filteredCards, onCardSelect]);

  const onConnect = useCallback((params: any) => {
    const sourceCard = filteredCards.find(c => c.id === params.source);
    const targetCard = filteredCards.find(c => c.id === params.target);
    
    if (sourceCard && targetCard && onCardUpdate) {
      // Only update source card to include link to target (directional link)
      const updatedSourceCard = {
        ...sourceCard,
        linkedCards: [...(sourceCard.linkedCards || []), targetCard.id]
      };
      
      // Immediately add edge to the graph
      const newEdge = {
        id: `${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: 'default',
        style: {
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2,
        },
        animated: true,
      };
      
      setEdges((eds) => [...eds, newEdge]);
      onCardUpdate(updatedSourceCard);
      
      toast(`Linked "${sourceCard.title}" → "${targetCard.title}"`);
    }
  }, [filteredCards, onCardUpdate, setEdges]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    const sourceCard = filteredCards.find(c => c.id === edge.source);
    const targetCard = filteredCards.find(c => c.id === edge.target);
    
    if (sourceCard && targetCard && onCardUpdate) {
      // Remove the link from source card
      const updatedSourceCard = {
        ...sourceCard,
        linkedCards: (sourceCard.linkedCards || []).filter(id => id !== targetCard.id)
      };
      
      onCardUpdate(updatedSourceCard);
      
      toast(`Unlinked "${sourceCard.title}" from "${targetCard.title}"`);
      
      // Remove the edge from the graph
      setEdges((eds) => eds.filter(e => e.id !== edge.id));
    }
  }, [filteredCards, onCardUpdate, setEdges]);

  const resetLayout = useCallback(() => {
    const positions = getNodePositions(filteredCards);
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        position: positions[node.id] || { x: 0, y: 0 },
      }))
    );
  }, [filteredCards, getNodePositions, setNodes]);

  const handleAutoLink = useCallback(() => {
    autoLinkAll();
  }, [autoLinkAll]);

  const handleClearAllLinks = useCallback(() => {
    clearAllLinks();
  }, [clearAllLinks]);

  return (
    <div className={cn(
      "relative w-full h-full bg-background border border-border rounded-xl overflow-hidden shadow-card",
      isFullscreen && "fixed inset-0 z-50 rounded-none",
      className
    )}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-background"
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="hsl(var(--border))"
        />
        
        <Controls 
          className="bg-card border border-border rounded-lg shadow-card"
          showInteractive={false}
        />
        
        <MiniMap 
          className="bg-card border border-border rounded-lg shadow-card"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--muted) / 0.1)"
        />

        {/* Search and Controls Panel */}
        <Panel position="top-left" className="bg-transparent">
          <div className="bg-card/80 backdrop-blur-md border border-border rounded-lg shadow-card p-4 space-y-3 min-w-[300px]">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-background/50"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <Select value={layoutType} onValueChange={(value: any) => setLayoutType(value)}>
                <SelectTrigger className="flex-1 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force Layout</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetLayout}
                className="flex-1 bg-background/50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Layout
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="bg-background/50"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAutoLink}
                disabled={isAutoLinking}
                className="flex-1 bg-background/50"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Auto Link
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearAllLinks}
                disabled={isClearingLinks}
                className="flex-1 bg-background/50"
              >
                <Link2Off className="h-4 w-4 mr-2" />
                Clear Links
              </Button>
            </div>
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right" className="bg-transparent">
          <div className="bg-card/80 backdrop-blur-md border border-border rounded-lg shadow-card p-4">
            <div className="text-sm space-y-1">
              <div className="font-medium text-foreground">Graph Stats</div>
              <div className="text-muted-foreground">
                {filteredCards.length} cards • {initialEdges.length} connections
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}