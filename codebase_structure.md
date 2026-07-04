# RILO — Codebase Structure
> Last updated to reflect all bug fixes including BikeDetailScreen document check, ConfirmationScreen realtime fixes, cancel booking feature, and useOwnerBookingRequests subscription stability fix.

## Project Root

```
rilo/
├── App.tsx                        # Root component: session management, auth flow, active ride state, fare/rating overlay
├── index.ts                       # Expo entry point: registers root component
├── app.json                       # Expo config: name, slug, scheme, newArchEnabled:false, Android deep link
├── package.json                   # Dependencies and npm scripts
├── tsconfig.json                  # TypeScript config extending Expo base
├── CLAUDE.md                      # Project DNA: vision, architecture, coding standards, roadmap
├── codebase_structure.md          # This file
├── project_documentation.md      # Full architecture and implementation documentation
│
├── assets/
│   ├── RILO_logo.png              # Primary app logo used on splash, login, owner welcome
│   ├── activa.png                 # Fallback bike image (Honda Activa)
│   ├── pulsar.jpg                 # Sample bike image (Bajaj Pulsar)
│   ├── enfield.jpg                # Sample bike image (Royal Enfield)
│   ├── Jupiter.jpg                # Sample bike image (TVS Jupiter)
│   ├── icon.png                   # App icon
│   ├── adaptive-icon.png          # Android adaptive icon foreground
│   ├── splash-icon.png            # Expo splash screen image
│   └── favicon.png                # Web favicon
│
└── src/
    ├── lib/
    │   └── supabase.ts            # Supabase client with AsyncStorage auth persistence + handleDeepLink
    │
    ├── hooks/
    │   └── useOwnerBookingRequests.ts  # Stable realtime hook for owner booking requests; dep array fixed to [ownerId] only
    │
    ├── components/
    │   └── OwnerBookingRequestModal.tsx  # Animated modal for owner approve/reject; auto-dismisses on renter cancel
    │
    └── screens/
        ├── SplashScreen.tsx           # Animated splash: dark→light bg transition (new vs returning user paths)
        ├── LoginScreen.tsx            # Email input + Supabase OTP trigger on dark gradient
        ├── OTPScreen.tsx              # 6-digit OTP entry with custom digit boxes and 30s resend timer
        ├── TransitionScreen.tsx       # Logo animation after new user login (dark→light background shift)
        ├── HomeScreen.tsx             # Main map screen: GPS, bike list, bottom sheet, ride timer, owner modal
        ├── BikeDetailScreen.tsx       # [FIXED] Checks documents before booking; routes to BookingScreen or DocumentUploadScreen
        ├── DocumentUploadScreen.tsx   # KYC upload: Driving Licence + Aadhaar front/back; proceeds to BookingScreen on complete
        ├── BookingScreen.tsx          # Duration slider, payment method, fare breakdown, creates booking_request row
        ├── ConfirmationScreen.tsx     # [FIXED] Polls for approval; never auto-denies on pending; Cancel Request button added
        ├── FareSettlementScreen.tsx   # Post-ride: refund/extra charge calc, marks booking completed in DB
        ├── RatingScreen.tsx           # Star ratings for owner + bike, tags, review, report link
        ├── ProfileScreen.tsx          # User profile: avatar, menu, logout
        ├── EditProfileScreen.tsx      # Edit name + upload profile photo to Supabase Storage
        ├── MyDocumentsScreen.tsx      # View KYC documents via signed Supabase Storage URLs
        ├── MyRidesScreen.tsx          # Ride history from bookings table
        ├── NotificationsScreen.tsx    # Notification preferences UI shell
        ├── HelpSupportScreen.tsx      # FAQ + contact support (static content)
        ├── AboutScreen.tsx            # App version and credits (static content)
        ├── ReportScreen.tsx           # Issue report form for renters and owners; saves to complaints table
        │
        └── owner/
            ├── OwnerWelcomeScreen.tsx     # Owner onboarding: benefits, how-it-works, requirements
            ├── BikeListingScreen.tsx      # 5-step bike listing wizard: details, photos, conditions, pricing, documents
            ├── OwnerHomeScreen.tsx        # Owner dashboard: earnings, bike list, pause/unlist, report renter
            └── OwnerProfileScreen.tsx     # Owner profile: stats, bike document viewer (signed URLs), logout
```

---

## File Descriptions

### `/` Root

| File | Description |
|------|-------------|
| `App.tsx` | Central state machine. Checks Supabase session on mount. Manages `screen` state (login/transition/home), `activeRide`, fare settlement, and rating overlay. Renders all top-level screens with zIndex layering. |
| `index.ts` | Calls `registerRootComponent(App)` — Expo entry point. |
| `app.json` | Expo project config. `newArchEnabled: false` for Expo Go compatibility. `scheme: "rilo"` for deep links. Android intent filter for auth redirects. |
| `package.json` | All dependencies. Expo SDK 54, RN 0.81.5, Supabase JS 2.105.1. |
| `tsconfig.json` | TypeScript config. Extends `expo/tsconfig.base`. |
| `CLAUDE.md` | Project DNA document. Vision, stack, architecture, coding standards, current status. |

---

### `src/lib/`

| File | Description |
|------|-------------|
| `supabase.ts` | Creates Supabase client with AsyncStorage session persistence. Exports `supabase` and `handleDeepLink`. ⚠️ Anon key is hardcoded — should move to `.env`. |

---

### `src/hooks/`

| File | Description |
|------|-------------|
| `useOwnerBookingRequests.ts` | **[FIXED]** Supabase realtime hook for owner. Subscribes to INSERT (new requests) and UPDATE (status changes) on `booking_requests`. Dependency array is now `[ownerId]` only — prevents subscription churn. UPDATE handler dismisses modal on `cancelled` status. Exports `approveRequest`, `rejectRequest`, `dismissRequest`. Also exports `useOwnerBookingRequestCount` for badge display. |

---

### `src/components/`

| File | Description |
|------|-------------|
| `OwnerBookingRequestModal.tsx` | Full-screen animated modal (zIndex 2000). Shows when owner has a pending booking request. Entry: fade + slide + scale. Displays renter info, bike details, fare breakdown, expiry countdown. Approve/Reject buttons update DB. Auto-dismisses when renter cancels (via realtime UPDATE event). |

---

### `src/screens/`

| File | Description |
|------|-------------|
| `SplashScreen.tsx` | Dark gradient with RILO logo. New user: fades out after 3.5s. Returning user: background transitions dark→white, logo scales out. |
| `LoginScreen.tsx` | Email input on dark gradient. Animated border on focus. Calls `supabase.auth.signInWithOtp()`. |
| `OTPScreen.tsx` | 6-digit code entry backed by hidden TextInput. Custom digit box UI. Calls `supabase.auth.verifyOtp()`. 30s countdown resend timer. |
| `TransitionScreen.tsx` | Post-login animation for new users. Logo rises + scales, background shifts dark→light, logo fades into HomeScreen. |
| `HomeScreen.tsx` | Core screen. Google Maps with live GPS, animated drag-to-expand bottom sheet, bike list from Supabase, active ride timer, owner mode toggle, `useOwnerBookingRequests` integration, `OwnerBookingRequestModal`. |
| `BikeDetailScreen.tsx` | **[FIXED]** Image carousel, details grid, mini-map, pricing. "Book Ride" button now calls `checkDocumentsAndProceed()`: queries `documents` table — if docs exist, goes straight to `BookingScreen`; if not, shows `DocumentUploadScreen` first. Both flows complete fully within this screen. |
| `DocumentUploadScreen.tsx` | KYC: Driving Licence + Aadhaar front/back via camera or gallery. Uploads to `documents` Supabase Storage. Saves paths to `documents` table. On complete, navigates to `BookingScreen`. |
| `BookingScreen.tsx` | Duration slider (1–12hr), UPI/Card payment method, fare breakdown (deposit + 10% platform fee). Inserts `booking_requests` row. Passes `bookingRequestId` to `ConfirmationScreen`. |
| `ConfirmationScreen.tsx` | **[FIXED — 3 changes]** (1) Never auto-denies on `pending` status — only changes state when DB explicitly returns `approved`/`rejected`/`cancelled`/`expired`. (2) Initial poll delayed 1.5s to let DB write settle. (3) Cancel Request button: shows Alert "Are you sure?", updates DB to `cancelled`, owner modal auto-dismisses. Four render states: pending / approved / rejected / cancelled. |
| `FareSettlementScreen.tsx` | Post-ride summary. Calculates `rideFare = price × duration`, `platformFee = 10%`, refund or extra charge. Marks `booking_requests` as `completed`. CTA leads to RatingScreen. |
| `RatingScreen.tsx` | Separate star ratings for owner and bike. Quick tag multi-select. Optional text review. Submits to `ratings` table. Report button links to ReportScreen. |
| `ProfileScreen.tsx` | Slides in from right. Avatar, name, email. Menu: My Rides, My Documents, Notifications, Help, About. Logout via `supabase.auth.signOut()`. Hides "List Bike" menu item if user is already an owner. |
| `EditProfileScreen.tsx` | Edit full name, upload profile photo. Saves to `profiles` table and `avatars` storage bucket. |
| `MyDocumentsScreen.tsx` | Displays uploaded KYC docs as images using 1hr signed Supabase Storage URLs. |
| `MyRidesScreen.tsx` | Lists completed rides from `bookings` table. |
| `NotificationsScreen.tsx` | Notification preferences UI (shell — no backend). |
| `HelpSupportScreen.tsx` | FAQ accordion. Static content. |
| `AboutScreen.tsx` | Version info, credits. Static content. |
| `ReportScreen.tsx` | Issue form with different issue types for renter vs owner. Saves to `complaints` table with `reporter_type`, `issue_type`, `description`. |

---

### `src/screens/owner/`

| File | Description |
|------|-------------|
| `OwnerWelcomeScreen.tsx` | Owner onboarding marketing screen. Stats, how-it-works steps, 5 benefit cards, requirements checklist. Leads to BikeListingScreen. |
| `BikeListingScreen.tsx` | 5-step listing wizard. Step 1: bike details. Step 2: photos (min 3). Step 3: conditions + description. Step 4: price slider with earnings estimate. Step 5: RC + insurance upload. Creates `bikes`, `bike_images`, `bike_documents` records. |
| `OwnerHomeScreen.tsx` | Owner dashboard. Earnings card. Bike cards with image, status badge, pause/activate toggle, unlist (checks for active bookings first, cascades delete of storage + DB records). Report Renter button. FAB for listing new bike. |
| `OwnerProfileScreen.tsx` | Owner profile. Avatar, "Verified Owner" badge, performance stats, collapsible bike document viewer with signed URLs, menu items, logout. |

---

## Key Changes Since Initial Version

| File | Change |
|------|--------|
| `BikeDetailScreen.tsx` | Added `checkDocumentsAndProceed()`, `showBooking` state, `BookingScreen` import. Book button now checks DB before routing. |
| `ConfirmationScreen.tsx` | Removed instant-deny bug (expires_at null check). Added `statusRef` to prevent stale closure polling. Added `handleCancel()` with Alert + DB update. Added cancelled render state. Added 1.5s initial poll delay. |
| `useOwnerBookingRequests.ts` | Fixed dependency array from `[ownerId, fetchPendingRequests, currentRequest]` to `[ownerId]`. Added `cancelled` status handling in UPDATE handler. |
