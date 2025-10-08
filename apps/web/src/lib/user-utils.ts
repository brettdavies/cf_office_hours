/**
 * User Utility Functions
 *
 * Shared utilities for user profile display and formatting across the application.
 * Centralized to maintain DRY principle and consistent UI behavior.
 */

/**
 * Get initials from user name for avatar fallback
 *
 * @param name - User's full name (nullable)
 * @returns Initials string (e.g., "JD" for "John Doe") or "?" if no name
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Alice") // "AL"
 * getInitials(null) // "?"
 */
export function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Get Tailwind color classes for reputation tier badge
 *
 * @param tier - Reputation tier (bronze, silver, gold, platinum)
 * @returns Tailwind CSS classes for background and text color
 *
 * @example
 * getReputationTierColor("gold") // "bg-yellow-500 text-white"
 * getReputationTierColor("platinum") // "bg-slate-700 text-white"
 */
export function getReputationTierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'platinum':
      return 'bg-slate-700 text-white';
    case 'gold':
      return 'bg-yellow-500 text-white';
    case 'silver':
      return 'bg-slate-400 text-white';
    case 'bronze':
      return 'bg-orange-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Get Tailwind color classes for role badge
 *
 * @param role - User role (mentor, mentee, coordinator)
 * @returns Tailwind CSS classes for background and text color
 *
 * @example
 * getRoleColor("mentor") // "bg-blue-500 text-white"
 * getRoleColor("mentee") // "bg-green-500 text-white"
 */
export function getRoleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'mentor':
      return 'bg-blue-500 text-white';
    case 'mentee':
      return 'bg-green-500 text-white';
    case 'coordinator':
      return 'bg-purple-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Get color classes and label for match score display
 * Score ranges: >80 High (green), 60-80 Medium (yellow), <60 Low (red)
 *
 * @param score - Match score (0-100)
 * @returns Object with Tailwind color class and human-readable label
 *
 * @example
 * getScoreColorAndLabel(95) // { color: "text-green-600", label: "High Match" }
 * getScoreColorAndLabel(65) // { color: "text-yellow-600", label: "Medium Match" }
 * getScoreColorAndLabel(45) // { color: "text-red-600", label: "Low Match" }
 */
export function getScoreColorAndLabel(score: number): { color: string; label: string } {
  if (score > 80) {
    return { color: 'text-green-600', label: 'High Match' };
  } else if (score >= 60) {
    return { color: 'text-yellow-600', label: 'Medium Match' };
  } else {
    return { color: 'text-red-600', label: 'Low Match' };
  }
}
