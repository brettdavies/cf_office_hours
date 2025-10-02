# 6. Components

This section defines the component architecture for the React frontend, including the component library strategy, shared components, feature-specific components, and design patterns. All components use **Shadcn/ui** as the foundation with **Tailwind CSS** for styling.

## 6.1 Component Library Strategy

**Shadcn/ui Approach:**
Unlike traditional component libraries (Material-UI, Ant Design), Shadcn/ui uses a **copy-paste model** where components are copied directly into your codebase. This provides:
- ✅ Full control over component code
- ✅ No runtime dependency on library updates
- ✅ Customization without fighting framework abstractions
- ✅ Built on Radix UI primitives (accessibility built-in)
- ✅ Tailwind CSS integration

**Installation Pattern:**
```bash
# Initialize Shadcn/ui in apps/web
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add calendar
```

**Component Location:**
- **Shadcn Components:** `apps/web/src/components/ui/` (auto-generated)
- **Custom Shared Components:** `apps/web/src/components/common/`
- **Feature Components:** `apps/web/src/components/features/{feature-name}/`
- **Layout Components:** `apps/web/src/components/layouts/`

## 6.2 Shadcn/ui Components Used

Based on PRD requirements, the following Shadcn components will be installed:

| Component | Purpose | PRD Reference |
|-----------|---------|---------------|
| **Button** | Primary actions, CTAs | Universal |
| **Card** | User cards, booking cards, stat cards | FR10, FR23 |
| **Dialog** | Modals (booking confirmation, override request) | FR38, FR54 |
| **Form** | All forms (profile, availability, booking) | FR11, FR77 |
| **Input** | Text inputs across forms | Universal |
| **Label** | Form labels with accessibility | Universal |
| **Select** | Dropdowns (meeting type, duration, tags) | FR77, FR86 |
| **Textarea** | Multi-line inputs (bio, meeting goal) | FR11, FR38 |
| **Calendar** | Date picker for availability blocks | FR77 |
| **Badge** | Tags, tier indicators, status labels | FR9, FR52 |
| **Avatar** | User profile images | FR10, FR11 |
| **Tabs** | Dashboard views (My Bookings, Find Mentors) | FR23, FR33 |
| **Separator** | Visual dividers | Universal |
| **Toast** | Success/error notifications | NFR7, NFR30 |
| **Tooltip** | Help text, icon explanations | FR48, FR52 |
| **Switch** | Toggle settings (reminder preferences) | FR98 |
| **Command** | Search/filter interface | FR33 |
| **Popover** | Filter dropdowns, contextual actions | FR33 |
| **Alert** | Warning messages (calendar not connected) | FR105 |
| **Skeleton** | Loading states | NFR30 |
| **Table** | Coordinator dashboard data tables | FR68 |
| **Checkbox** | Multi-select (calendar selection, tags) | FR25, FR75 |
| **RadioGroup** | Single-choice selections (meeting type) | FR77 |
| **Progress** | Profile completion indicator | NFR30 |
| **HoverCard** | User profile previews on hover | FR10 |

## 6.3 Shared Common Components

These custom components wrap Shadcn components with app-specific logic and are used across multiple features.

### 6.3.1 UserAvatar Component

**Purpose:** Display user avatar with fallback initials and online status

**Props Interface:**
```typescript
// apps/web/src/components/common/UserAvatar.tsx

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface UserAvatarProps {
  user: {
    name: string;
    avatar_url?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

export function UserAvatar({ 
  user, 
  size = 'md', 
  showOnlineStatus = false,
  className 
}: UserAvatarProps) {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
      )}
    </div>
  );
}
```

**Usage:**
```typescript
<UserAvatar user={mentor} size="lg" showOnlineStatus />
```

### 6.3.2 ReputationBadge Component

**Purpose:** Display reputation tier with color-coded badge and score tooltip

**Props Interface:**
```typescript
// apps/web/src/components/common/ReputationBadge.tsx

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReputationTier } from '@shared/types/user';

export interface ReputationBadgeProps {
  tier: ReputationTier;
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

const tierConfig = {
  bronze: { label: 'Bronze', color: 'bg-amber-700 text-white hover:bg-amber-800' },
  silver: { label: 'Silver', color: 'bg-gray-400 text-white hover:bg-gray-500' },
  gold: { label: 'Gold', color: 'bg-yellow-500 text-white hover:bg-yellow-600' },
  platinum: { label: 'Platinum', color: 'bg-purple-600 text-white hover:bg-purple-700' },
};

export function ReputationBadge({ 
  tier, 
  score, 
  showScore = true,
  size = 'md' 
}: ReputationBadgeProps) {
  const config = tierConfig[tier];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  const badge = (
    <Badge className={`${config.color} ${sizeClass}`}>
      {config.label} {showScore && `(${score.toFixed(1)})`}
    </Badge>
  );

  if (!showScore) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>Reputation Score: {score.toFixed(2)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
```

### 6.3.3 TagsList Component

**Purpose:** Display user tags with category grouping and management actions

**Props Interface:**
```typescript
// apps/web/src/components/common/TagsList.tsx

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { UserTag, TagCategory } from '@shared/types/tag';

export interface TagsListProps {
  tags: UserTag[];
  editable?: boolean;
  onRemove?: (tagId: string) => void;
  groupByCategory?: boolean;
  maxTags?: number;
}

const categoryColors = {
  industry: 'bg-blue-100 text-blue-800 border-blue-300',
  technology: 'bg-green-100 text-green-800 border-green-300',
  stage: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function TagsList({ 
  tags, 
  editable = false, 
  onRemove,
  groupByCategory = true,
  maxTags 
}: TagsListProps) {
  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
  const remaining = maxTags && tags.length > maxTags ? tags.length - maxTags : 0;

  if (groupByCategory) {
    const grouped = displayTags.reduce((acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = [];
      acc[tag.category].push(tag);
      return acc;
    }, {} as Record<TagCategory, UserTag[]>);

    return (
      <div className="space-y-3">
        {Object.entries(grouped).map(([category, categoryTags]) => (
          <div key={category}>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              {category}
            </p>
            <div className="flex flex-wrap gap-2">
              {categoryTags.map(tag => (
                <TagBadge key={tag.id} tag={tag} editable={editable} onRemove={onRemove} />
              ))}
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-gray-500">
            +{remaining} more
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayTags.map(tag => (
        <TagBadge key={tag.id} tag={tag} editable={editable} onRemove={onRemove} />
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-gray-500">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}

function TagBadge({ 
  tag, 
  editable, 
  onRemove 
}: { 
  tag: UserTag; 
  editable: boolean; 
  onRemove?: (id: string) => void 
}) {
  return (
    <Badge 
      variant="outline" 
      className={`${categoryColors[tag.category]} ${editable ? 'pr-1' : ''}`}
    >
      {tag.tag_value.replace(/_/g, ' ')}
      {editable && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
          onClick={() => onRemove(tag.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  );
}
```

### 6.3.4 EmptyState Component

**Purpose:** Consistent empty state messaging across the app

**Props Interface:**
```typescript
// apps/web/src/components/common/EmptyState.tsx

import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-6 mb-4">
        <Icon className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
```

### 6.3.5 LoadingSpinner Component

**Purpose:** Consistent loading states

**Props Interface:**
```typescript
// apps/web/src/components/common/LoadingSpinner.tsx

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={cn('animate-spin text-gray-400', sizeClasses[size], className)} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
```

### 6.3.6 ErrorMessage Component

**Purpose:** Consistent error display with retry actions

**Props Interface:**
```typescript
// apps/web/src/components/common/ErrorMessage.tsx

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorMessage({ 
  title = 'Something went wrong', 
  message, 
  onRetry,
  retryLabel = 'Try again'
}: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry} 
            className="mt-3"
          >
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

## 6.4 Feature-Specific Components

Components organized by feature domain, corresponding to PRD screens and flows.

### 6.4.1 User Discovery Components

**Location:** `apps/web/src/components/features/discovery/`

**Components:**
- `UserCard.tsx` - Displays user profile card with tags, reputation, and CTA (FR10)
- `UserSearchFilters.tsx` - Multi-filter interface (role, tags, tier) (FR33)
- `UserGrid.tsx` - Responsive grid of user cards
- `RecommendedMentors.tsx` - Personalized recommendations with match scores (FR18)
- `MutualAvailabilityIndicator.tsx` - Star icon with tooltip (FR20, FR106)

**UserCard Example:**
```typescript
// apps/web/src/components/features/discovery/UserCard.tsx

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ReputationBadge } from '@/components/common/ReputationBadge';
import { TagsList } from '@/components/common/TagsList';
import { Star, Calendar } from 'lucide-react';
import { UserWithProfile } from '@shared/types/user';

export interface UserCardProps {
  user: UserWithProfile;
  hasMutualAvailability?: boolean;
  matchScore?: number;
  onViewProfile: (userId: string) => void;
  onBookNow?: (userId: string) => void;
  onExpressInterest?: (userId: string) => void;
}

export function UserCard({ 
  user, 
  hasMutualAvailability = false,
  matchScore,
  onViewProfile,
  onBookNow,
  onExpressInterest
}: UserCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start gap-4">
        <UserAvatar user={user.profile} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{user.profile.name}</h3>
            {hasMutualAvailability && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <p className="text-sm text-gray-500">{user.profile.title}</p>
          <ReputationBadge 
            tier={user.reputation_tier} 
            score={user.reputation_score} 
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {user.profile.bio || user.profile.expertise_description}
        </p>
        <TagsList tags={user.tags || []} maxTags={5} groupByCategory={false} />
        {matchScore && (
          <div className="mt-3 text-xs text-gray-500">
            Match Score: <span className="font-medium">{matchScore}%</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" onClick={() => onViewProfile(user.id)} className="flex-1">
          View Profile
        </Button>
        {onBookNow && user.role === 'mentor' && (
          <Button onClick={() => onBookNow(user.id)} className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Book Now
          </Button>
        )}
        {onExpressInterest && (
          <Button variant="secondary" onClick={() => onExpressInterest(user.id)}>
            Express Interest
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

_[Continued in Part 2...]_

### 6.4.2 Booking Components

**Location:** `apps/web/src/components/features/bookings/`

**Components:**
- `AvailabilityCalendar.tsx` - Calendar view of mentor availability (FR21)
- `TimeSlotPicker.tsx` - Time slot selection grid (FR38)
- `BookingForm.tsx` - Meeting goal + materials form (FR38)
- `BookingConfirmationDialog.tsx` - Confirmation modal (FR39)
- `BookingCard.tsx` - Upcoming/past booking display (FR23)
- `CancelBookingDialog.tsx` - Cancellation with reason (FR40)
- `RatingDialog.tsx` - Post-meeting rating (FR45)

**TimeSlotPicker Example:**
```typescript
// apps/web/src/components/features/bookings/TimeSlotPicker.tsx

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TimeSlot } from '@shared/types/availability';
import { format, parseISO } from 'date-fns';

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlotId?: string;
  onSelectSlot: (slot: TimeSlot) => void;
  disabledSlotIds?: string[];
}

export function TimeSlotPicker({ 
  slots, 
  selectedSlotId, 
  onSelectSlot,
  disabledSlotIds = []
}: TimeSlotPickerProps) {
  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = format(parseISO(slot.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className="space-y-6">
      {Object.entries(slotsByDate).map(([date, dateSlots]) => (
        <div key={date}>
          <h4 className="font-medium text-sm text-gray-700 mb-3">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {dateSlots.map(slot => {
              const isSelected = slot.id === selectedSlotId;
              const isDisabled = slot.is_booked || disabledSlotIds.includes(slot.id);
              
              return (
                <Button
                  key={slot.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    'justify-center',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {format(parseISO(slot.start_time), 'h:mm a')}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 6.4.3 Profile Components

**Location:** `apps/web/src/components/features/profile/`

**Components:**
- `ProfileForm.tsx` - Editable profile with role-specific fields (FR11)
- `AvatarUploader.tsx` - Image upload with crop/zoom (FR12, FR13)
- `TagSelector.tsx` - Tag selection from taxonomy with request (FR75)
- `CalendarConnectionCard.tsx` - Calendar integration status (FR21, FR25)
- `ProfileCompletenessIndicator.tsx` - Progress bar (NFR30)

**AvatarUploader Example:**
```typescript
// apps/web/src/components/features/profile/AvatarUploader.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link as LinkIcon } from 'lucide-react';

export interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onUrlSubmit: (url: string) => Promise<void>;
  isUploading?: boolean;
}

export function AvatarUploader({ 
  currentAvatarUrl, 
  onUpload, 
  onUrlSubmit,
  isUploading = false
}: AvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      {currentAvatarUrl && (
        <div className="flex justify-center">
          <img 
            src={currentAvatarUrl} 
            alt="Current avatar" 
            className="h-32 w-32 rounded-full object-cover"
          />
        </div>
      )}
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="url">From URL</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-2">
          <Label htmlFor="avatar-upload">Choose a file (JPG, PNG, max 2MB)</Label>
          <Input 
            id="avatar-upload"
            type="file" 
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </TabsContent>
        
        <TabsContent value="url" className="space-y-2">
          <Label htmlFor="avatar-url">Enter image URL</Label>
          <div className="flex gap-2">
            <Input 
              id="avatar-url"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={isUploading}
            />
            <Button 
              onClick={() => onUrlSubmit(avatarUrl)}
              disabled={!avatarUrl || isUploading}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 6.4.4 Availability Management Components (Mentor-only)

**Location:** `apps/web/src/components/features/availability/`

**Components:**
- `AvailabilityBlockForm.tsx` - Create/edit availability blocks (FR77)
- `AvailabilityBlockList.tsx` - Display existing blocks (FR79)
- `LocationPresetSelector.tsx` - Choose from CF locations (FR84)
- `RecurrencePatternPicker.tsx` - One-time, weekly, monthly, quarterly (FR82)
- `BufferTimeSelector.tsx` - Buffer between slots (FR88)

### 6.4.5 Coordinator Components

**Location:** `apps/web/src/components/features/coordinator/`

**Components:**
- `DashboardStats.tsx` - KPI cards (FR68)
- `OverrideRequestsTable.tsx` - Exception approvals (FR54, FR55)
- `WhiteGloveScheduler.tsx` - Manual booking creation (FR67)
- `TaxonomyApprovalTable.tsx` - User-requested tags (FR75)
- `AuditLogViewer.tsx` - Admin action history (FR53)

## 6.5 Layout Components

**Location:** `apps/web/src/components/layouts/`

**Components:**
- `AppLayout.tsx` - Main authenticated layout with navigation
- `AuthLayout.tsx` - Unauthenticated layout (login, signup)
- `Header.tsx` - Top navigation with role-specific menu
- `Sidebar.tsx` - Side navigation (if needed)
- `Footer.tsx` - Footer with links

**AppLayout Example:**
```typescript
// apps/web/src/components/layouts/AppLayout.tsx

import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from '@/components/ui/toaster';

export interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
```

## 6.6 Component Design Patterns

### 6.6.1 Composition Over Props Drilling

Use React Context for deeply nested data (auth user, theme):

```typescript
// apps/web/src/contexts/AuthContext.tsx

import { createContext, useContext, ReactNode } from 'react';
import { UserWithProfile } from '@shared/types/user';

interface AuthContextValue {
  user: UserWithProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Implementation in Section 7
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### 6.6.2 Controlled vs Uncontrolled Components

**Controlled (for forms with validation):**
```typescript
// Using React Hook Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(CreateBookingSchema),
  defaultValues: { meeting_goal: '', materials_urls: [] },
});
```

**Uncontrolled (for simple inputs):**
```typescript
// Direct input without state management
<Input type="text" defaultValue={user.name} ref={nameRef} />
```

### 6.6.3 Render Props for Flexible UI

**Example: Data fetching wrapper**
```typescript
// apps/web/src/components/common/DataFetcher.tsx

interface DataFetcherProps<T> {
  fetcher: () => Promise<T>;
  children: (data: T) => ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: (error: Error) => ReactNode;
}

export function DataFetcher<T>({ 
  fetcher, 
  children, 
  loadingComponent,
  errorComponent 
}: DataFetcherProps<T>) {
  const { data, isLoading, error } = useQuery({ queryFn: fetcher });

  if (isLoading) return loadingComponent || <LoadingSpinner />;
  if (error) return errorComponent?.(error) || <ErrorMessage message={error.message} />;
  if (!data) return null;

  return <>{children(data)}</>;
}
```

**Usage:**
```typescript
<DataFetcher fetcher={() => fetchMentors()}>
  {(mentors) => <UserGrid users={mentors} />}
</DataFetcher>
```

### 6.6.4 Compound Components for Complex UI

**Example: Multi-step booking flow**
```typescript
// apps/web/src/components/features/bookings/BookingWizard.tsx

export function BookingWizard({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  // Wizard logic
  return (
    <WizardContext.Provider value={{ currentStep, setCurrentStep }}>
      {children}
    </WizardContext.Provider>
  );
}

BookingWizard.Step = function Step({ children }: { children: ReactNode }) {
  // Step logic
  return <>{children}</>;
};

// Usage:
<BookingWizard>
  <BookingWizard.Step>Select mentor</BookingWizard.Step>
  <BookingWizard.Step>Pick time</BookingWizard.Step>
  <BookingWizard.Step>Enter details</BookingWizard.Step>
  <BookingWizard.Step>Confirm</BookingWizard.Step>
</BookingWizard>
```

### 6.6.5 Error Boundaries for Graceful Failures

```typescript
// apps/web/src/components/common/ErrorBoundary.tsx

import { Component, ReactNode } from 'react';
import { ErrorMessage } from './ErrorMessage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to monitoring service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorMessage 
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred'}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}
```

## 6.7 Component Testing Approach

**Unit Tests (Vitest + Testing Library):**
```typescript
// apps/web/src/components/common/UserAvatar.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('displays user initials when no avatar URL', () => {
    render(<UserAvatar user={{ name: 'John Doe' }} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows online status when enabled', () => {
    const { container } = render(
      <UserAvatar user={{ name: 'John Doe' }} showOnlineStatus />
    );
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });
});
```

**Integration Tests (Playwright):**
```typescript
// apps/web/e2e/booking-flow.spec.ts

import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  await page.goto('/mentors');
  await page.click('[data-testid="mentor-card-first"] button:has-text("Book Now")');
  await page.click('[data-testid="time-slot-picker"] button:first-child');
  await page.fill('[name="meeting_goal"]', 'Discuss product-market fit strategy');
  await page.click('button:has-text("Confirm Booking")');
  await expect(page.locator('text=Booking Confirmed')).toBeVisible();
});
```

## 6.8 Accessibility (WCAG 2.1 AA Compliance)

All components follow accessibility best practices:

**1. Semantic HTML:**
```typescript
// Good
<button onClick={handleClick}>Submit</button>

// Bad
<div onClick={handleClick}>Submit</div>
```

**2. ARIA Labels:**
```typescript
<Button aria-label="Close dialog" onClick={onClose}>
  <X className="h-4 w-4" />
</Button>
```

**3. Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Focus indicators visible (Tailwind's `focus:ring-2`)
- Logical tab order

**4. Color Contrast:**
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Shadcn/ui components meet these by default

**5. Screen Reader Support:**
```typescript
<img src={avatar} alt={`${user.name}'s avatar`} />
<input type="text" id="email" />
<label htmlFor="email">Email Address</label>
```

## 6.9 Performance Optimization

**1. Code Splitting:**
```typescript
// apps/web/src/pages/Dashboard.tsx
import { lazy, Suspense } from 'react';

const CoordinatorPanel = lazy(() => import('@/components/features/coordinator/CoordinatorPanel'));

export function Dashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {user.role === 'coordinator' && <CoordinatorPanel />}
    </Suspense>
  );
}
```

**2. Memoization:**
```typescript
import { memo, useMemo } from 'react';

export const UserCard = memo(function UserCard({ user, onViewProfile }: UserCardProps) {
  const formattedTags = useMemo(
    () => user.tags.map(tag => tag.tag_value.replace(/_/g, ' ')),
    [user.tags]
  );
  
  return (/* ... */);
});
```

**3. Virtual Scrolling (for large lists):**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function UserList({ users }: { users: UserWithProfile[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated row height
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index} style={{ transform: `translateY(${virtualRow.start}px)` }}>
            <UserCard user={users[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 6.10 Component Documentation Standards

Each component should include JSDoc comments:

```typescript
/**
 * Displays a user profile card with avatar, reputation badge, and tags.
 * 
 * @param user - User object with profile information
 * @param hasMutualAvailability - Shows star indicator if true (FR20)
 * @param matchScore - Optional match percentage for recommendations (FR18)
 * @param onViewProfile - Callback when "View Profile" is clicked
 * @param onBookNow - Callback when "Book Now" is clicked (mentor cards only)
 * 
 * @example
 * ```tsx
 * <UserCard 
 *   user={mentor} 
 *   hasMutualAvailability 
 *   onViewProfile={handleViewProfile}
 *   onBookNow={handleBookNow}
 * />
 * ```
 */
export function UserCard({ user, hasMutualAvailability, ... }: UserCardProps) {
  // Implementation
}
```

---

