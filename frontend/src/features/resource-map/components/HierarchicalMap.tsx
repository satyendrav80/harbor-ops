import { useMemo, useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { ResourceMapData } from '../../../services/resourceMap';
import { nodeTypes, nodeColors, type NodeData } from './nodeTypes';

type HierarchicalMapProps = {
  data: ResourceMapData;
};

/**
 * HierarchicalMap component - renders an interactive flow diagram
 * Structure: Server → Services Group → Resource Groups (stacked vertically)
 */
export function HierarchicalMap({ data }: HierarchicalMapProps) {
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Build nodes and edges from resource data
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();

    // Layout constants
    const serverX = 0;
    const servicesGroupX = 300;
    const resourceGroupsX = 650;
    const serverVerticalSpacing = 400;
    const serviceNodeHeight = 80;
    const serviceVerticalSpacing = 10;
    const groupPadding = 12;
    const groupHeaderHeight = 42;
    const groupSpacing = 30;
    const resourceNodeHeight = 60;
    const resourceVerticalSpacing = 8;

    let currentServerY = 0;

    // Process each server
    data.servers.forEach((server) => {
      const serverNodeId = `server-${server.id}`;
      const serverServices = data.services.filter((s) => 
        s.servers?.some((ss) => ss.server.id === server.id)
      );

      // Check if server has any resources (services, credentials, or domains)
      const hasServerCredentials = server.credentials && server.credentials.length > 0;
      const hasServerDomains = server.domains && server.domains.length > 0;
      const hasResources = serverServices.length > 0 || hasServerCredentials || hasServerDomains;

      if (!hasResources) {
        return; // Skip servers with no resources at all
      }

      // Position server
      const serverY = currentServerY;
      nodes.push({
        id: serverNodeId,
        type: 'custom',
        position: { x: serverX, y: serverY },
        data: {
          label: server.name,
          type: 'server',
          resourceId: server.id,
          resourceType: 'server',
          tags: server.tags?.map((st) => st.tag),
          highlighted: false,
        },
      });

      // Create Services Group containing all services for this server (if any)
      let servicesGroupId: string | null = null;
      let servicesGroupHeight = 0;
      if (serverServices.length > 0) {
        servicesGroupId = `services-group-${server.id}`;
        servicesGroupHeight = groupHeaderHeight + groupPadding + 
          (serverServices.length * (serviceNodeHeight + serviceVerticalSpacing)) - serviceVerticalSpacing + groupPadding;
        
        nodes.push({
          id: servicesGroupId,
          type: 'group',
          position: { x: servicesGroupX, y: serverY },
          data: {
            label: 'Services',
            type: 'group',
            groupType: 'dependencies', // Use dependencies styling (green) for services group
            childCount: serverServices.length,
            highlighted: false,
          },
          style: {
            width: 280,
            height: servicesGroupHeight,
          },
        });

        // Add service nodes inside the services group
        // Use unique IDs per server to handle services on multiple servers
        serverServices.forEach((service, idx) => {
          const serviceNodeId = `service-${server.id}-${service.id}`;
          const serviceY = groupHeaderHeight + groupPadding + idx * (serviceNodeHeight + serviceVerticalSpacing);
          
          nodes.push({
            id: serviceNodeId,
            type: 'custom',
            position: { x: groupPadding, y: serviceY },
            parentId: servicesGroupId,
            extent: 'parent',
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
        });

        // Connect server to services group
        edges.push({
          id: `edge-${serverNodeId}-${servicesGroupId}`,
          source: serverNodeId,
          target: servicesGroupId!,
          sourceHandle: 'right',
          targetHandle: 'middle',
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: '#94a3b8', 
            strokeWidth: 2,
            opacity: 0.7,
          },
          markerEnd: { 
            type: 'arrowclosed', 
            color: '#94a3b8',
            width: 20,
            height: 20,
          },
        });
      }

      // Aggregate all resources from server and its services
      // First, get credentials and domains directly associated with the server
      const allCredentials = new Map<number, { credential: { id: number; name: string; type: string } }>();
      const allDomains = new Map<number, { domain: { id: number; name: string } }>();
      const allDependencies: Array<{
        id: number;
        dependencyServiceId: number | null;
        dependencyService: {
          id: number;
          name: string;
          port: number;
        } | null;
        externalServiceName: string | null;
        externalServiceType: string | null;
        externalServiceUrl: string | null;
      }> = [];

      // Add server-level credentials
      server.credentials?.forEach((sc) => {
        if (!allCredentials.has(sc.credential.id)) {
          allCredentials.set(sc.credential.id, sc);
        }
      });

      // Add server-level domains
      server.domains?.forEach((sd) => {
        if (!allDomains.has(sd.domain.id)) {
          allDomains.set(sd.domain.id, sd);
        }
      });

      // Add credentials, domains, and dependencies from all services on this server
      serverServices.forEach((service) => {
        // Handle credentials
        if (service.credentials && Array.isArray(service.credentials)) {
          service.credentials.forEach((sc) => {
            if (sc?.credential && !allCredentials.has(sc.credential.id)) {
              allCredentials.set(sc.credential.id, sc);
            }
          });
        }
        
        // Handle domains
        if (service.domains && Array.isArray(service.domains)) {
          service.domains.forEach((sd) => {
            if (sd?.domain && !allDomains.has(sd.domain.id)) {
              allDomains.set(sd.domain.id, sd);
            }
          });
        }
        
        // Handle dependencies
        if (service.dependencies && Array.isArray(service.dependencies)) {
          service.dependencies.forEach((dep) => {
            // Only add if it's a valid dependency (has dependencyService or externalServiceName)
            // Check for dependencyService (internal dependency) or externalServiceName (external dependency)
            const hasInternalDep = dep?.dependencyService && dep.dependencyService.id;
            const hasExternalDep = dep?.externalServiceName && dep.externalServiceName.trim().length > 0;
            
            if (dep && (hasInternalDep || hasExternalDep)) {
              allDependencies.push(dep);
            }
          });
        }
      });
      // Position resource groups vertically (stacked)
      let resourceGroupY = serverY;
      let resourceGroupYOffset = 0;

      // Dependencies Group (first, at top)
      // Filter out invalid dependencies (must have valid dependencyService or externalServiceName)
      // Note: allDependencies should already be filtered, but filter again to be safe
      const validDependencies = allDependencies.filter((dep) => {
        if (!dep) return false;
        const hasInternalDep = dep.dependencyService && dep.dependencyService.id;
        const hasExternalDep = dep.externalServiceName && dep.externalServiceName.trim().length > 0;
        return hasInternalDep || hasExternalDep;
      });
      if (validDependencies.length > 0) {
        const depsGroupId = `deps-group-${server.id}`;
        const depsGroupHeight = groupHeaderHeight + groupPadding + 
          (validDependencies.length * (resourceNodeHeight + resourceVerticalSpacing)) - resourceVerticalSpacing + groupPadding;
        
        nodes.push({
          id: depsGroupId,
          type: 'group',
          position: { x: resourceGroupsX, y: resourceGroupY + resourceGroupYOffset },
          data: {
            label: 'Dependencies',
            type: 'group',
            groupType: 'dependencies',
            childCount: validDependencies.length,
            highlighted: false,
          },
          style: {
            width: 280,
            height: depsGroupHeight,
          },
        });

        // Add dependency nodes
        validDependencies.forEach((dep, idx) => {
          const depY = groupHeaderHeight + groupPadding + idx * (resourceNodeHeight + resourceVerticalSpacing);
          let depNodeId: string;
          let depLabel: string;
          let depType: NodeData['type'];

          if (dep.dependencyService) {
            depNodeId = `dep-service-${server.id}-${dep.dependencyService.id}`;
            depLabel = `${dep.dependencyService.name}:${dep.dependencyService.port}`;
            depType = 'service';
          } else if (dep.externalServiceName) {
            depNodeId = `dep-external-${server.id}-${dep.id}`;
            depLabel = dep.externalServiceName || 'Unknown External Service';
            depType = 'external-service';
          } else {
            // This shouldn't happen since we filtered, but handle it just in case
            return;
          }

          nodes.push({
            id: depNodeId,
            type: 'custom',
            position: { x: groupPadding, y: depY },
            parentId: depsGroupId,
            extent: 'parent',
            data: {
              label: depLabel,
              type: depType,
              resourceId: dep.dependencyService?.id || dep.id,
              resourceType: depType,
              serviceType: dep.externalServiceType || undefined,
              url: dep.externalServiceUrl || undefined,
              highlighted: false,
            },
          });
        });

        // Connect services group (or server if no services) to dependencies group
        edges.push({
          id: `edge-${servicesGroupId || serverNodeId}-${depsGroupId}`,
          source: servicesGroupId || serverNodeId,
          target: depsGroupId,
          sourceHandle: servicesGroupId ? 'right' : 'right',
          targetHandle: 'middle',
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: '#10b981', 
            strokeWidth: 2,
            strokeDasharray: '5,5',
            opacity: 0.8,
          },
          markerEnd: { 
            type: 'arrowclosed', 
            color: '#10b981',
            width: 18,
            height: 18,
          },
        });

        resourceGroupYOffset += depsGroupHeight + groupSpacing;
      }

      // Credentials Group
      if (allCredentials.size > 0) {
        const credsGroupId = `creds-group-${server.id}`;
        const credsGroupHeight = groupHeaderHeight + groupPadding + 
          (allCredentials.size * (resourceNodeHeight + resourceVerticalSpacing)) - resourceVerticalSpacing + groupPadding;
        
        nodes.push({
          id: credsGroupId,
          type: 'group',
          position: { x: resourceGroupsX, y: resourceGroupY + resourceGroupYOffset },
          data: {
            label: 'Credentials',
            type: 'group',
            groupType: 'credentials',
            childCount: allCredentials.size,
            highlighted: false,
          },
          style: {
            width: 280,
            height: credsGroupHeight,
          },
        });

        // Add credential nodes
        Array.from(allCredentials.values()).forEach((cred, idx) => {
          const credY = groupHeaderHeight + groupPadding + idx * (resourceNodeHeight + resourceVerticalSpacing);
          const credential = data.credentials.find((c) => c.id === cred.credential.id);
          
          nodes.push({
            id: `cred-${server.id}-${cred.credential.id}`,
            type: 'custom',
            position: { x: groupPadding, y: credY },
            parentId: credsGroupId,
            extent: 'parent',
            data: {
              label: credential?.name || cred.credential.name,
              type: 'credential',
              resourceId: cred.credential.id,
              resourceType: 'credential',
              serviceType: credential?.type,
              highlighted: false,
            },
          });
        });

        // Connect services group (or server if no services) to credentials group
        edges.push({
          id: `edge-${servicesGroupId || serverNodeId}-${credsGroupId}`,
          source: servicesGroupId || serverNodeId,
          target: credsGroupId,
          sourceHandle: servicesGroupId ? 'right' : 'right',
          targetHandle: 'middle',
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: '#f59e0b', 
            strokeWidth: 2,
            opacity: 0.8,
          },
          markerEnd: { 
            type: 'arrowclosed', 
            color: '#f59e0b',
            width: 18,
            height: 18,
          },
        });

        resourceGroupYOffset += credsGroupHeight + groupSpacing;
      }

      // Domains Group (last, at bottom)
      if (allDomains.size > 0) {
        const domainsGroupId = `domains-group-${server.id}`;
        const domainsGroupHeight = groupHeaderHeight + groupPadding + 
          (allDomains.size * (resourceNodeHeight + resourceVerticalSpacing)) - resourceVerticalSpacing + groupPadding;
        
        nodes.push({
          id: domainsGroupId,
          type: 'group',
          position: { x: resourceGroupsX, y: resourceGroupY + resourceGroupYOffset },
          data: {
            label: 'Domains',
            type: 'group',
            groupType: 'domains',
            childCount: allDomains.size,
            highlighted: false,
          },
          style: {
            width: 280,
            height: domainsGroupHeight,
          },
        });

        // Add domain nodes
        Array.from(allDomains.values()).forEach((dom, idx) => {
          const domY = groupHeaderHeight + groupPadding + idx * (resourceNodeHeight + resourceVerticalSpacing);
          const domain = data.domains.find((d) => d.id === dom.domain.id);
          
          nodes.push({
            id: `domain-${server.id}-${dom.domain.id}`,
            type: 'custom',
            position: { x: groupPadding, y: domY },
            parentId: domainsGroupId,
            extent: 'parent',
            data: {
              label: domain?.name || dom.domain.name,
              type: 'domain',
              resourceId: dom.domain.id,
              resourceType: 'domain',
              highlighted: false,
            },
          });
        });

        // Connect services group (or server if no services) to domains group
        edges.push({
          id: `edge-${servicesGroupId || serverNodeId}-${domainsGroupId}`,
          source: servicesGroupId || serverNodeId,
          target: domainsGroupId,
          sourceHandle: servicesGroupId ? 'right' : 'right',
          targetHandle: 'middle',
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: '#8b5cf6', 
            strokeWidth: 2,
            opacity: 0.8,
          },
          markerEnd: { 
            type: 'arrowclosed', 
            color: '#8b5cf6',
            width: 18,
            height: 18,
          },
        });

        resourceGroupYOffset += domainsGroupHeight + groupSpacing;
      }

      // Update current server Y position for next server
      const totalServerHeight = Math.max(
        servicesGroupHeight,
        resourceGroupYOffset > 0 ? resourceGroupYOffset - groupSpacing : 0
      );
      currentServerY += totalServerHeight + serverVerticalSpacing;
    });

    // Sort nodes so parent nodes come before their children
    const sortedNodes = nodes.sort((a, b) => {
      if (a.parentId && !b.parentId) return 1;
      if (!a.parentId && b.parentId) return -1;
      return 0;
    });

    return { nodes: sortedNodes, edges };
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
              strokeWidth: isHighlighted ? 4 : 2,
              stroke: isHighlighted ? sourceColor : edge.style?.stroke || '#6b7280',
              opacity: isHighlighted ? 1 : 0.5,
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
      if (hoveredNodeId === node.id) return;
      
      setHoveredNodeId(node.id);
      
      const connectedNodeIds = new Set<string>([node.id]);
      const connectedEdgeIds = new Set<string>();

      // Find only directly connected nodes (one hop)
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
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        fitView
        attributionPosition="top-right"
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={16} 
          size={1}
          color="#e5e7eb"
          className="dark:opacity-20"
        />
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