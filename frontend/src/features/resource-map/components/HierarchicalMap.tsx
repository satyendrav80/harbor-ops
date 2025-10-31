import { useMemo, useState, useCallback, memo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Server, Cloud, Lock, Globe, ExternalLink } from 'lucide-react';
import type { ResourceMapData } from '../../../services/resourceMap';

type HierarchicalMapProps = {
  data: ResourceMapData;
};

type NodeData = {
  label: string;
  type: 'server' | 'service' | 'credential' | 'domain' | 'external-service';
  resourceId: number;
  resourceType: string;
  tags?: Array<{ id: number; name: string; value: string | null }>;
  port?: number;
  serviceType?: string;
  url?: string;
};

const nodeColors = {
  server: '#3b82f6', // blue
  service: '#10b981', // green
  credential: '#f59e0b', // amber
  domain: '#8b5cf6', // purple
  'external-service': '#ec4899', // pink
};

const iconMap = {
  server: Server,
  service: Cloud,
  credential: Lock,
  domain: Globe,
  'external-service': Cloud,
};

const CustomNode = memo(({ data }: { data: NodeData & { highlighted?: boolean } }) => {
  const Icon = iconMap[data.type] || Cloud;
  const isHighlighted = data.highlighted || false;
  
  return (
    <div
      className={`group relative bg-white dark:bg-[#1C252E] border-2 rounded-lg p-3 min-w-[200px] shadow-lg transition-all ${
        isHighlighted
          ? 'shadow-xl scale-105'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
      }`}
      style={{
        borderColor: isHighlighted ? nodeColors[data.type] : undefined,
        backgroundColor: isHighlighted ? `${nodeColors[data.type]}20` : undefined,
      }}
    >
      {/* Connection handles - multiple handles to avoid overlapping edges */}
      <Handle type="target" position={Position.Left} id="top" style={{ background: 'transparent', border: '2px solid #9ca3af', width: '12px', height: '12px', top: '25%' }} />
      <Handle type="target" position={Position.Left} id="middle" style={{ background: 'transparent', border: '2px solid #9ca3af', width: '12px', height: '12px', top: '50%' }} />
      <Handle type="target" position={Position.Left} id="bottom" style={{ background: 'transparent', border: '2px solid #9ca3af', width: '12px', height: '12px', top: '75%' }} />
      <Handle type="source" position={Position.Right} id="top" style={{ background: 'transparent', border: '2px solid #9ca3af', width: '12px', height: '12px', top: '25%' }} />
      <Handle type="source" position={Position.Right} id="middle" style={{ background: 'transparent', border: '2px solid #9ca3af', width: '12px', height: '12px', top: '50%' }} />
      <Handle type="source" position={Position.Right} id="bottom" style={{ background: 'transparent', border: '2px solid #9ca3af', width: '12px', height: '12px', top: '75%' }} />
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon
            className="w-5 h-5 flex-shrink-0"
            style={{ color: nodeColors[data.type] }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
              {data.label}
            </div>
            {data.port && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Port: {data.port}
              </div>
            )}
            {data.serviceType && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {data.serviceType}
              </div>
            )}
            {data.url && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {data.url}
              </div>
            )}
          </div>
        </div>
        <a
          href={getResourceUrl(data.resourceType, data.resourceId)}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all flex-shrink-0"
          title="View in new tab"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </a>
      </div>

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded"
            >
              {tag.name}
              {tag.value && `: ${tag.value}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

function getResourceUrl(type: string, id: number): string {
  switch (type) {
    case 'server':
      return `/servers?serverId=${id}`;
    case 'service':
      return `/services?serviceId=${id}`;
    case 'credential':
      return `/credentials?credentialId=${id}`;
    case 'domain':
      return `/domains`;
    default:
      return '#';
  }
}

// Define nodeTypes outside component as a constant - this is the recommended approach by React Flow
const nodeTypes = {
  custom: CustomNode,
};

/**
 * HierarchicalMap component - renders an interactive flow diagram
 * using React Flow for better visualization
 */
export function HierarchicalMap({ data }: HierarchicalMapProps) {
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Build nodes and edges from resource data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    const nodeIdMap = new Map<string, string>(); // Map resource to node ID
    const nodePositions = new Map<string, { x: number; y: number }>(); // Track node positions
    const edgeCountMap = new Map<string, number>(); // Track number of edges between same source/target pairs

    // Add server nodes
    data.servers.forEach((server, idx) => {
      const nodeId = `server-${server.id}`;
      nodeIdMap.set(`server-${server.id}`, nodeId);
      const yPos = idx * 150;
      nodePositions.set(nodeId, { x: 0, y: yPos });
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: yPos },
        data: {
          label: server.name,
          type: 'server',
          resourceId: server.id,
          resourceType: 'server',
          tags: server.tags?.map((st) => st.tag),
          highlighted: false,
        },
      });
    });

    // Add service nodes (connected to servers)
    let serviceY = 0;
    data.servers.forEach((server) => {
      const serverNodeId = `server-${server.id}`;
      const serverServices = data.services.filter((s) => s.server?.id === server.id);
      
      serverServices.forEach((service, idx) => {
        const nodeId = `service-${service.id}`;
        nodeIdMap.set(`service-${service.id}`, nodeId);
        const yPos = serviceY * 150;
        serviceY++;
        nodePositions.set(nodeId, { x: 300, y: yPos });
        
        nodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: 300, y: yPos },
          data: {
            label: `${service.name}:${service.port}`,
            type: 'service',
            resourceId: service.id,
            resourceType: 'service',
            port: service.port,
            tags: service.tags?.map((st) => st.tag),
            highlighted: false,
          },
        });

        // Connect service to server
        const edgeKey = `${serverNodeId}-${nodeId}`;
        const edgeCount = edgeCountMap.get(edgeKey) || 0;
        edgeCountMap.set(edgeKey, edgeCount + 1);
        
        // Use different handles for overlapping edges
        const handlePositions = ['middle', 'top', 'bottom'];
        const sourceHandle = handlePositions[edgeCount % 3];
        const targetHandle = handlePositions[edgeCount % 3];
        
        edges.push({
          id: `edge-${serverNodeId}-${nodeId}-${edgeCount}`,
          source: serverNodeId,
          target: nodeId,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6b7280', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#6b7280' },
        });

        // Calculate positions for children
        let childYOffset = 0;
        const childrenPerRow = 100; // Spacing between children

        // Add credential nodes (connected to services)
        service.credentials.forEach((sc, credIdx) => {
          const credNodeId = `credential-${sc.credential.id}`;
          if (!nodeIdMap.has(`credential-${sc.credential.id}`)) {
            nodeIdMap.set(`credential-${sc.credential.id}`, credNodeId);
            const credYPos = yPos + childYOffset;
            nodePositions.set(credNodeId, { x: 600, y: credYPos });
            nodes.push({
              id: credNodeId,
              type: 'custom',
              position: { x: 600, y: credYPos },
              data: {
                label: sc.credential.name,
                type: 'credential',
                resourceId: sc.credential.id,
                resourceType: 'credential',
                serviceType: sc.credential.type,
                highlighted: false,
              },
            });
            childYOffset += childrenPerRow;
          } else {
            // If credential already exists, use its position
            const existingPos = nodePositions.get(credNodeId);
            if (existingPos) {
              childYOffset = existingPos.y - yPos + childrenPerRow;
            }
          }

          const edgeKey = `${nodeId}-${credNodeId}`;
          const edgeCount = edgeCountMap.get(edgeKey) || 0;
          edgeCountMap.set(edgeKey, edgeCount + 1);
          
          // Use different handles for overlapping edges
          const handlePositions = ['middle', 'top', 'bottom'];
          const sourceHandle = handlePositions[edgeCount % 3];
          const targetHandle = handlePositions[edgeCount % 3];
          
          edges.push({
            id: `edge-${nodeId}-${credNodeId}-${edgeCount}`,
            source: nodeId,
            target: credNodeId,
            sourceHandle: sourceHandle,
            targetHandle: targetHandle,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#f59e0b', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed', color: '#f59e0b' },
            labelStyle: { fill: '#f59e0b', fontWeight: 600 },
          });
        });

        // Add domain nodes (connected to services) - BEFORE dependencies
        service.domains.forEach((sd, domIdx) => {
          const domainNodeId = `domain-${sd.domain.id}`;
          if (!nodeIdMap.has(`domain-${sd.domain.id}`)) {
            nodeIdMap.set(`domain-${sd.domain.id}`, domainNodeId);
            const domainYPos = yPos + childYOffset;
            nodePositions.set(domainNodeId, { x: 600, y: domainYPos });
            nodes.push({
              id: domainNodeId,
              type: 'custom',
              position: { x: 600, y: domainYPos },
              data: {
                label: sd.domain.name,
                type: 'domain',
                resourceId: sd.domain.id,
                resourceType: 'domain',
                highlighted: false,
              },
            });
            childYOffset += childrenPerRow;
          } else {
            const existingPos = nodePositions.get(domainNodeId);
            if (existingPos) {
              childYOffset = existingPos.y - yPos + childrenPerRow;
            }
          }

          const edgeKey = `${nodeId}-${domainNodeId}`;
          const edgeCount = edgeCountMap.get(edgeKey) || 0;
          edgeCountMap.set(edgeKey, edgeCount + 1);
          
          // Use different handles for overlapping edges
          const handlePositions = ['middle', 'top', 'bottom'];
          const sourceHandle = handlePositions[edgeCount % 3];
          const targetHandle = handlePositions[edgeCount % 3];
          
          edges.push({
            id: `edge-${nodeId}-${domainNodeId}-${edgeCount}`,
            source: nodeId,
            target: domainNodeId,
            sourceHandle: sourceHandle,
            targetHandle: targetHandle,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed', color: '#8b5cf6' },
            labelStyle: { fill: '#8b5cf6', fontWeight: 600 },
          });
        });

        // Add dependency nodes (connected to services) - AFTER domains
        // Internal dependencies (other services)
        const internalDeps = service.dependencies.filter((d) => d.dependencyService);
        internalDeps.forEach((dep, depIdx) => {
          if (dep.dependencyService) {
            const depServiceNodeId = `service-${dep.dependencyService.id}`;
            
            // If dependency service node doesn't exist yet, add it
            if (!nodeIdMap.has(`service-${dep.dependencyService.id}`)) {
              nodeIdMap.set(`service-${dep.dependencyService.id}`, depServiceNodeId);
              const depYPos = yPos + childYOffset;
              nodePositions.set(depServiceNodeId, { x: 600, y: depYPos });
              const depService = data.services.find((s) => s.id === dep.dependencyService!.id);
              
              nodes.push({
                id: depServiceNodeId,
                type: 'custom',
                position: { x: 600, y: depYPos },
                data: {
                  label: `${dep.dependencyService.name}:${dep.dependencyService.port}`,
                  type: 'service',
                  resourceId: dep.dependencyService.id,
                  resourceType: 'service',
                  port: dep.dependencyService.port,
                  tags: depService?.tags?.map((st) => st.tag),
                  highlighted: false,
                },
              });
              childYOffset += childrenPerRow;
            }

            const edgeKey = `${nodeId}-${depServiceNodeId}`;
            const edgeCount = edgeCountMap.get(edgeKey) || 0;
            edgeCountMap.set(edgeKey, edgeCount + 1);
            
            // Use different handles for overlapping edges
            const handlePositions = ['middle', 'top', 'bottom'];
            const sourceHandle = handlePositions[edgeCount % 3];
            const targetHandle = handlePositions[edgeCount % 3];
            
            edges.push({
              id: `edge-${nodeId}-${depServiceNodeId}-dep-${edgeCount}`,
              source: nodeId,
              target: depServiceNodeId,
              sourceHandle: sourceHandle,
              targetHandle: targetHandle,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
              markerEnd: { type: 'arrowclosed', color: '#10b981' },
              labelStyle: { fill: '#10b981', fontWeight: 600 },
            });
          }
        });

        // External dependencies - AFTER internal dependencies
        const externalDeps = service.dependencies.filter((d) => d.externalServiceName);
        externalDeps.forEach((dep, depIdx) => {
          if (dep.externalServiceName) {
            const extDepNodeId = `external-${service.id}-${dep.id}`;
            const extDepYPos = yPos + childYOffset;
            nodePositions.set(extDepNodeId, { x: 600, y: extDepYPos });
            
            nodes.push({
              id: extDepNodeId,
              type: 'custom',
              position: { x: 600, y: extDepYPos },
              data: {
                label: dep.externalServiceName,
                type: 'external-service',
                resourceId: dep.id,
                resourceType: 'external-service',
                serviceType: dep.externalServiceType || undefined,
                url: dep.externalServiceUrl || undefined,
                highlighted: false,
              },
            });
            childYOffset += childrenPerRow;

            const edgeKey = `${nodeId}-${extDepNodeId}`;
            const edgeCount = edgeCountMap.get(edgeKey) || 0;
            edgeCountMap.set(edgeKey, edgeCount + 1);
            
            // Use different handles for overlapping edges
            const handlePositions = ['middle', 'top', 'bottom'];
            const sourceHandle = handlePositions[edgeCount % 3];
            const targetHandle = handlePositions[edgeCount % 3];
            
            edges.push({
              id: `edge-${nodeId}-${extDepNodeId}-${edgeCount}`,
              source: nodeId,
              target: extDepNodeId,
              sourceHandle: sourceHandle,
              targetHandle: targetHandle,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '5,5' },
              markerEnd: { type: 'arrowclosed', color: '#ec4899' },
              labelStyle: { fill: '#ec4899', fontWeight: 600 },
            });
          }
        });
      });
    });

    return { nodes, edges };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initial data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node click - highlight all connected resources
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, clickedNode: Node<NodeData>) => {
      const connectedNodeIds = new Set<string>([clickedNode.id]);
      const connectedEdgeIds = new Set<string>();

      // Find all connected nodes (breadth-first search)
      const queue = [clickedNode.id];
      const visited = new Set<string>([clickedNode.id]);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        
        // Find all edges connected to this node
        initialEdges.forEach((edge) => {
          if (edge.source === currentId && !visited.has(edge.target)) {
            connectedNodeIds.add(edge.target);
            connectedEdgeIds.add(edge.id);
            visited.add(edge.target);
            queue.push(edge.target);
          } else if (edge.target === currentId && !visited.has(edge.source)) {
            connectedNodeIds.add(edge.source);
            connectedEdgeIds.add(edge.id);
            visited.add(edge.source);
            queue.push(edge.source);
          } else if (edge.source === currentId || edge.target === currentId) {
            connectedEdgeIds.add(edge.id);
          }
        });
      }

      setHighlightedNodes(connectedNodeIds);
      setHighlightedEdges(connectedEdgeIds);

      // Update node data to show highlighting
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            highlighted: connectedNodeIds.has(node.id),
          },
        }))
      );

      // Update edge styles - only highlight connected edges, keep others at full opacity
      setEdges((eds) =>
        eds.map((edge) => {
          const sourceNode = initialNodes.find((n) => n.id === edge.source);
          const sourceColor = sourceNode ? nodeColors[sourceNode.data.type] : '#6b7280';
          const isHighlighted = connectedEdgeIds.has(edge.id);
          
          return {
            ...edge,
            style: {
              ...edge.style,
              strokeWidth: isHighlighted ? 4 : 2,
              stroke: isHighlighted ? sourceColor : edge.style?.stroke || '#6b7280',
              opacity: isHighlighted ? 1 : 0.5, // Dim non-highlighted edges slightly
            },
          };
        })
      );
    },
    [initialNodes, initialEdges, setNodes, setEdges]
  );

  const handlePaneClick = useCallback(() => {
    // Clear highlighting when clicking on empty space
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
    setHoveredNodeId(null);
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          highlighted: false,
        },
      }))
    );
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: 2,
          opacity: 1,
        },
      }))
    );
  }, [setNodes, setEdges]);

  // Handle node hover - highlight only directly connected resources (one hop)
  const handleNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      if (hoveredNodeId === node.id) return; // Already processing this node
      
      setHoveredNodeId(node.id);
      
      const connectedNodeIds = new Set<string>([node.id]);
      const connectedEdgeIds = new Set<string>();

      // Find only directly connected nodes (one hop - no recursive traversal)
      initialEdges.forEach((edge) => {
        if (edge.source === node.id) {
          connectedNodeIds.add(edge.target);
          connectedEdgeIds.add(edge.id);
        } else if (edge.target === node.id) {
          connectedNodeIds.add(edge.source);
          connectedEdgeIds.add(edge.id);
        }
      });

      // Update node data to show highlighting
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            highlighted: connectedNodeIds.has(n.id),
          },
        }))
      );

      // Update edge styles
      setEdges((eds) =>
        eds.map((edge) => {
          const sourceNode = initialNodes.find((n) => n.id === edge.source);
          const sourceColor = sourceNode ? nodeColors[sourceNode.data.type] : '#6b7280';
          const isHighlighted = connectedEdgeIds.has(edge.id);
          
          return {
            ...edge,
            style: {
              ...edge.style,
              strokeWidth: isHighlighted ? 3 : 2,
              stroke: isHighlighted ? sourceColor : edge.style?.stroke || '#6b7280',
              opacity: isHighlighted ? 1 : 0.5,
            },
          };
        })
      );
    },
    [initialNodes, initialEdges, setNodes, setEdges, hoveredNodeId]
  );

  // Handle node mouse leave - clear hover highlighting
  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    // Only clear hover highlighting if no node is clicked (highlighted)
    if (highlightedNodes.size === 0) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            highlighted: false,
          },
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          style: {
            ...edge.style,
            strokeWidth: 2,
            opacity: 1,
          },
        }))
      );
    }
  }, [setNodes, setEdges, highlightedNodes]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="top-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        {nodes.length > 0 && (
          <MiniMap
            className="!bg-white dark:!bg-[#1C252E] !border-gray-300 dark:!border-gray-600 dark:!shadow-lg rounded-lg !w-[150px] !h-[100px]"
            nodeStrokeWidth={2}
            nodeColor={(node) => nodeColors[node.data.type]}
            nodeBorderRadius={4}
            maskColor="rgba(0, 0, 0, 0.1)"
            position="bottom-right"
            pannable={false}
            zoomable={false}
          />
        )}
      </ReactFlow>
    </div>
  );
}
