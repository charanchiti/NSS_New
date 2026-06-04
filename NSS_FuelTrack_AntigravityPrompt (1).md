# NSS FuelTrack — Antigravity IDE Agent Prompt
# Copy everything below this line and paste into the Antigravity agent chat.

---

## PROJECT: NSS FuelTrack — Fuel Station DSM Payment Tracking App

Build a complete, production-ready **React + Vite + Tailwind CSS** web app called **NSS FuelTrack**. This is a mobile-first PWA for NSS Fuel Station (BPCL), Nangali, Karnataka. It lets DSMs (Daily Shift Managers) log fuel transactions in real time so the station owner can verify cash and digital collections per shift.

---

## TECH STACK (mandatory)

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (dark theme, mobile-first, max-width 480px)
- **Routing:** React Router v6
- **State:** React useState / useReducer (no Redux needed for MVP)
- **Storage:** localStorage for prices + session state for transactions (no backend for MVP — mirror the HTML prototype exactly)
- **PWA:** Add manifest.json + service worker so it can be installed from Chrome via "Add to Home Screen"
- **Language:** JavaScript (no TypeScript needed for MVP)

---

## DESIGN SYSTEM — inherit exactly from the HTML prototype

CSS variable palette to use throughout:
```
--gold: #f59e0b
--green: #22c55e
--blue: #3b82f6
--purple: #8b5cf6
--orange: #f97316
--pink: #ec4899
--red: #ef4444
--card: #1e293b
--border: #334155
--muted: #64748b
--sub: #94a3b8
--bg: #0f172a
```

Body background: `#0f172a`. Font: `Segoe UI, sans-serif`. Max width 480px centered. Dark theme throughout.

---

## APP STRUCTURE

The app has two states:

### State 1 — Setup Screen (shown before shift starts)
Full-screen centered card. No header, no bottom nav.

**Elements:**
- Logo: "NSS" in bold gold (#f59e0b), followed by "FuelTrack" in muted text
- Subtitle: "Start your shift to begin tracking"
- Label + text input: "DSM Name" — placeholder "Enter your name"
- Label + 3 toggle buttons: "Shift Type" — options: ☀️ Day | 🌙 Night | 🌅 Morning (only one selectable at a time, default = Day selected)
- "Start Shift →" button — DISABLED until DSM Name is non-empty; enabled when name typed
- On click: stores dsmName, shiftType, startTime (new Date()), hides setup, shows main app

### State 2 — Main App (shown after shift starts)
Has a sticky top header + 5-screen body + fixed bottom nav.

---

## TOP HEADER (sticky, z-index 100)

Left side:
- DSM name — bold, gold, 18px
- Below it: "DAY SHIFT · 2h 30m" — updates live every second (shift type + elapsed time since startTime)

Right side:
- Live clock — bold, 20px, updates every second, format: "02:45 PM" (12h Indian format)
- Below it: transaction count — e.g. "3 TXN" — updates on every add/delete

---

## BOTTOM NAV (fixed, 5 tabs)

Tabs in order: 🏠 Home | ➕ Entry | 📊 Report | 📋 History | ⚙️ Settings

- Active tab: gold color (#f59e0b)
- Inactive: muted (#64748b)
- Tapping a tab switches the active screen

---

## DATA CONSTANTS (hardcoded, used across all screens)

```js
const MODES = [
  { id: 'cash',     label: 'Cash',         icon: '💵', color: '#22c55e' },
  { id: 'upi',      label: 'UPI',          icon: '📱', color: '#3b82f6' },
  { id: 'penlabs',  label: 'Penlabs',      icon: '💳', color: '#8b5cf6' },
  { id: 'phonepay', label: 'PhonePe EDC',  icon: '🏧', color: '#f97316' },
  { id: 'otp',      label: 'OTP/Unbarath', icon: '🪪', color: '#ec4899' },
  { id: 'credit',   label: 'Credit',       icon: '📋', color: '#ef4444' },
];

const FUELS = [
  { id: 'ms',  label: 'MS (Petrol)' },
  { id: 'hsd', label: 'HSD (Diesel)' },
];

const VEHICLES = ['Bike', 'Car', 'Auto', 'Lorry', 'Bus', 'Other'];
```

---

## SCREEN 1 — DASHBOARD (Home tab, default active)

### Grand Total Card
- Background: gradient `linear-gradient(135deg, #1e3a5f, #1e293b)`, border `#2563eb44`
- Label: "TOTAL COLLECTION" (uppercase, muted blue)
- Amount: grand total of all transactions — format as ₹X,XX,XXX.XX (Indian locale)
- Sub-text: "X.XX Liters · X Transactions"

### Payment Mode Grid (2-column grid, 6 tiles)
For each of the 6 MODES, show a tile with:
- Left border 4px in mode color
- Mode emoji icon
- Mode label
- Amount collected via that mode (₹ formatted)
- "X txn · X.XL" below the amount
- If no transactions yet for that mode: show ₹0.00

### Recent Entries section
- Section title "Recent Entries" — only visible if ≥1 transaction exists
- Show last 5 transactions (index 0–4 of transactions array, which is reverse-chronological)
- Each row: vehicle name + "MS (Petrol) · XL" on left; payment mode badge + ₹ amount on right
- Mode badge: background = mode color at 13% opacity, text = mode color, includes mode icon

### Empty state
- If 0 transactions: show centered ⛽ emoji + "No transactions yet." + "Tap ➕ Entry to add one." in muted text
- Hide empty state when ≥1 transaction exists

---

## SCREEN 2 — ENTRY (➕ tab)

All contained in a single rounded card (`#1e293b` bg, rounded-2xl).

### Vehicle Type (chip buttons, single-select)
6 chips: Bike, Car, Auto, Lorry, Bus, Other
- Unselected: dark bg, muted border, muted text
- Selected: gold border, gold text, gold background at 13% opacity
- Default: Bike selected

### Fuel Type (chip buttons, single-select)
2 chips: MS (Petrol) | HSD (Diesel)
- Same selected/unselected style as vehicle chips
- Default: MS selected
- Changing fuel type re-triggers amount calculation

### Liters + Amount (side-by-side row)
Left: "Liters" label + number input (step 0.01, min 0, placeholder "0.00")
Right: "Amount (₹)" label + number input (step 0.01, min 0, placeholder "Auto")
- When liters input changes:
  - Read current fuel price (MS or HSD from prices state)
  - Calculate amount = liters × price, round to 2 decimal places
  - Auto-fill the amount field
  - Change amount input border to green (`#22c55e44`), background to dark green (`#0a1f0a`)
  - Show rate hint below amount: "@ ₹102.50/L → ₹1,537.50" in green text, 11px
- DSM can manually override the amount — that's allowed
- Rate hint disappears if liters field is cleared

### Payment Mode (3-column grid of 6 buttons)
Each button: emoji icon (22px) + label text below
- Unselected: dark bg, muted border, muted text
- Selected: button bg = mode color, border = mode color, text = white, font-weight bold
- Only one mode selectable at a time
- After saving a transaction, all mode buttons reset to unselected

### Note field (optional)
Single text input, placeholder "Customer name, vehicle no..."

### Save Transaction button
- Disabled (opacity 35%) until: liters filled + amount filled + payment mode selected
- When enabled and clicked:
  1. Create transaction object:
     ```js
     {
       id: Date.now().toString(36),
       vehicle: selVehicle,
       fuelId: selFuel,
       fuelLabel: FUELS.find(f => f.id === selFuel).label,
       liters: parseFloat(liters),
       amount: parseFloat(amount),
       note: noteValue,
       paymentMode: selMode,
       modeLabel: MODES.find(m => m.id === selMode).label,
       rateUsed: selFuel === 'ms' ? prices.ms : prices.hsd,
       timestamp: new Date(),
     }
     ```
  2. Prepend to transactions array (newest first)
  3. Clear liters, amount, note fields
  4. Reset amount field styling (remove green tint)
  5. Clear rate hint
  6. Reset payment mode selection
  7. Flash button: text changes to "✓ Saved!", background turns green for 1.4 seconds, then reverts
  8. Re-enable button only when fields are filled again
  9. Update header transaction count
  10. Refresh dashboard, report, history

---

## SCREEN 3 — REPORT (📊 tab)

### Header card
- "SHIFT REPORT" title in gold, letter-spacing 2px
- Line 1: "[DSM Name] · DAY SHIFT"
- Line 2: "Started: 02:30 PM · Duration: 2h 15m"

### Totals card (dark blue bg `#0f2540`, border `#1d4ed8`)
- "Total Liters Sold" → gold value e.g. "45.50 L"
- "Total Transactions" → gold value e.g. "12"
- Horizontal divider
- "GRAND TOTAL" (bold, 20px) → green value e.g. "₹4,832.50" (large, 900 weight)

### Mode-wise Breakdown section
For each mode that has ≥1 transaction, show a report row:
- Left: mode icon (22px) + mode name (bold, 15px) + "X txn · X.XXL" below
- Right: amount in mode color, bold, 17px

### Zero Collection section
- Title "Zero Collection" — only visible if any mode has 0 transactions
- Modes with 0 transactions shown in same row format but at 35% opacity

---

## SCREEN 4 — HISTORY (📋 tab)

### Section title
"All Transactions (X)" — count updates live

### Transaction rows (reverse-chronological, all transactions)
Each row is a card with:
- Top row left: payment mode badge (colored) + vehicle name (bold)
- Top row right: ₹ amount in gold
- Bottom row: fuel label + liters + "@ ₹X/L" + optional note + timestamp (right-aligned, 11px, muted)
- Delete button (✕) positioned absolute top-right, red color
  - On click: remove transaction from array, refresh all screens + header count

### Empty state
Show 📋 emoji + "No transactions yet" if array is empty

---

## SCREEN 5 — SETTINGS (⚙️ tab)

### Fuel Prices card
Title: "⛽ Fuel Prices"
Subtitle: "Set today's rate per litre. Amount auto-fills when DSM enters litres."

Price inputs (two rows):
- Row 1: "MS" badge (gold border/text) + ₹ prefix + number input for MS price
- Row 2: "HSD" badge (blue border/text) + ₹ prefix + number input for HSD price

"Save Prices" button:
- On click: validate both inputs are positive numbers; if invalid show alert
- Save to localStorage key `nss_prices` as `{ ms: 102.50, hsd: 89.00 }`
- Flash: text → "✓ Prices Saved!", bg → green, for 1.8 seconds then revert
- Recalculate amount if Entry screen has liters already entered

Current Rates display (2 pills side by side, shown after save):
- "MS / PETROL" label + ₹102.50 in gold
- "HSD / DIESEL" label + ₹89.00 in blue

**localStorage behavior:**
- On app load (before setup screen), read `nss_prices` from localStorage
- If found, use saved prices; if not, default to ms=102.50, hsd=89.00
- Prices survive app close and reopen

### Shift Info card
Title: "ℹ️ Shift Info"
Shows:
- DSM: [name]
- Shift: DAY SHIFT
- Started: [start time formatted as 02:30 PM]

---

## KEY BEHAVIORS (non-negotiable)

1. **Live clock** ticks every second — use `setInterval` in `useEffect`, clear on unmount
2. **Shift duration** updates every second alongside clock
3. **Transaction count** in header updates instantly on add or delete
4. **Dashboard** refreshes automatically when transaction is added or deleted
5. **Report** recalculates when navigated to AND when transactions change
6. **History** refreshes on add/delete
7. **Settings prices** load from localStorage on mount — even before setup screen
8. **Amount auto-calculation** recalculates if fuel type changes while liters are already entered
9. **Empty states** show/hide correctly as transactions are added/removed
10. **Save button** disables immediately after use and re-enables only when fields are filled

---

## FILE STRUCTURE

```
nss-fueltrack/
├── public/
│   ├── manifest.json          ← PWA manifest
│   └── icons/                 ← App icons (192px, 512px)
├── src/
│   ├── main.jsx
│   ├── App.jsx                ← Setup screen + main app shell + routing logic
│   ├── constants.js           ← MODES, FUELS, VEHICLES arrays
│   ├── hooks/
│   │   └── useClock.js        ← Live clock + shift duration hook
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── BottomNav.jsx
│   │   └── TransactionRow.jsx
│   └── screens/
│       ├── Dashboard.jsx
│       ├── Entry.jsx
│       ├── Report.jsx
│       ├── History.jsx
│       └── Settings.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## PWA MANIFEST (public/manifest.json)

```json
{
  "name": "NSS FuelTrack",
  "short_name": "FuelTrack",
  "description": "DSM Payment Tracking for NSS Fuel Station",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#f59e0b",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## UTILITY FUNCTIONS

```js
// Format as Indian Rupee with commas
function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Format time as "02:45 PM"
function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// Format duration from ms
function fmtDuration(startTime) {
  if (!startTime) return '—';
  const ms = new Date() - new Date(startTime);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h + 'h ' + m + 'm';
}
```

---

## DELIVERABLE REQUIREMENTS

1. Run `npm create vite@latest nss-fueltrack -- --template react` to scaffold
2. Install Tailwind CSS with Vite integration
3. Build all 5 screens + setup screen + header + bottom nav
4. All features listed above must work identically to the HTML prototype
5. App must be fully functional with `npm run dev`
6. No crashes, no missing features
7. Mobile-first — looks correct on 375px–480px screen width
8. PWA manifest included so it can be installed on Android

**DO NOT use any backend, database, or API calls. All data lives in React state (session) and localStorage (prices only). This is an exact feature-complete port of the HTML prototype into a React PWA.**

---

## SECURITY & ANTI-FRAUD RULES (MANDATORY — these close real loopholes a DSM could exploit)

The app must implement ALL of the following protections. These are non-negotiable business rules.

---

### LOOPHOLE 1 — DSM can delete any transaction to hide cash collection

**Problem:** The HTML prototype allows deleting any transaction with a single ✕ tap, no confirmation. A DSM can log a ₹2,000 cash sale, then delete it — the money is pocketed and no record exists.

**Fix — Implement these two rules:**

**Rule 1A — Deletion requires a reason:**
- When ✕ is tapped on any transaction, show a modal/dialog before deleting
- Modal title: "Delete Transaction?"
- Show the transaction details: amount, mode, vehicle, time
- Require the DSM to select a deletion reason from a dropdown:
  - "Wrong amount entered"
  - "Wrong payment mode"
  - "Wrong vehicle type"
  - "Duplicate entry"
  - "Customer cancelled"
- A "Reason" selection is mandatory — Delete button stays disabled until reason is chosen
- Buttons: "Cancel" (dismisses modal, no delete) | "Delete" (only enabled after reason selected)

**Rule 1B — Deletions are logged, not erased:**
- DO NOT actually remove the transaction from the array
- Instead, mark it as `deleted: true` and store `deletionReason`, `deletedAt: new Date()`
- All totals, dashboard, and report calculations must EXCLUDE deleted transactions (`filter(t => !t.deleted)`)
- History screen: show deleted transactions with a red strikethrough style and "DELETED" badge — they remain visible but visually struck through
- Deleted transactions count is shown separately at the bottom of History: "X deleted entries"
- The deletion reason is shown on the struck-through row

---

### LOOPHOLE 2 — DSM can manually override the auto-calculated amount to log a lower figure

**Problem:** The HTML lets DSM type any amount in the Amount field, overriding the calculated liters × price. A DSM can dispense 10L of petrol (₹1,025) but log ₹500 — pocketing the ₹525 difference.

**Fix — Override requires justification and is flagged:**

- When DSM manually changes the Amount field to a value different from the auto-calculated value (by more than ₹1 tolerance), immediately show a yellow warning banner below the amount field:
  ```
  ⚠️ Amount differs from calculated rate (₹1,025.00). A reason is required.
  ```
- Show a mandatory "Override Reason" text input below the warning — placeholder: "Why is the amount different?"
- The Save Transaction button stays DISABLED until the override reason is filled (minimum 5 characters)
- When the transaction is saved with an override, store `isOverride: true` and `overrideReason: "..."` on the transaction object
- In History, show an orange "OVERRIDE" badge on that transaction row
- In Report, show a warning count: "X manual overrides this shift" in orange below the grand total
- In Dashboard, show the override count in orange if > 0: "⚠️ X amount overrides"

---

### LOOPHOLE 3 — DSM can change fuel prices mid-shift to manipulate calculations

**Problem:** Settings screen is accessible to anyone. A DSM can lower the MS price from ₹102.50 to ₹80.00 mid-shift, then the auto-calculated amounts will be lower, and they pocket the difference between actual and logged.

**Fix — Price change is blocked mid-shift with a warning:**

- Once a shift is started (startTime is set), the Settings screen "Save Prices" button must be DISABLED
- Show a red warning label above the Save button: "🔒 Price changes are locked during an active shift. Only the owner can change prices before the next shift starts."
- The price INPUT FIELDS themselves should also be `readOnly` (grayed out) once shift is active
- Price changes are ONLY allowed before a shift is started (on the Setup screen flow) or after the app is reset for a new shift
- Current prices still display normally as read-only pills

---

### LOOPHOLE 4 — DSM can log a ₹0 or negative amount transaction

**Problem:** Nothing prevents entering liters = 0.01 and amount = 0 (or any negative value). A DSM could log fake micro-transactions or zero-amount cash entries to manipulate the count or hide real amounts.

**Fix — Input validation on Save:**

- Liters must be > 0 (strictly positive, not just non-empty)
- Amount must be > 0 (strictly positive)
- If either is zero or negative, show an inline red error: "Amount must be greater than ₹0" or "Liters must be greater than 0"
- Save button is disabled in these cases — do not just show an alert after click
- Additionally, enforce a reasonable upper bound: liters > 500 should show a yellow warning "⚠️ Unusually high litres — please verify" but still allow saving (not a hard block)

---

### LOOPHOLE 5 — DSM can open a new session and wipe all history by refreshing the browser

**Problem:** Transactions live in React session state only. A browser refresh or tab close destroys all transaction records. A DSM can log nothing, serve customers for cash, then claim the app crashed.

**Fix — Persist transactions to localStorage per shift:**

- Every time the transactions array changes (add or soft-delete), save it to localStorage under the key `nss_shift_transactions`
- On app load, after reading prices, also read `nss_shift_transactions` and `nss_shift_meta` (dsmName, shiftType, startTime)
- If a saved shift exists in localStorage:
  - Skip the Setup screen entirely
  - Restore the shift directly into the main app with all transactions recovered
  - Show a toast/banner at the top for 4 seconds: "✅ Shift restored — X transactions recovered"
- Add a "End Shift & Clear" button in Settings (below Shift Info), styled in red:
  - Shows a confirmation modal: "End shift for [DSM Name]? This will clear all transactions. Make sure the report has been shared first."
  - Only after confirmation: clear `nss_shift_transactions` and `nss_shift_meta` from localStorage and reload to Setup screen
  - This is the ONLY way to reset — refreshing the page alone must NOT clear data

---

### LOOPHOLE 6 — Anyone can access Settings and read/change prices (no role separation)

**Problem:** In the HTML, Settings is a normal tab accessible to any DSM. A DSM can see current prices (minor issue) or attempt to change them.

**Fix — Settings tab access control:**

- The Settings tab in the bottom nav must show a 🔒 lock icon overlay when tapped during an active shift
- When tapped, show a non-dismissible prompt: "Enter Owner PIN to access Settings"
- Implement a 4-digit PIN system:
  - Default PIN is `0000` (hardcoded for MVP)
  - PIN is stored in localStorage as `nss_owner_pin`
  - Allow PIN change inside Settings once unlocked (under a "Change PIN" section)
- If correct PIN entered → unlock Settings for 5 minutes (store unlockExpiry timestamp)
- If wrong PIN → show "Incorrect PIN" and increment attempt counter; after 3 wrong attempts, lock for 60 seconds with countdown shown
- After 5-minute unlock window expires, Settings auto-locks again (check on every Settings tab open)
- In the bottom nav, the Settings icon shows a small red dot if currently unlocked

---

### LOOPHOLE 7 — Credit mode can be used for any amount with no cap or tracking

**Problem:** Credit means "goods given on credit — no payment now." A DSM can log every transaction as Credit, hand over zero cash to the owner, and claim everything was credit. There is no cap, no alert, and no visibility.

**Fix — Credit mode gets special handling:**

- In the Entry screen, when "Credit" mode is selected, show a yellow inline banner:
  ```
  📋 Credit entry — no cash collected. This will be flagged in the report.
  ```
- In Dashboard, the Credit tile must always show in RED regardless of its mode color, with label "⚠️ Credit (No Cash)"
- In Report, add a dedicated section after Grand Total:
  ```
  ⚠️ Credit Alert: ₹X,XXX.XX given on credit across X transactions — verify with owner
  ```
  This section is highlighted in red/orange border and is always visible if Credit > 0
- Credit is excluded from "collectible" total: add a line in Report:
  ```
  Collectible Cash + Digital: ₹X,XXX.XX  (excludes credit)
  ```
- If total Credit amount exceeds ₹5,000 in a single shift, show a persistent red banner in the header: "⚠️ High Credit: ₹X,XXX"

---

### LOOPHOLE 8 — No way to verify the shift start time was legitimate

**Problem:** The startTime is set by `new Date()` when "Start Shift" is clicked. But the DSM could start the app late (after already serving customers off-record) and claim the shift just started.

**Fix — Shift start timestamp is locked and displayed prominently:**

- The shift start time must be stored in localStorage as `nss_shift_meta` immediately when shift is started
- The start time is NEVER recalculated or editable after being set
- In the Header, below the shift duration, show the exact start time: "Started 08:04 AM" in small muted text (in addition to the duration counter)
- In Report, the start time is shown in bold and labeled "Shift Started (recorded by app)"
- If the app is restored from localStorage (after a refresh), the original startTime is preserved exactly — not reset to current time

---

### SUMMARY — What to store in localStorage

```js
// Key: nss_prices
{ ms: 102.50, hsd: 89.00 }

// Key: nss_owner_pin
"0000"  // 4-digit string

// Key: nss_shift_meta
{ dsmName: "Raju", shiftType: "day", startTime: "2025-06-04T08:04:00.000Z" }

// Key: nss_shift_transactions
[
  {
    id: "abc123",
    vehicle: "Bike",
    fuelId: "ms",
    fuelLabel: "MS (Petrol)",
    liters: 5,
    amount: 512.50,
    note: "",
    paymentMode: "cash",
    modeLabel: "Cash",
    rateUsed: 102.50,
    timestamp: "2025-06-04T08:15:00.000Z",
    isOverride: false,
    overrideReason: null,
    deleted: false,
    deletionReason: null,
    deletedAt: null
  }
]
```

All localStorage reads must be wrapped in try/catch to handle parse errors gracefully.

---

### ADDITIONAL UI RULES FOR SECURITY FEATURES

- All modals (delete confirmation, PIN entry, shift end confirmation) must be:
  - Full-screen overlay with dark semi-transparent backdrop
  - Centered card with rounded corners, dark card background
  - Cannot be dismissed by clicking outside (only via explicit buttons)
- All warning banners (credit alert, override warning, high-litre warning) must use yellow or orange background with dark text — clearly visible on dark theme
- All locked/disabled states must show a visual lock icon (🔒) so DSM understands why something is blocked
- The "End Shift" button in Settings must be styled red and placed at the BOTTOM of the screen, below all other content, with the text "⚠️ End Shift & Clear Data"

