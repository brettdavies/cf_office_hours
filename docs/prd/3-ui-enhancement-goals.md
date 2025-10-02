# 3. UI Enhancement Goals

## 3.1 Design System Foundation

**Component Library:** Shadcn/ui + Tailwind CSS
- Shadcn provides unstyled, accessible components
- Full customization control with Tailwind utilities
- Consistent design tokens (colors, spacing, typography)

**Desktop-First Approach:**
- Optimized for 1280px+ displays
- Responsive down to 1024px (laptop minimum)
- Mobile-responsive structure in place for future (post-MVP)

**Key Design Principles:**
1. **Clarity over Complexity** - Clean, uncluttered interfaces
2. **Instant Feedback** - Real-time updates, toast notifications, loading states
3. **Progressive Disclosure** - Show relevant info when needed, hide complexity
4. **Accessibility** - WCAG 2.1 AA compliance via Shadcn components

---

## 3.2 Implementation Decisions

### Calendar Component Strategy

**For Mentee Booking (Slot Selection):**
- **Custom SlotPicker component** - Week grid view showing available slots as clickable buttons
- Lightweight (~10-20KB custom code)
- Perfect fit for slot selection use case
- Easy to add availability matching visual indicators
- Real-time updates via Supabase Realtime

**For Mentor Availability Management:**
- **Form-based approach (MVP)** - Simple date/time range inputs with recurrence selector
- Fast to implement and ship
- Visual calendar with drag-and-drop deferred to FE20

**For Charts (Admin Dashboard):**
- **Recharts library** (~50KB) for simple, non-interactive visualizations
- Bar charts, line charts, gauge charts for KPIs
- Tooltip interactivity only

**Filter Persistence:**
- URL parameter encoding for mentor directory filters
- Enables bookmarking, sharing, and browser back/forward navigation
- Example: `/mentors?industries=ai,fintech&stage=seed&tier=gold`

---

## 3.3 Core Screens and Views

### Authentication Flow

**Login/Signup Screen**
- Passwordless magic link input (email field + "Send magic link" button)
- OAuth options: "Continue with Google" / "Continue with Microsoft" buttons
  - **OAuth flow requests both auth + calendar permissions** (single consent screen per FR2)
  - Google scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/calendar.events`
  - Microsoft scopes: `openid`, `email`, `profile`, `Calendars.ReadWrite`
- Error state: "Email not found - Contact admin for access"
- Loading state during authentication

**Post-Login: Calendar Connection Prompt (Magic Link Users Only)**
- If user authenticated via magic link and has no connected calendar:
  - Show dismissible banner on dashboard: "Connect your calendar to book meetings and manage availability"
  - OAuth buttons: "Connect Google Calendar" / "Connect Outlook Calendar"
  - Dismiss button: "I'll do this later"
  - Banner reappears on subsequent logins until calendar connected
- After successful calendar connection: Remove banner, enable all features

**Calendar Required: Action-Level Blocking**
- When user without connected calendar attempts booking/availability action (per FR105):
  - Action blocked with modal: "Calendar connection required"
  - Message: "To [book meetings / view availability / create availability], please connect your calendar"
  - OAuth buttons: "Connect Google Calendar" / "Connect Outlook Calendar"
  - Cancel button returns to previous screen
- **Actions requiring calendar:**
  - Viewing available mentor/mentee time slots
  - Booking meetings
  - Creating availability blocks
- **Actions NOT requiring calendar:**
  - Viewing mentor/mentee directories
  - Viewing profiles
  - Coordinator dashboard access
  - Profile editing
  - Browsing without booking

**Components:** Input (email), Button (primary, secondary), Card (container), Alert (for errors), Banner (calendar prompt), Modal (calendar required blocker)

---

### User Profile Screens

**Profile View/Edit (All Users)**
- Header: Avatar, name, title, company
- Sections:
  - Contact Info (email, phone, LinkedIn, website, additional links)
  - Tags/Categories (visual chips: confirmed vs. auto-generated styling)
  - Reputation Score (for mentees/mentors - visual breakdown)
- Edit mode: Inline editing with save/cancel

**Mentee-Specific Profile**
- Pitch.vc profile link field
- Document upload area (pitch decks) with drag-and-drop
- Uploaded files list with download/delete actions

**Mentor-Specific Profile**
- Expertise description (rich text area)
- Ideal mentee profile description
- Availability management shortcut button

**Components:** Avatar, Input, Textarea, Badge (tags), File upload component, Card sections, Progress indicator (reputation breakdown), Tabs (if combining view/edit modes)

---

### Matching & Discovery

**Mentor Directory (Mentee View)**
- **Layout:** Grid or list view toggle
- **Filters sidebar:**
  - Industries (multi-select)
  - Technologies (multi-select)
  - Stage (single-select)
  - Reputation tier (checkboxes)
  - Availability (has slots this week/month)
  - **Filter persistence:** URL parameters enable bookmarking and sharing
- **Recommendation section (top):**
  - "Recommended for you" banner
  - 3-5 mentor cards with match scores
  - Match explanation badges ("3 shared tags", "Similar stage")
- **All mentors section (below):**
  - Searchable/filterable list
  - Pagination or infinite scroll

**Mentor Card:**
- Avatar, name, title, company
- Tags (top 3-5 most relevant)
- Reputation tier badge
- Match score (if in recommendations)
- "View Profile" button
- "Book Meeting" button (primary action)
- Inactive badge if applicable

**Mentee Directory (Mentor View)**
- Similar layout to mentor directory
- "Reach Out" button sends "I want to meet you" email
- Match explanations focused on how mentor can help

**Components:** Card (mentor/mentee cards), Badge (tags, reputation, match score), Button (actions), Select, Checkbox (filters), Input (search), Tooltip (match explanations)

---

### Calendar & Availability Management

**Mentor Availability Dashboard**
- **View:** List/card view of availability blocks (not full calendar for MVP)
- **Upcoming bookings:** Shows booked slots with mentee info
- **Create availability** button opens form/modal

**Create/Edit Availability Form:**
- Recurrence selector (one-time, weekly, monthly, quarterly)
- Date range picker (start/end dates)
- Time range picker (e.g., 2:00 PM - 4:00 PM)
- Duration per slot dropdown (15/20/30/60 min)
- Buffer time input (minutes between sessions)
- Meeting type radio buttons:
  - In-person (preset location dropdown)
  - In-person (custom location text input)
  - Online (auto Google Meet)
- Description field (optional - what this block is for)
- Save/Cancel buttons

**Availability Blocks List:**
- Card-based display showing:
  - Recurrence pattern (e.g., "Every Tuesday")
  - Time range (e.g., "2:00 PM - 4:00 PM")
  - Duration per slot (e.g., "30-minute slots")
  - Meeting type
  - Number of bookings (e.g., "3 of 4 slots booked")
- Actions: Edit, Delete (blocked if slots are booked)

**Components:** Form inputs (Date/Time pickers, Select, Radio Group), Card (availability blocks), Button, Modal/Dialog, List items

**Note:** Visual calendar view with drag-and-drop is a future enhancement (FE20).

---

### Booking Flow

**Booking Screen (Mentee selecting slot)**
- **Left side:** Mentor profile summary (avatar, name, expertise, reputation)
- **Right side:** Custom slot picker component

**Slot Picker Component (Week Grid View):**
```
┌─────────────────────────────────────────────────────┐
│  Week of Jan 8-14, 2025              < Prev  Next > │
│  [✓] Show only when I'm available                   │ ← Filter toggle (calendar required)
├─────────────────────────────────────────────────────┤
│  Mon 1/8   │ Tue 1/9   │ Wed 1/10  │ Thu 1/11      │
├────────────┼───────────┼───────────┼───────────────┤
│  10:00 AM  │ 10:00 AM  │ 3:00 PM ⭐│               │
│  10:30 AM  │ 2:00 PM   │           │               │
│  11:00 AM  │ 2:30 PM   │           │               │
└────────────┴───────────┴───────────┴───────────────┘
```
- Available slots as clickable buttons
- ⭐ = Mutual availability (both mentee and mentor free, based on connected calendars)
- Real-time updates: Slot disappears if booked by another user
- Minimum 1-day advance enforced (past dates grayed out)
- Calendar sync required before booking (enforced per FR105)

**Real-time Implementation (per NFR28):**
```typescript
// SlotPicker Realtime Subscription
useEffect(() => {
  const subscription = supabase
    .channel(`slots-${mentorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_slots',
        filter: `mentor_id=eq.${mentorId},start_time=gte.${new Date().toISOString()}`,
      },
      (payload) => {
        // Update slot availability in real-time
        handleSlotUpdate(payload);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [mentorId]);

// Scoped subscription: Only subscribes to future slots for current mentor
// Prevents global time_slots table subscription (reduces load per NFR28)
```

**Booking Form (appears after slot selection):**
- Meeting goal description (textarea, required, min 10 chars)
- Materials to review (URL inputs, optional, multiple allowed)
- Confirmation: "This meeting is scheduled for [DATE/TIME] in your timezone ([TIMEZONE])"
- Actions: "Confirm Booking" (primary), "Cancel"

**Confirmation Toast:**
- Success message: "Meeting booked! Calendar invite sent."
- Show meeting details: date, time, Google Meet link
- Actions: "View my bookings"

**Availability Matching Feature:**
- Toggle: "Show only when I'm available"
- Uses mentee's connected calendar (Google or Microsoft, required per FR105)
- System fetches mentee's busy times and filters/highlights slots
- Privacy: Only fetches "busy/free" status, not event details
- Shows "Last synced: X minutes ago" indicator

**Components:** Split layout (profile + slot picker), Custom SlotPicker component (week grid), Textarea, Input, Button, Toast notification, Badge (mutual availability indicator)

---

### Booking Management

**My Bookings Dashboard**
- **Tabs:** Upcoming / Past / Canceled
- **Upcoming meetings:**
  - Meeting cards: participant info, date/time, meeting link, description
  - Actions: Cancel meeting, Add to calendar, Copy meeting link
- **Past meetings:**
  - Meeting cards (same layout)
  - Rating prompt if not yet rated: "Rate this session" (1-5 stars)
- **Canceled meetings:**
  - Grayed out cards with cancellation reason/date

**Meeting Detail View:**
- Full info: participant profiles, meeting goal, materials, notes
- Calendar integration status
- Google Meet link (if online)
- Cancel button with confirmation

**Components:** Tabs, Card (meeting cards), Badge (status: upcoming, completed, canceled), Button (actions), Rating component (star selector), Dialog (confirmation)

---

### Reputation & Ratings

**Reputation Score Display (in profile):**
- Large score number with tier badge
- Breakdown list:
  - Average rating: X/5 stars
  - Completion rate: X%
  - Responsiveness: X.Xx multiplier
  - Tenure bonus: +X.X
- Access tier info: "Silver tier - 5 bookings/week max"
- Simple bar chart or progress indicators for visual breakdown

**Post-Meeting Rating Modal:**
- Appears after meeting completion
- "How was your session with [NAME]?"
- 1-5 star selector (large, clickable stars)
- Optional text feedback (textarea)
- Submit button

**Tier Restriction Override Request:**
- "Request Exception" button on restricted mentor profile
- Modal: Reason field (textarea, required)
- Submit → Shows confirmation: "Request sent to coordinator"

**Components:** Progress indicators (reputation breakdown), Rating component (stars), Textarea, Modal/Dialog, Badge (tier), Simple bar chart (Recharts)

---

### Admin/Coordinator Dashboard

**Overview Tab:**
- KPI cards:
  - Mentor utilization rate (simple percentage display)
  - Weekly slots filled (number + trend indicator)
  - Active users (number)
  - Upcoming meetings (number)
- Simple charts:
  - Booking trends (line chart)
  - Top mentors/mentees by activity (bar chart)
- **Chart Library:** Recharts (~50KB, lightweight, simple visualizations)
- **Interactivity:** Tooltips only, no drill-down or complex interactions

**Override Requests Tab:**
- Table/list of pending tier override requests
- Columns: Mentee name, Mentor name, Reason, Date requested
- Row actions: Approve (button), Deny (button), View details
- Approved/Denied requests in separate tabs or filter

**User Management Tab:**
- User search and filter
- User list with roles, reputation, status
- Actions: View profile, Edit reputation, Deactivate

**Meeting Management Tab:**
- All meetings list with filters (date range, user, status)
- Actions: View details, Cancel, Edit (white-glove scheduling)

**Audit Log Tab:**
- Filterable log table
- Columns: Action, Admin, Timestamp, Details, Reason
- Expandable rows for before/after values

**Components:** Dashboard grid layout, Card (KPI cards), Charts (line, bar - Recharts), Table with sortable columns, Button (actions), Tabs, Search, Filters

---

### Tag Management (Coordinator)

**Tag Management Tab:**
- Dedicated section in coordinator dashboard
- **Pending Approvals** view:
  - Table/list of new tags awaiting approval (from taxonomy table where `is_active = false`)
  - Columns: Tag category (industry/technology/stage), Tag value, Requested by, Date requested, Source
  - Row actions: Approve (button), Reject (button), View usage
  - Toast notification if user is currently online when new tag is submitted
- **Active Tags** view:
  - Searchable/filterable list of all approved tags
  - Columns: Category, Value, Display name, Usage count, Date added
  - Actions: Edit display name, Deactivate
- **Rejected Tags** view (optional):
  - Archive of rejected tags with rejection reasons

**Pending Tag Approval Toast:**
- Appears for coordinators when new tag is submitted while they're online
- Message: "New tag pending approval: {category} - {value}"
- Actions: "Review now" (links to tag management tab), Dismiss

**Components:** Table with sortable columns, Toast notification, Button (actions), Tabs, Search filter (by category), Badge (pending/active status)

**Note:** Auto-approval rules for certain users/scenarios is out of scope for MVP (future enhancement)

---

## 3.4 UI Consistency Requirements

### Component Usage Standards

**Buttons:**
- Primary actions: Blue, solid background (e.g., "Book Meeting", "Confirm")
- Secondary actions: Gray, outline (e.g., "Cancel", "View Profile")
- Destructive actions: Red, outline (e.g., "Delete", "Cancel Meeting")
- Icon buttons: Consistent sizing, hover states

**Forms:**
- Clear labels above inputs
- Required fields marked with asterisk (*)
- Validation errors inline, red text below input
- Help text gray, smaller font below input
- Consistent spacing between fields

**Loading States:**
- Skeleton screens for initial loads (card/list layouts)
- Spinners for button actions ("Loading..." with spinner)
- Disabled state during processing

**Empty States:**
- Friendly illustrations or icons
- Clear messaging: "No upcoming meetings"
- Call-to-action: "Browse mentors to schedule your first session"

**Toast Notifications:**
- Success: Green background, checkmark icon
- Error: Red background, X icon
- Info: Blue background, info icon
- Auto-dismiss after 5 seconds, dismissible via X button
- Positioned top-right corner

**Colors (Using Shadcn/Tailwind defaults):**
- Primary: Blue (actions, links)
- Success: Green (confirmations, positive states)
- Warning: Yellow (cautions, pending states)
- Error: Red (errors, destructive actions)
- Neutral: Gray scale (backgrounds, borders, text)

**Typography:**
- Headings: Bold, larger sizes (H1, H2, H3)
- Body: Regular weight, readable line-height
- Small text: Gray color for secondary info
- Monospace: For codes, IDs

**Spacing:**
- Consistent padding/margin using Tailwind's spacing scale
- Card padding: p-6 (24px)
- Section spacing: gap-4 or gap-6
- Component margins: mb-4, mt-6, etc.

---

## 3.5 User Experience Flows

### Flow 1: Mentee Booking a Meeting

1. **Entry:** Mentee logs in (OAuth: calendar auto-connected; Magic link: sees dismissible banner)
2. **Discovery:** Dashboard shows "Recommended Mentors" → Clicks "View All Mentors" or selects recommended mentor
3. **Selection:** Reviews mentor profile → Clicks "Book Meeting"
4. **Calendar Check:** If mentee has no connected calendar, modal appears: "Calendar connection required. To book meetings, please connect your calendar" with OAuth buttons
5. **Calendar Connection (if needed):** Mentee selects Google/Microsoft → OAuth flow → Returns to booking
6. **Slot Selection:** Week grid shows available slots → Enables "Show only when I'm available" filter → Clicks desired slot
7. **Booking Form:** Fills meeting goal (required) and materials (optional)
8. **Confirmation:** Reviews details (date/time/timezone) → Clicks "Confirm Booking"
9. **API Check:** System checks both mentor's and mentee's external calendars for conflicts (per FR106)
10. **Success:** Toast notification + calendar invite email sent + event added to both calendars
11. **Follow-up:** Reminder email 1 hour before (or 24 hours based on preference)

**UX Considerations:**
- **OAuth users:** Calendar auto-connected during signup, no prompts needed
- **Magic link users:** Can browse app freely, prompted for calendar only when attempting booking/availability action
- Real-time slot updates via Supabase Realtime (slot disappears if booked by another user)
- Clear timezone display throughout
- Minimum 1-day advance enforced with message if violated
- External calendar conflict check for both parties before confirmation (shows error if conflict detected)
- Mutual availability indicator (⭐) highlights slots when both parties are free

---

### Flow 2: Mentor Setting Availability

1. **Entry:** Mentor logs in (OAuth: calendar auto-connected; Magic link: sees dismissible banner) → Dashboard shows "Manage Availability"
2. **View:** List/cards display current availability blocks and upcoming bookings
3. **Create:** Clicks "Add Availability" → Form opens
4. **Calendar Check:** If mentor has no connected calendar, modal appears: "Calendar connection required. To create availability, please connect your calendar" with OAuth buttons
5. **Calendar Connection (if needed):** Mentor selects Google/Microsoft → OAuth flow → Returns to availability form
6. **Configure:** Selects recurrence, date range, time range, duration per slot, meeting type
7. **Preview:** System shows how many slots will be created (e.g., "This will create 4 slots per week")
8. **Save:** Clicks "Save" → Availability block appears in list
9. **Confirmation:** Toast notification: "Availability added"

**UX Considerations:**
- **OAuth users:** Calendar auto-connected during signup, no prompts needed
- **Magic link users:** Can browse app and view dashboard, prompted for calendar only when attempting to create availability
- Form validation prevents overlapping availability blocks
- Cannot delete availability blocks with confirmed bookings (shows error with booking count)
- Buffer time preview shows actual slot distribution (e.g., "30min slots + 10min buffer = 3 slots in 2 hours")

---

### Flow 3: Tier Override Request

1. **Entry:** Bronze mentee browses mentors → Sees Gold mentor (restricted)
2. **Restriction:** "Book Meeting" button disabled, "Request Exception" button shown with explanation
3. **Request:** Clicks "Request Exception" → Modal opens with reason field (required)
4. **Submit:** Enters reason → Clicks "Submit"
5. **Confirmation:** Toast: "Request sent to coordinator"
6. **Notification:** Coordinator receives email with:
   - Approve link (direct action)
   - Dashboard link (anchored to specific request)
7. **Approval:** Coordinator clicks Approve (in email or dashboard) → System updates permissions
8. **Notification:** Mentee receives email: "Your exception request was approved"
9. **Booking:** Mentee can now book that mentor (restriction temporarily lifted for that mentor only)

**UX Considerations:**
- Clear messaging about why mentor is restricted ("Gold mentors require Silver tier or exception")
- Expected response time displayed ("Coordinators typically respond within 24 hours")
- Request status visible in mentee's dashboard

---

### Flow 4: Post-Meeting Rating

1. **Trigger:** 1 hour after meeting end time → System checks if rating submitted
2. **Prompt:** Email sent: "How was your session with [NAME]?" with rate link
3. **Rating:** User clicks link → Rating modal opens (can also access from past meetings in dashboard)
4. **Selection:** Clicks 1-5 stars, optionally adds text feedback
5. **Submit:** Clicks "Submit Rating"
6. **Confirmation:** Toast: "Thank you for your feedback!"
7. **Update:** Reputation score recalculated (if both parties rated)

**UX Considerations:**
- Rating is optional (can skip or dismiss)
- Both parties rate independently (mutual rating requirement for score impact)
- Past meetings show "Rate this session" badge if not yet rated
- Ratings remain private between parties and coordinators

---

## 3.6 Responsive Considerations (Future Enhancement)

While MVP is desktop-optimized, structure is mobile-responsive:

**Layout Adaptations:**
- Grid → Single column on mobile
- Sidebar filters → Collapsible drawer
- Slot picker grid → Scrollable day/list view
- Tables → Card-based list view

**Touch Optimizations:**
- Larger touch targets (min 44x44px)
- Swipe gestures for navigation
- Bottom navigation bar for primary actions

**Performance:**
- Lazy loading for images and large lists
- Optimized bundle size (code splitting)

---
