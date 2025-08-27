import { useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Node, 
  Edge, 
  addEdge, 
  useNodesState, 
  useEdgesState, 
  Controls, 
  Background, 
  MiniMap,
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';

interface GraphViewProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  className?: string;
}

export function GraphView({ cards, onCardSelect, className }: GraphViewProps) {
  // Convert cards to nodes
  const initialNodes: Node[] = useMemo(() => {
    return cards.map((card, index) => {
      const categoryInfo = getCategoryInfo(card.category);
      const angle = (index / cards.length) * 2 * Math.PI;
      const radius = Math.min(400, cards.length * 30);
      
      return {
        id: card.id,
        type: 'default',
        position: {
          x: Math.cos(angle) * radius + 400,
          y: Math.sin(angle) * radius + 300
        },
        data: {
          label: (
            <div className="text-center max-w-[200px]">
              <div className="text-xs font-mono mb-1" style={{ color: `hsl(var(--category-${categoryInfo.color}))` }}>
                {card.number}
              </div>
              <div className="font-medium text-sm leading-tight">
                {card.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {card.tags.slice(0, 2).join(', ')}
              </div>
            </div>
          )
        },
        style: {
          background: `linear-gradient(135deg, white, hsl(var(--category-${categoryInfo.color}) / 0.1))`,
          border: `2px solid hsl(var(--category-${categoryInfo.color}))`,
          borderRadius: '8px',
          padding: '8px',
          minWidth: '160px',
          fontSize: '12px'
        }
      };
    });
  }, [cards]);

  // Convert links to edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    
    cards.forEach(card => {
      card.linkedCards.forEach(linkedId => {
        const targetCard = cards.find(c => c.id === linkedId);
        if (targetCard) {
          edges.push({
            id: `${card.id}-${linkedId}`,
            source: card.id,
            target: linkedId,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: 'hsl(var(--primary))',
              strokeWidth: 2,
              strokeOpacity: 0.6
            },
            label: 'linked'
          });
        }
      });
    });

    // Add category-based connections (weaker links)
    const categoryGroups: Record<string, ZettelCard[]> = {};
    cards.forEach(card => {
      const mainCategory = card.category.substring(0, 1) + '00';
      if (!categoryGroups[mainCategory]) {
        categoryGroups[mainCategory] = [];
      }
      categoryGroups[mainCategory].push(card);
    });

    Object.values(categoryGroups).forEach(group => {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < Math.min(i + 3, group.length); j++) {
            const sourceCard = group[i];
            const targetCard = group[j];
            
            // Only add if not already explicitly linked
            const explicitLink = edges.find(e => 
              (e.source === sourceCard.id && e.target === targetCard.id) ||
              (e.source === targetCard.id && e.target === sourceCard.id)
            );
            
            if (!explicitLink) {
              edges.push({
                id: `category-${sourceCard.id}-${targetCard.id}`,
                source: sourceCard.id,
                target: targetCard.id,
                type: 'smoothstep',
                animated: false,
                style: {
                  stroke: 'hsl(var(--muted-foreground))',
                  strokeWidth: 1,
                  strokeOpacity: 0.3,
                  strokeDasharray: '5,5'
                }
              });
            }
          }
        }
      }
    });

    return edges;
  }, [cards]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const card = cards.find(c => c.id === node.id);
    if (card && onCardSelect) {
      onCardSelect(card);
    }
  }, [cards, onCardSelect]);

  const nodeClassName = useCallback((node: Node) => {
    return 'transition-all duration-200 hover:shadow-hover cursor-pointer';
  }, []);

  return (
    <div className={`h-full w-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="bg-background"
      >
        <Background color="hsl(var(--border))" gap={20} />
        <Controls className="bg-card border border-border" />
        <MiniMap 
          nodeClassName={nodeClassName}
          className="bg-card border border-border"
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
}