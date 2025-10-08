import { lazy } from 'react';

// Dynamic imports for Lucide React icons to reduce bundle size
export const CalendarIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Calendar })));
export const ClockIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Clock })));
export const UsersIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Users })));
export const UserIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.User })));
export const SettingsIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Settings })));
export const MenuIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Menu })));
export const XIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.X })));
export const PlusIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Plus })));
export const EditIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Edit })));
export const TrashIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Trash })));
export const SearchIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Search })));
export const FilterIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Filter })));

// UI component icons
export const CheckIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Check })));
export const ChevronDownIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.ChevronDown })));
export const ChevronUpIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.ChevronUp })));
export const ChevronRightIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.ChevronRight })));
export const ChevronLeftIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.ChevronLeft })));
export const CircleIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Circle })));

// Feedback and status icons
export const AlertCircleIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.AlertCircle })));
export const Loader2Icon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Loader2 })));
export const StarIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Star })));
export const LogOutIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.LogOut })));

// Additional commonly used icons (add more as needed based on usage analysis)
export const HomeIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Home })));
export const MessageSquareIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.MessageSquare })));
export const HeartIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Heart })));
export const ShareIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Share })));