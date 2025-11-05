type ItemTagsProps = {
  tags?: Array<{
    id: number;
    name: string;
    value?: string | null;
    color?: string | null;
  }>;
};

export function ItemTags({ tags }: ItemTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tags</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
            style={{
              backgroundColor: tag.color ? `${tag.color}20` : undefined,
              color: tag.color || undefined,
              border: tag.color ? `1px solid ${tag.color}` : undefined,
              ...(!tag.color && {
                backgroundColor: 'rgb(59 130 246 / 0.1)',
                color: 'rgb(59 130 246)',
              }),
            }}
          >
            {tag.name}
            {tag.value && `: ${tag.value}`}
          </span>
        ))}
      </div>
    </div>
  );
}

