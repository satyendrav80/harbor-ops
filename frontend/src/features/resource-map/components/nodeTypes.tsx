import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Server, Cloud, Lock, Globe, ExternalLink } from 'lucide-react';

export type NodeData = {
  label: string;
  type: 'server' | 'service' | 'credential' | 'domain' | 'external-service' | 'group';
  resourceId?: number;
  resourceType?: string;
  tags?: Array<{ id: number; name: string; value: string | null; color: string | null }>;
  port?: number;
  serviceType?: string;
  url?: string;
  highlighted?: boolean;
  groupType?: 'credentials' | 'domains' | 'dependencies';
  childCount?: number;
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
  
  // Get the first tag with a color (for visual indication)
  const coloredTag = data.tags?.find((tag) => tag.color);
  const tagBorderColor = coloredTag?.color || undefined;
  
  // Determine border color: highlighted > tag color > default
  const borderColor = isHighlighted ? nodeColors[data.type] : (tagBorderColor || undefined);
  const hasTagBorder = tagBorderColor && !isHighlighted;
  
  return (
    <div
      className={`group relative bg-white dark:bg-[#1C252E] border-2 rounded-lg p-3 min-w-[200px] shadow-lg transition-all ${
        isHighlighted
          ? 'shadow-xl scale-105'
          : tagBorderColor
          ? 'hover:border-gray-400'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
      }`}
      style={{
        ...(hasTagBorder 
          ? {
              borderTopColor: tagBorderColor,
              borderRightColor: tagBorderColor,
              borderBottomColor: tagBorderColor,
              borderLeftColor: tagBorderColor,
              borderLeftWidth: '4px',
            }
          : borderColor 
          ? {
              borderColor: borderColor,
            }
          : {}
        ),
        backgroundColor: isHighlighted ? `${nodeColors[data.type]}20` : undefined,
      }}
    >
      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        style={{ 
          background: 'white',
          border: '2px solid #9ca3af', 
          width: '10px', 
          height: '10px',
          borderRadius: '50%',
          left: '-5px',
          top: '50%',
          transform: 'translateY(-50%)'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ 
          background: 'white',
          border: '2px solid #9ca3af', 
          width: '10px', 
          height: '10px',
          borderRadius: '50%',
          right: '-5px',
          top: '50%',
          transform: 'translateY(-50%)'
        }} 
      />
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
              className="text-xs px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: tag.color ? `${tag.color}20` : undefined,
                color: tag.color || undefined,
                border: tag.color ? `1px solid ${tag.color}` : undefined,
                ...(!tag.color && {
                  backgroundColor: 'rgb(243 244 246)',
                  color: 'rgb(55 65 81)',
                }),
              }}
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

// Group node component - displays as a labeled box container
const GroupNode = memo(({ data }: { data: NodeData }) => {
  const isHighlighted = data.highlighted || false;
  
  const groupColors = {
    credentials: '#f59e0b', // amber
    domains: '#8b5cf6', // purple
    dependencies: '#10b981', // green
  };

  const groupLabels = {
    credentials: 'Credentials',
    domains: 'Domains',
    dependencies: 'Dependencies',
  };

  // Check if this is a services group
  const isServicesGroup = data.label === 'Services';
  const groupColor = isServicesGroup ? '#10b981' : (data.groupType ? groupColors[data.groupType] : '#6b7280');
  const groupLabel = data.label || (data.groupType ? groupLabels[data.groupType] : 'Group');

  return (
    <div
      className={`bg-white dark:bg-[#1C252E] border-2 rounded-lg p-4 shadow-lg transition-all w-full h-full ${
        isHighlighted
          ? 'shadow-xl scale-105'
          : 'border-gray-300 dark:border-gray-600'
      }`}
      style={{
        borderColor: groupColor,
        borderStyle: 'dashed',
        borderWidth: '2px',
      }}
    >
      {/* Connection handles for groups */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="middle" 
        style={{ 
          background: 'white',
          border: `2px solid ${groupColor}`, 
          width: '10px', 
          height: '10px',
          borderRadius: '50%',
          left: '-5px',
          top: '50%',
          transform: 'translateY(-50%)'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ 
          background: 'white',
          border: `2px solid ${groupColor}`, 
          width: '10px', 
          height: '10px',
          borderRadius: '50%',
          right: '-5px',
          top: '50%',
          transform: 'translateY(-50%)'
        }} 
      />
      
      <div
        className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 pb-2 border-b border-gray-200 dark:border-gray-600"
        style={{ color: groupColor }}
      >
        {groupLabel}
        {data.childCount !== undefined && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({data.childCount})
          </span>
        )}
      </div>
      {/* Children will be rendered inside this group node by React Flow */}
    </div>
  );
});

GroupNode.displayName = 'GroupNode';

// Export nodeTypes - this ensures it's a stable reference that React Flow recognizes
export const nodeTypes = {
  custom: CustomNode,
  group: GroupNode,
};

