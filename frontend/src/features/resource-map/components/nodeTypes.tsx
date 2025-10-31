import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Server, Cloud, Lock, Globe, ExternalLink } from 'lucide-react';

export type NodeData = {
  label: string;
  type: 'server' | 'service' | 'credential' | 'domain' | 'external-service';
  resourceId: number;
  resourceType: string;
  tags?: Array<{ id: number; name: string; value: string | null }>;
  port?: number;
  serviceType?: string;
  url?: string;
  highlighted?: boolean;
};

export const nodeColors = {
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

const CustomNode = memo(({ data }: { data: NodeData }) => {
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

// Export nodeTypes - this ensures it's a stable reference that React Flow recognizes
export const nodeTypes = {
  custom: CustomNode,
};

