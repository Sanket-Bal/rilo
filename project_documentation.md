# RILO — Project Documentation
> Last updated to reflect all bug fixes: BikeDetailScreen document check, ConfirmationScreen realtime/cancel, useOwnerBookingRequests subscription stability.

---

## 1. Project Overview

**RILO** is a P2P two-wheeler rental platform for Tier 2 and Tier 3 cities in India. Tagline: "The Airbnb for Bikes & Scooters."

**Target Users:**
- **Renters** — People who need a bike/scooter for a few hours
- **Owners** — People with idle vehicles wanting passive income

**Core Features:**
- Passwordless OTP email auth
- Live GPS map with nearby bike discovery
- KYC document upload (Driving Licence + Aadhaar) — one-time, persisted
- Owner must approve every booking before ride starts
- Real-time booking approval system via Supabase realtime channels
- Renter can cancel pending request (refund triggered)
- Active ride timer with live fare calculation
- Post-ride fare settlement with refund/extra charge
- Star ratings + reviews + complaint reporting
- Owner dashboard: earnings, bike management, document storage
- Dual mode: same account can be both Renter and Owner

---

## 2. Tech Stack

### Core
| Package | Version |
|---------|---------|
| expo | ~54.0.0 |
| react-native | 0.81.5 |
| react | 19.1.0 |
| typescript | ~5.9.2 |

### Backend
| Package | Version |
|---------|---------|
| @supabase/supabase-js | ^2.105.1 |
| @react-native-async-storage/async-storage | 2.2.0 |

### Maps & Navigation
| Package | Version |
|---------|---------|
| react-native-maps | 1.20.1 |
| @react-navigation/native | ^7.2.2 |
| @react-navigation/stack | ^7.8.11 |

### UI & Media
| Package | Version |
|---------|---------|
| expo-linear-gradient | ~15.0.8 |
| expo-image-picker | ~17.0.11 |
| @react-native-community/slider | 5.0.1 |
| react-native-gesture-handler | ~2.28.0 |
| react-native-screens | ~4.16.0 |
| react-native-safe-area-context | ~5.6.0 |

### Location & Linking
| Package | Version |
|---------|---------|
| expo-location | ~19.0.8 |
| expo-linking | ~8.0.12 |
| expo-status-bar | ~3.0.9 |

### Design Tokens
- Primary Red: `#E8241A`
- Dark Background: `#1A1A1A` / `#0A0A0A`
- Light Background: `#FFFFFF` / `#F5F5F5`
- All overlay screens use `StyleSheet.absoluteFillObject` with zIndex layering

---

## 3. Database Schema (Supabase / PostgreSQL)

### `profiles`
Auto-created on signup. Stores display info.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, matches auth.users.id |
| full_name | text | Display name |
| avatar_url | text | Path in `avatars` storage bucket |
| created_at | timestamp | Auto |

### `bikes`
All listed vehicles.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| owner_id | uuid | FK → profiles.id |
| brand | text | Honda, Bajaj, etc. |
| model | text | Activa 6G, Pulsar 150, etc. |
| year | text | Manufacturing year |
| type | text | Scooter / Motorcycle / Electric Scooter / Electric Bike |
| condition | text | Excellent / Good / Fair |
| fuel_type | text | Petrol / Electric |
| fuel_policy | text | included / renter / electric |
| price_per_hour | number | Hourly rate INR |
| recommended_price | number | RILO suggested price |
| description | text | Owner description |
| special_instructions | text | Optional rules |
| city_only | boolean | Restricts intercity riding |
| pillion_allowed | boolean | |
| helmet_provided | boolean | |
| status | text | available / paused |
| latitude | float | GPS location |
| longitude | float | GPS location |
| city | text | Reverse geocoded |
| region | text | Reverse geocoded |
| created_at | timestamp | Auto |

### `bike_images`
Photos for each listed bike.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| bike_id | uuid | FK → bikes.id |
| image_path | text | Public URL from `bike-images` bucket |

### `bike_documents`
RC and insurance per bike.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| bike_id | uuid | FK → bikes.id |
| owner_id | uuid | FK → profiles.id |
| rc_front | text | Storage path in `bike-documents` bucket |
| rc_back | text | Storage path |
| insurance | text | Storage path |

### `documents`
Renter KYC — one row per user (upsert on conflict).
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id, UNIQUE |
| licence_front | text | Storage path in `documents` bucket |
| licence_back | text | Storage path |
| aadhar_front | text | Storage path |
| aadhar_back | text | Storage path |
| is_verified | boolean | Admin verification flag |

### `booking_requests`
Created when renter pays. Owner approves or rejects.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| booking_id | text | Human-readable e.g. RILO4X7K2A |
| bike_id | uuid | FK → bikes.id |
| owner_id | uuid | FK → profiles.id |
| renter_id | uuid | FK → profiles.id |
| duration | number | Hours booked |
| price_per_hour | number | Rate at booking time |
| deposit | number | Security deposit INR |
| platform_fee | number | 10% of ride fare |
| estimated_fare | number | price × duration |
| total_payable | number | deposit + platform_fee |
| renter_name | text | Copied at booking time |
| renter_email | text | Copied at booking time |
| bike_name | text | Copied at booking time |
| bike_type | text | Copied at booking time |
| payment_method | text | upi / card |
| status | text | pending / approved / rejected / expired / cancelled / completed |
| renter_location | jsonb | {latitude, longitude} |
| bike_location | jsonb | {latitude, longitude} |
| requested_at | timestamp | Auto |
| expires_at | timestamp | Set by DB (5 min after requested_at) |
| approved_at | timestamp | Set on approval |
| rejected_at | timestamp | Set on rejection |
| rejection_reason | text | Owner reason or "Cancelled by renter" |
| ride_ended_at | timestamp | Set when renter ends ride |

### `bookings`
Completed confirmed bookings. Used for earnings.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| bike_id | uuid | FK → bikes.id |
| owner_id | uuid | FK → profiles.id |
| renter_id | uuid | FK → profiles.id |
| total_paid | number | Amount collected |
| booking_status | text | active / upcoming / completed |
| created_at | timestamp | Auto |

### `ratings`
Post-ride ratings by renters.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| booking_id | text | Reference |
| renter_id | uuid | FK → profiles.id |
| owner_id | uuid | FK → profiles.id |
| bike_id | uuid | FK → bikes.id |
| owner_rating | number | 1–5 |
| bike_rating | number | 1–5 |
| review | text | Optional |
| tags | text[] | Selected quick tags |
| created_at | timestamp | Auto |

### `complaints`
Issue reports from renters or owners.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| reporter_id | uuid | FK → profiles.id |
| reported_id | uuid | FK → profiles.id (nullable) |
| reporter_type | text | renter / owner |
| booking_id | text | Reference |
| issue_type | text | damage / late / fraud / safety / etc. |
| description | text | Detail |
| status | text | pending / reviewed / resolved |
| created_at | timestamp | Auto |

---

## 4. Supabase Setup

### Storage Buckets
| Bucket | Contents | Access |
|--------|----------|--------|
| `avatars` | Profile photos | Public read |
| `documents` | Renter KYC docs | Private — signed URLs only |
| `bike-images` | Bike listing photos | Public read |
| `bike-documents` | Owner RC + insurance | Private — signed URLs only |

### Auth
- Provider: Email OTP (6-digit code, not magic link)
- `signInWithOtp({ email, options: { shouldCreateUser: true } })`
- `verifyOtp({ email, token, type: 'email' })`
- Session persisted via AsyncStorage adapter
- Deep link scheme: `rilo://auth` (Android intent filter in app.json)

### Realtime
- Table: `booking_requests`
- **Realtime must be enabled** on this table in Supabase Dashboard → Database → Replication
- Owner channel: `booking_requests_owner_{ownerId}` — listens for INSERT and UPDATE
- Channel is created once per owner session (stable — not re-subscribed on state changes)

---

## 5. Key TypeScript Types

### ActiveRide (App.tsx, HomeScreen.tsx)
```typescript
type ActiveRide = {
  bikeName: string;
  owner: string;
  bikeLocation: { latitude: number; longitude: number };
  bookingId: string;
  bookingRequestId: string;
  deposit: number;
  price: number;
  duration: number;
  ownerId: string;
} | null;
```

### BikeType (HomeScreen, BikeDetailScreen, BookingScreen, ConfirmationScreen)
```typescript
type BikeType = {
  id: string;
  name: string;           // "{brand} {model}"
  price: number;          // price_per_hour
  distance: string;       // "1.2 km" or "450m"
  gps: boolean;
  type: string;
  image: any;             // require() or { uri: string }
  owner: string;
  rating: number;
  year: string;
  condition: string;
  fuel: string;
  deposit: number;        // price_per_hour * 10
  brand?: string;
  model?: string;
  fuel_type?: string;
  fuel_policy?: string;
  owner_id?: string;
  latitude?: number;
  longitude?: number;
};
```

### BookingRequest (useOwnerBookingRequests, OwnerBookingRequestModal)
```typescript
type BookingRequest = {
  id: string;
  booking_id: string;
  bike_id: string;
  owner_id: string;
  renter_id: string;
  duration: number;
  price_per_hour: number;
  deposit: number;
  platform_fee: number;
  estimated_fare: number;
  total_payable: number;
  renter_name: string;
  renter_email: string;
  bike_name: string;
  bike_type: string;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  requested_at: string;
  expires_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
};
```

### RequestStatus (ConfirmationScreen)
```typescript
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
```

### DocumentState (DocumentUploadScreen)
```typescript
type DocumentState = { front: string | null; back: string | null; };
```

### DocState (BikeListingScreen)
```typescript
type DocState = { uri: string | null; uploading: boolean; };
```

### Screen (App.tsx)
```typescript
type Screen = 'login' | 'transition' | 'home';
```

---

## 6. Navigation Architecture

RILO uses **state-based conditional rendering** — no React Navigation stack for main flows. All screens are `StyleSheet.absoluteFillObject` Views with zIndex layering.

### Top-Level (App.tsx)
```
SplashScreen (zIndex: 10 — always on top until dismissed)
  ↓
[screen === 'login']
  LoginScreen → onOtpSent() → OTPScreen → onVerified() → screen = 'transition'

[screen === 'transition']
  TransitionScreen → onFinish() → screen = 'home'

[screen === 'home']
  HomeScreen (base)
  FareSettlementScreen (zIndex: 1100, overlaid after ride ends)
  RatingScreen (zIndex: 1100, overlaid after fare settlement)

Returning user: SplashScreen → screen = 'home' directly (with fade-in)
```

### HomeScreen Internal Navigation
```
HomeScreen
├── ProfileScreen (slide from right, zIndex: 999)
│   ├── EditProfileScreen
│   ├── MyDocumentsScreen
│   ├── MyRidesScreen
│   ├── NotificationsScreen
│   ├── HelpSupportScreen
│   └── AboutScreen
│
├── BikeDetailScreen (absoluteFill, zIndex: 999)  [UPDATED]
│   ├── DocumentUploadScreen (if docs missing)
│   │   └── BookingScreen (after upload complete)
│   │       └── ConfirmationScreen
│   └── BookingScreen (if docs already exist)
│       └── ConfirmationScreen
│
├── DocumentUploadScreen (from HomeScreen "Book" button, zIndex: 999)
│   └── BookingScreen → ConfirmationScreen
│
├── BookingScreen (from HomeScreen direct "Book", zIndex: 1000)
│   └── ConfirmationScreen (zIndex: 1100)
│
├── OwnerWelcomeScreen (zIndex: 999)
├── BikeListingScreen (zIndex: 1000)
├── OwnerHomeScreen (zIndex: 1000)
│   ├── OwnerProfileScreen (zIndex: 1001)
│   └── ReportScreen
│
└── OwnerBookingRequestModal (zIndex: 2000 — highest layer)
```

### Owner Mode Entry
```
HomeScreen "Owner Mode" button
  → query bikes table for owner_id = current user
    → bikes found: OwnerHomeScreen
    → no bikes: OwnerWelcomeScreen → BikeListingScreen → OwnerHomeScreen
```

---

## 7. Core User Flows

### Flow 1: New Renter — Method 1 (Direct "Book" from HomeScreen)

1. Splash → Login → OTP → Transition → HomeScreen
2. GPS permission → location → bikes loaded from Supabase
3. User taps "Book" on a bike card in the bottom sheet
4. `checkDocuments()` in HomeScreen queries `documents` table
5. No docs → DocumentUploadScreen → upload Licence + Aadhaar
6. After upload → BookingScreen
7. User sets duration, payment method → taps "Pay & Request"
8. `booking_requests` row inserted with status `pending`
9. ConfirmationScreen shown — polls every 3s (1.5s initial delay)
10. Owner's realtime channel fires INSERT event → OwnerBookingRequestModal appears immediately
11. Owner approves → DB status = `approved`
12. ConfirmationScreen poll detects `approved` → checkmark animation
13. User taps "Start Ride" → `onGoHome()` → HomeScreen active ride mode
14. User taps "End Ride" → FareSettlementScreen → RatingScreen

### Flow 2: Returning Renter — Method 2 (Via BikeDetailScreen)

1. Session found → HomeScreen directly (with fade-in)
2. User taps a bike card → BikeDetailScreen opens with animation
3. User taps "Book Ride"
4. `checkDocumentsAndProceed()` queries `documents` table
5. **Docs exist** → BookingScreen shown directly (skips upload)
6. **Docs missing** → DocumentUploadScreen → on complete → BookingScreen
7. Continues from step 7 in Flow 1

### Flow 3: Renter Cancels Pending Request

1. ConfirmationScreen showing "Request Sent, Please Wait"
2. User taps "Cancel Request"
3. Alert: "Are you sure? Deposit refunded within 24 hours."
4. User confirms → DB updated: `status = 'cancelled'`, `rejection_reason = 'Cancelled by renter'`
5. ConfirmationScreen shows "Booking Cancelled" state
6. Owner's Supabase UPDATE event fires → `useOwnerBookingRequests` hook detects `cancelled`
7. OwnerBookingRequestModal auto-dismisses (setCurrentRequest → null)
8. User taps "Back to Home" → returns to HomeScreen idle

### Flow 4: Owner Approves in Real-Time

1. Renter creates booking_request → DB INSERT
2. Supabase INSERT event fires on owner's stable channel
3. `useOwnerBookingRequests` hook receives event, sets `currentRequest`
4. OwnerBookingRequestModal slides in with animation
5. Owner taps "Approve & Confirm"
6. DB updated: `status = 'approved'`, `approved_at = now()`
7. Renter's next poll (within 3s) detects `approved`
8. ConfirmationScreen transitions to approved state

### Flow 5: Owner Lists a Bike

1. HomeScreen "Owner Mode" → no bikes found → OwnerWelcomeScreen
2. "Get Started" → BikeListingScreen (5-step wizard)
3. Step 1: brand/model/year/type/condition/fuel/policy (all required)
4. Step 2: minimum 3 photos (camera or gallery)
5. Step 3: city-only, pillion, helmet, description (description required)
6. Step 4: price slider ₹10–₹200/hr with earnings estimate
7. Step 5: RC front, RC back, Insurance upload (all required)
8. Submit: `bikes` row created with current GPS, photos uploaded to `bike-images`, docs to `bike-documents`
9. OwnerHomeScreen shown

---

## 8. Screen & Component Details

### App.tsx
**State:** `splashVisible`, `screen`, `activeRide`, `showFareSettlement`, `showRating`, `completedRide`, `sessionChecked`, `isReturningUser`, `otpEmail`, `showOtp`  
**Key logic:** On mount checks `supabase.auth.getSession()`. Subscribes to `onAuthStateChange`. Splash finish handler triggers home screen fade-in for returning users. Active ride data flows as props to HomeScreen.

---

### SplashScreen
**Props:** `onFinish: () => void`, `isReturningUser?: boolean`  
New user: 3.5s delay then fade out. Returning user: 2.8s delay, dark→light background crossfade, logo scale-out, then `onFinish()`.

---

### LoginScreen
**Props:** `onContinue: () => void`, `onOtpSent: (email: string) => void`  
Calls `supabase.auth.signInWithOtp()`. Animated border color interpolation on focus. Basic email format validation.

---

### OTPScreen
**Props:** `email: string`, `onVerified: () => void`, `onBack: () => void`  
Hidden TextInput drives custom 6-box digit UI. Auto-focuses on mount. 30s resend timer. Calls `supabase.auth.verifyOtp()`.

---

### TransitionScreen
**Props:** `onFinish: () => void`  
Sequential animation: logo rises, scales 2.5x, background shifts dark→light, then logo fades and scales down. Total ~2.5s.

---

### HomeScreen
**Props:** `activeRide: ActiveRide`, `onRideStart: (ride) => void`, `onRideEnd: () => void`  
**Key state:** 10+ booleans for sub-screens, plus `location`, `bikes`, `markers`, `userInitial`, `userAvatarUrl`, `isOwner`, `currentUserId`  
**`fetchBikes(lat, lng)`:** Queries available bikes, joins first image from `bike_images`, owner name from `profiles`, calculates Haversine distance.  
**`checkDocuments(bike)`:** Checks `documents` table with `limit(1)`. Routes to BookingScreen or DocumentUploadScreen.  
**Bottom sheet:** `PanResponder` + `Animated.Value` between 35%–75% screen height. Active ride mode shows timer and End Ride button.  
**Owner detection:** Counts `bikes` where `owner_id = user.id` on mount. If count > 0, activates `useOwnerBookingRequests`.

---

### BikeDetailScreen ✅ FIXED
**Props:** `bike: BikeType`, `onBack`, `userLocation`, `onRideStart`  
**State:** `showDocs`, `showBooking`, `docsAlreadyUploaded`, `currentImage`  
**`checkDocumentsAndProceed()`:** Queries `documents` table. Docs exist → `setShowBooking(true)`. No docs → `setShowDocs(true)`.  
**Flow after docs:** `DocumentUploadScreen.onComplete` → `setShowBooking(true)`. `BookingScreen.onConfirm` → `setShowBooking(false)` + `onRideStart()`.  
**Entry animation:** Image zoom-in (scale 0.4→1) → arrows fade in → content slides up from below.

---

### DocumentUploadScreen
**Props:** `onBack`, `onComplete`, `bike?: BikeType`, `userLocation?`  
Uploads 4 images to `documents` Supabase Storage bucket via `FileReader` + ArrayBuffer. Upserts `documents` row. After complete: if `bike` prop exists, shows `BookingScreen` inline.

---

### BookingScreen
**Props:** `bike`, `onBack`, `onConfirm(rideData)`, `userLocation`  
**Fare:** `rideFare = price × duration`, `platformFee = rideFare × 0.1`, `totalPayable = deposit + platformFee`  
Inserts `booking_requests` with all fields. On success, renders `ConfirmationScreen` with `bookingRequestId`.

---

### ConfirmationScreen ✅ FIXED
**Props:** `bike`, `duration`, `userLocation`, `onGoHome(rideData)`, `bookingRequestId`  
**State:** `requestStatus` ('pending' | 'approved' | 'rejected' | 'cancelled'), `bookingId`, `minutesLeft`, `cancelling`  
**`statusRef`:** useRef tracks current status to prevent stale closure in polling interval.  
**`checkApprovalStatus()`:** Only runs if `statusRef.current === 'pending'`. Only changes state on explicit DB status values. Never changes state on `pending`.  
**`handleCancel()`:** Alert confirmation → updates DB to `cancelled` → owner modal auto-dismisses via realtime.  
**Initial delay:** 1500ms before first poll to allow DB write to complete.  
**Four render states:** pending (pulsing spinner + Cancel button + Go Home), approved (checkmark + map + Start Ride), rejected (X icon + Back to Home), cancelled (X icon + Back to Home).

---

### FareSettlementScreen
**Props:** `bikeName`, `owner`, `deposit`, `pricePerHour`, `duration`, `bookingId`, `bookingRequestId`, `onContinueToRating`  
`rideFare = pricePerHour × duration`  
`platformFee = rideFare × 0.1`  
`refundAmount = max(0, deposit - rideFare - platformFee)`  
`extraCharge = max(0, rideFare + platformFee - deposit)`  
Marks `booking_requests` as `completed` on mount.

---

### RatingScreen
**Props:** `bikeName`, `owner`, `ownerId`, `bikeId`, `bookingId`, `onDone`  
Separate 1–5 star ratings for owner and bike. Both required before submit. Quick tags: 8 options, multi-select. Optional 300-char review. Inserts to `ratings`. Report button opens ReportScreen.

---

### ProfileScreen
**Props:** `onBack: () => void`  
Fetches profile + avatar from Supabase. Checks if user has listed bikes (hides "List Bike" menu item if so). Menu items: My Rides, My Documents, Notifications, Help, About. Logout clears Supabase session.

---

### ReportScreen
**Props:** `onBack`, `reporterType?: 'owner' | 'renter'`, `bookingId?`, `reportedUserName?`, `reportedUserId?`  
Owner issue types: damage, late return, fuel, rude, no-show, other.  
Renter issue types: poor condition, owner no-show, rude, fraud, safety, other.  
Saves to `complaints` table.

---

### OwnerBookingRequestModal
**Props:** `bookingRequest: BookingRequest | null`, `onApprove(id)`, `onReject(id, reason?)`, `onDismiss`  
Renders null when `bookingRequest` is null. Entry animation: parallel fade + translateY + scale. Shows renter info, bike details, fare breakdown, expiry countdown (minutes). Approve/Reject update DB directly. Auto-dismisses when renter cancels (via realtime UPDATE in hook).

---

### useOwnerBookingRequests ✅ FIXED
**Parameter:** `ownerId: string | undefined`  
**Returns:** `currentRequest`, `pendingRequests`, `loading`, `error`, `approveRequest`, `rejectRequest`, `dismissRequest`, `fetchPendingRequests`  
**Fix:** `useEffect` dependency array is now `[ownerId]` only. Channel is created once and stays stable for the owner session lifetime.  
**INSERT handler:** New `pending` request → prepend to list, set as `currentRequest` if none exists.  
**UPDATE handler:** `cancelled` → dismiss modal (setCurrentRequest null). Other statuses → update list + keep modal visible.

---

## 9. Implementation Status

### Working ✅
- Full auth: OTP login, session persistence, logout
- Splash animations (new user + returning user)
- GPS location + reverse geocoding
- Bike fetch from Supabase with Haversine distance
- **BikeDetailScreen document check before booking (fixed)**
- KYC document upload flow
- Booking creation with fare calculation
- **ConfirmationScreen no longer instant-denies on pending (fixed)**
- **Cancel booking feature with confirmation Alert (new)**
- Real-time owner booking request modal (INSERT + UPDATE)
- **Stable Supabase realtime subscription — no churn (fixed)**
- **Owner modal auto-dismisses when renter cancels (new)**
- Active ride timer in HomeScreen
- FareSettlementScreen with refund/extra charge
- RatingScreen with tags and review
- ProfileScreen, EditProfile, MyDocuments, MyRides
- ReportScreen (renter + owner)
- Full owner onboarding → BikeListingScreen (5 steps) → OwnerHomeScreen
- Owner dashboard: earnings, pause/activate, unlist with booking checks
- OwnerProfileScreen with signed document URLs

### Partial / Needs Attention ⚠️
- **Active ride never starts from ConfirmationScreen via BikeDetailScreen path** — `BikeDetailScreen.BookingScreen.onConfirm` calls `onRideStart()` which is a no-op (just closes screens). The `setActiveRide` in App.tsx is only wired via the `HomeScreen → checkDocuments → BookingScreen → ConfirmationScreen → onGoHome` path. The BikeDetailScreen path does not pass ride data back up to App.tsx.
- **`booking_requests.expires_at`** — the 5-minute expiry countdown display assumes this is set by a DB trigger/function. If no trigger exists, it defaults to null and the countdown shows the hardcoded 5-minute value forever.
- **Ratings are hardcoded to 4.5** — fetched bikes always get `rating: 4.5`, not read from `ratings` table.

### Not Started ❌
- Push notifications (in-app polling only)
- Real payment gateway (UPI/Card selection is UI-only)
- GPS hardware tracker API
- Actual route display during active ride (MapViewDirections imported but unused)
- Admin panel for complaints
- Earnings History screen (menu item exists, screen not built)

---

## 10. Known Issues

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | Supabase anon key hardcoded in source | Medium | `src/lib/supabase.ts` |
| 2 | Active ride not started from BikeDetailScreen booking path | High | `BikeDetailScreen.tsx` → `App.tsx` |
| 3 | `expires_at` countdown requires DB trigger to set value | Medium | `booking_requests` table |
| 4 | All bike ratings hardcoded to 4.5 | Low | `HomeScreen.tsx` |
| 5 | OwnerProfileScreen menu items (Earnings, Notifications, About) have no onPress handlers | Low | `OwnerProfileScreen.tsx` |
| 6 | BikeDetailScreen shows same image 3× in carousel | Low | `BikeDetailScreen.tsx` |
| 7 | No real payment processing — UPI/Card is UI-only | Critical (for production) | `BookingScreen.tsx` |

---

## 11. Security Notes

| Item | Status |
|------|--------|
| Supabase anon key in source | ⚠️ Should be in `.env` via `expo-constants` |
| `documents` bucket privacy | Verify it is NOT public in Supabase Storage settings |
| `bike-documents` bucket privacy | Verify private — OwnerProfileScreen correctly uses signed URLs |
| RLS policies on `booking_requests` | Verify enabled: renters can only see their own, owners can only see theirs |
| RLS on `documents` | Verify enabled: users can only read/write their own row |
| Input sanitization | None — text fields go directly to DB |
| Fake payment flow | Payment method selection does nothing — no gateway integrated |
