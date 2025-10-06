/**
 * Tags List Component
 *
 * Displays a list of tags with optional max display limit.
 * Shows "+X more" indicator when tags exceed maxTags.
 */

// Types
interface TagsListProps {
  tags: string[];
  maxTags?: number;
  groupByCategory?: boolean;
}

/**
 * TagsList displays user tags as small badges.
 *
 * @param tags - Array of tag strings
 * @param maxTags - Maximum number of tags to display (default: 5)
 * @param groupByCategory - Whether to group tags by category (default: false, not implemented for Epic 0)
 */
export function TagsList({ tags, maxTags = 5, groupByCategory = false }: TagsListProps) {
  const displayTags = tags.slice(0, maxTags);
  const remainingCount = tags.length - maxTags;

  // groupByCategory is intentionally not implemented for Epic 0 (Walking Skeleton)
  if (groupByCategory) {
    console.warn('TagsList: groupByCategory is not implemented in Epic 0');
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayTags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
        >
          {tag}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}
