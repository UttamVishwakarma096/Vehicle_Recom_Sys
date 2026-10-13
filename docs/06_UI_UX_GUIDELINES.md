# UI/UX Guidelines and Component Architecture

**Product:** Smart Vehicle Recommendation System  
**Status:** Updated for review (User-selected Glassmorphism direction)  
**Visual direction:** Glassmorphism (frosted translucent surfaces, backdrop blur, ambient light refraction, sleek rounded corners, subtle specular borders, and soft diffuse shadows)  
**Source documents:** `01_PRD.md` through `05_API_SPECIFICATION.md`  
**Version:** 1.2

## 1. UX principles

1. Help people compare relevant options without suggesting that a score
   guarantees satisfaction, safety, reliability, or lifespan.
2. Distinguish verified, unverified, unknown, and unavailable data.
3. Keep user choices and trade-offs visible; do not hide important
   limitations behind a score.
4. Allow visitors to discover vehicles before asking them to register.
5. Make the main flows usable on mobile, keyboard, and assistive
   technology.
6. Never display fabricated vehicle details as real catalog data.
7. Provide clear loading, empty, validation, success, and recoverable
   error states.

## 2. Navigation and page hierarchy

### Public navigation

- Home
- Explore vehicles
- Get recommendations
- Compare (available after at least two vehicles are selected)
- Sign in / Create account

### Authenticated user navigation

- Dashboard
- Saved vehicles
- Preferences
- Account/profile
- Sign out

### Administrator navigation

- Admin dashboard
- Vehicle catalog management
- Add/edit vehicle
- Sign out

Admin navigation is rendered only for an authenticated administrator,
but the Catalog Service independently enforces authorization for every
admin operation.

## 3. Required pages and layouts

### 3.1 Home

- Brief product explanation and primary actions: explore catalog or
  start the recommendation questionnaire.
- Featured content may appear only if backed by published catalog data.
- Do not hardcode production vehicle cards or performance claims.

### 3.2 Vehicle discovery

- Search input and filters for supported catalog fields.
- Desktop: filter controls alongside a paginated result list/grid.
- Mobile: filters open in an accessible drawer/sheet and show active
  filter count.
- Vehicle cards show only available published fields, price type, and
  data-quality cues.
- Users can add/remove a vehicle from a local comparison selection.
- Provide sorting and pagination according to the API contract.

### 3.3 Vehicle details

- Name/identity information and available supported vehicle imagery
  only when licensed.
- Price panel labels ex-showroom, on-road, and used prices distinctly.
- Specification groups render only the fields available from the API.
- Provenance and verification date should be discoverable near the
  relevant fields.
- Favorite and compare actions are clearly labeled.

### 3.4 Recommendation questionnaire

- Group fields into concise steps or sections: budget, vehicle needs,
  driving context, and priorities.
- Show currency and price type explicitly for budget fields.
- Label mandatory versus optional inputs; do not make an optional
  preference appear required.
- Explain that stated priorities influence a match score, not an
  objective vehicle rating.
- Support partial progress without silently saving preferences unless
  the user is signed in and explicitly saves them.

### 3.5 Recommendation results

- Show result count, applied constraints, and any filters that removed
  candidates.
- Each result includes rank, backend-calculated match score, matched
  reasons, trade-offs, and missing-data warnings.
- The UI does not recalculate, adjust, or infer the score.
- Make the score disclaimer visible: it is a preference match, not a
  probability or guarantee.
- Empty results offer relevant preference edits without relaxing
  mandatory criteria silently.

### 3.6 Vehicle comparison

- Compare fields in stable rows with consistent ordering across
  vehicles.
- Clearly distinguish missing values from zero or “not applicable.”
- Keep vehicle identity visible while scrolling on larger screens.
- On narrow screens, use horizontally scrollable comparison columns
  with keyboard-accessible controls or a stacked comparison layout.
- Enforce the comparison cap returned/documented by the API; the current
  proposed cap of four is not final until approved.

### 3.7 Sign in and registration

- Provide labeled inputs, inline validation, and password visibility
  control if implemented accessibly.
- Use generic sign-in failure messaging to avoid account enumeration.
- Explain what data is needed without promising unapproved privacy or
  retention behavior.

### 3.8 User dashboard

- Summarize saved vehicles and preference completion only from
  authenticated API results.
- Provide direct links to discovery, saved vehicles, and preferences.
- Do not expose other users' data.

### 3.9 Saved vehicles

- Display current catalog data fetched through the Recommendation
  Service/Catalog Service contract.
- If a vehicle is unavailable or unpublished, show a safe unavailable
  state and a remove action.
- Duplicate favorite behavior follows the API's idempotent contract.

### 3.10 Admin dashboard and vehicle management

- Separate admin route group and navigation.
- Support listing, filtering, creating, editing, and changing publication
  status as documented in the API.
- Show provenance and verification fields distinctly from vehicle
  specifications.
- Mark draft/unpublished content clearly.
- Require confirmation for destructive actions; prefer unpublish where
  product policy dictates.
- UI role checks are convenience only; server-side authorization is
  mandatory.

### 3.11 Longevity information

- Hide or mark predictive controls unavailable until the evidence and
  model gate is passed.
- A non-predictive suitability score, if approved, must be labeled
  “heuristic” or “suitability,” describe the inputs, and state its
  limitations.
- Never present a heuristic as AI or ML prediction.
- If an approved experimental prediction exists, display its target,
  evaluation-backed uncertainty, model/version context, and limitations
  supplied by the backend.

## 4. Component hierarchy

```text
Application
├── AppShell
│   ├── SiteHeader / PrimaryNavigation
│   ├── MainContent
│   └── SiteFooter
├── PublicRoutes
│   ├── HomePage
│   ├── VehicleDiscoveryPage
│   │   ├── VehicleSearch
│   │   ├── VehicleFilters
│   │   ├── VehicleList
│   │   │   └── VehicleCard
│   │   └── Pagination
│   ├── VehicleDetailsPage
│   │   ├── PriceSummary
│   │   ├── SpecificationSection
│   │   └── DataProvenance
│   ├── RecommendationQuestionnairePage
│   ├── RecommendationResultsPage
│   │   └── RecommendationCard
│   │       ├── MatchScore
│   │       ├── MatchReasons
│   │       ├── TradeOffs
│   │       └── MissingDataNotice
│   └── VehicleComparisonPage
├── AccountRoutes
│   ├── LoginPage
│   ├── RegistrationPage
│   ├── UserDashboardPage
│   ├── SavedVehiclesPage
│   └── PreferencesPage
└── AdminRoutes
    ├── AdminDashboardPage
    ├── AdminVehicleListPage
    └── AdminVehicleFormPage
```

Shared components should remain presentational where possible. Forms
may own local interaction state, while API state and business rules
belong in feature hooks/services.

## 5. Reusable components

- `VehicleCard`: identity, supported summary fields, favorite/compare
  actions.
- `VehicleSearch`: query entry and clear action.
- `VehicleFilters`: controls for supported catalog filter values.
- `PriceDisplay`: amount, currency, price type, and freshness.
- `SpecificationTable`: stable field labels and explicit missing-value
  representation.
- `DataProvenance`: source and verification metadata display.
- `RecommendationScore`: backend-provided score plus clear disclaimer.
- `RecommendationExplanation`: reasons, trade-offs, constraints, and
  missing data.
- `ComparisonTable` / `ComparisonRow`: same labels and order across
  selected vehicles.
- `FormField`: label, hint, input, and associated error.
- `FeedbackMessage`: status, error, warning, and info variants.
- `LoadingState`, `EmptyState`, `ErrorState`, and `Pagination`.
- `ConfirmDialog`: keyboard accessible and reserved for consequential
  actions.

## 6. Design tokens

The following are the design tokens for the user-selected Glassmorphism
visual direction. The design emphasizes frosted translucent surfaces,
backdrop blur, light refraction, delicate specular borders, soft diffuse
shadows, and modern refined typography.

### Color and Dark Mode Tokens (5-Color Unified Palette)

The project enforces a unified 5-color palette across all components, views, and themes:
1. `#0A0A0A` (Deep Obsidian / Canvas Ground)
2. `#2B2B2B` (Charcoal / Glass Panel Backdrops & Surface Cards)
3. `#1F5A3A` (Deep Forest Green / Brand Secondary & Verified Accents)
4. `#D8FF2A` (Electric Cyber Lime / Brand Primary & High-Contrast CTAs)
5. `#F5F5F5` (Crisp Off-White / Light Canvas & Dark-Mode Typography)

The UI supports both Light and Dark themes via an accessible theme toggle (`light` | `dark` | `system`). Anti-FOUC initialization script synchronizes `document.documentElement.classList.toggle('dark')` and `<meta name="color-scheme">` prior to first paint.

| Token | Light Theme | Dark Theme (Obsidian Glass) | Hex Code | Usage |
|---|---|---|---|---|
| `color-brand-primary` / `color-lime` | `#D8FF2A` | `#D8FF2A` | `#D8FF2A` | Electric Cyber Lime: high-contrast CTAs, active navigation pills, focus specular rings |
| `color-brand-secondary` / `color-forest` | `#1F5A3A` | `#1F5A3A` | `#1F5A3A` | Deep Forest Green: secondary buttons, verified provenance tags, emerald accents |
| `color-charcoal` / `color-surface` | `rgba(43, 43, 43, 0.08)` | `rgba(43, 43, 43, 0.70)` | `#2B2B2B` | Elevated glass cards, modal containers, and refined structural borders |
| `color-obsidian` / `color-background-dark` | `#0A0A0A` (text on lime) | `#0A0A0A` (canvas base) | `#0A0A0A` | Deep Obsidian background canvas, dark mode ground, high-contrast text on lime |
| `color-offwhite` / `color-background-light` | `#F5F5F5` (canvas base) | `#F5F5F5` (body text) | `#F5F5F5` | Crisp Off-White light mode ground and dark-mode high-contrast typography |
| `color-success` | `#1F5A3A` | `#D8FF2A` | `#1F5A3A` / `#D8FF2A` | Verified provenance tags and high-compatibility indicator |
| `color-warning` | `#F59E0B` | `#FBBF24` | Multi | Accessible amber warnings and trade-off tags |
| `color-danger` | `#EF4444` | `#F87171` | Multi | Destructive actions, unavailable status, and validation error messages |

Never use color alone to convey score quality, errors, or missing
information; include text or an accessible icon/label. Always use `#0A0A0A` text on `#D8FF2A` backgrounds to guarantee WCAG AAA contrast ratio (>15:1).

### Borders and shadows (Glassmorphic signature)

- **Borders:** Translucent light borders catching simulated light:
  `border border-white/80 dark:border-white/10` or `border border-slate-200/80 dark:border-slate-800`.
- **Backdrop Blurs:** High-performance frosted glass blur effects:
  `backdrop-blur-xl` (16px blur) and `backdrop-blur-md` (12px blur).
- **Shadows:** Soft diffuse layered drop shadows:
  - Default glass shadow: `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` (dark: `shadow-[0_8px_30px_rgb(0,0,0,0.25)]`)
  - Floating card / hover shadow: `shadow-[0_20px_40px_rgb(0,0,0,0.07)]` (dark: `shadow-[0_20px_40px_rgb(0,0,0,0.35)]`)
  - Floating modal / toast shadow: `shadow-2xl` / `shadow-xl`
- **Corners:** Soft, modern rounded geometry:
  `rounded-xl`, `rounded-2xl`, and `rounded-full` pill badges.
- **Micro-interactions:** Interactive buttons and clickable cards respond with
  smooth elevation and subtle glow: `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`.

### Typography and Font System

The application uses the Google Sans typographic hierarchy loaded via Google Fonts:
`Google Sans` / `Google Sans Text` + `DM Mono`.

1. **Brand & Headings (`font-display`):**
   - **Font Family:** `Google Sans`, `Google Sans Text`, `Plus Jakarta Sans`, system-ui, sans-serif (`500`, `600`, `700`)
   - **Usage:** Brand titles, page titles (`h1`), card section headers (`h2`, `h3`), navigation logo.
   - **Characteristics:** Clean, geometric, contemporary modern aesthetic with crisp letter forms and balanced optical tracking.

2. **Body & Interface (`font-sans`):**
   - **Font Family:** `Google Sans Text`, `Google Sans`, `Plus Jakarta Sans`, system-ui, sans-serif (`400`, `500`, `600`, `700`)
   - **Usage:** Primary body text, interactive controls, inputs, form labels, tooltips, dialogs.
   - **Characteristics:** Highly legible, engineered specifically for UI reading comfort and crisp rendering at small and large sizes.

3. **Metrics, Prices & Telemetry (`font-mono`):**
   - **Font Family:** `DM Mono`, monospace (`400`, `500`)
   - **Usage:** Vehicle pricing amounts (`₹12,50,000`), recommendation match percentages (`94%`), technical specifications (power `120 hp`, mileage `18.5 km/l`, torque `250 Nm`), engine version numbers, timestamps.
   - **Characteristics:** Clean tabular figures ensuring perfect numeric alignment and high-precision instrument feel.

Pill badges are styled as smooth `rounded-full` containers with translucent
matching color tints and soft specular borders.

Ambient background gradient mesh elements provide realistic refraction
depth beneath glass cards in both light and dark modes.
- Use a consistent 4px spacing scale with common steps 4, 8, 12, 16,
  24, 32, and 48px.
- Keep line length comfortable on long-form details and explanations.

### Responsive breakpoints

Use Tailwind CSS v4 defaults unless design testing justifies a change:

- Small screens: below `sm` (640px)
- Medium/tablet: `sm` through `lg` (640px–1023px)
- Desktop: `lg` and above (1024px+)

Do not assume all tablet users have touch only or all desktop users use
a mouse.

## 7. Responsive behavior

- Discovery results use one column on narrow screens and expand to a
  grid as width permits.
- Filters are always reachable; on mobile, use a labeled toggle/drawer
  with focus management and a clear apply/reset action.
- Avoid page-level horizontal scrolling except for an intentionally
  contained, keyboard-accessible comparison table.
- Vehicle details stack price, specifications, and actions in a useful
  reading order.
- Forms use full-width controls on mobile and group related sections on
  wider layouts.
- Navigation collapses to an accessible menu with Escape and outside
  close behavior where appropriate.
- Touch targets should meet WCAG guidance and have adequate spacing.

## 8. Loading, empty, error, and success states

### Loading

- Preserve page context and use a concise status message or skeletons.
- Announce meaningful asynchronous updates to assistive technology.
- Avoid indefinite spinners without an explanation or recovery action.

### Empty

- Distinguish “no catalog data,” “no matches for these filters,” “no
  favorites yet,” and “no recommendation candidates.”
- Provide a contextual next step such as changing a filter or exploring
  the catalog.

### Error

- Keep the user's entered form values when safe and practical.
- Display field errors adjacent to their input and a summary for
  multiple errors.
- For service failures, show a retry action only when retry is safe.
- Never display raw server errors, stack traces, or internal service
  names/URLs.

### Success

- Confirm saved preference, favorite, or catalog update actions.
- Use persistent status only when necessary; avoid interrupting small
  actions with modal alerts.

## 9. Form validation and interaction

- Associate every field with a visible label; placeholders do not
  replace labels.
- Explain expected units and currency (e.g. INR and km/year).
- Validate on the client for immediate feedback and again on the server
  for authority.
- Budget lower and upper bounds must be ordered and non-negative.
- Enumerated filter values must come from documented API options.
- Do not imply missing preferences have a hidden default.
- For authentication failures, use generic messages consistent with the
  API security policy.
- On submission, prevent duplicate in-flight mutations and announce
  completion or failure.

## 10. Accessibility and keyboard behavior

Target WCAG 2.1 AA practices:

- Semantic landmarks, meaningful heading hierarchy, and descriptive
  page titles.
- Full keyboard operation; visible focus that is not obscured.
- Dialog/drawer focus is moved on open, contained where appropriate,
  restored on close, and dismissible with Escape where safe.
- Inputs have programmatically associated labels, hints, and errors.
- Status and asynchronous updates use appropriate live-region semantics.
- Color contrast is checked for normal/large text and controls.
- Tables have clear headers and accessible row/column context.
- Icons used as controls have accessible names; decorative icons are
  hidden from assistive technology.
- Respect reduced-motion preferences.
- Run automated accessibility checks and manual keyboard/screen-reader
  reviews on representative core flows.

## 11. Frontend architecture and service integration

- Keep components focused on rendering and interaction.
- Place HTTP calls in feature-level API modules or a shared typed API
  client; do not call `fetch` from unrelated presentation components.
- The client routes requests through configured service base paths/
  ingress. It must not connect to MongoDB or the ML service.
- API schemas and status/error handling follow
  `05_API_SPECIFICATION.md`.
- Do not duplicate recommendation scoring or authoritative validation
  rules in React.
- Treat authentication state as untrusted until established by the
  Identity Service and never use client-side role checks as a security
  boundary.
- Use reusable loading/error handling while retaining feature-specific
  recovery behavior.

## 12. Tailwind CSS conventions

Use React and Tailwind CSS v4. Follow the installed version's supported
CSS-first import/configuration conventions:

- Use the supported Tailwind v4 stylesheet import in the main CSS
  entrypoint.
- Define shared design tokens in CSS theme variables or a project
  design-token layer that works with the selected v4 setup.
- Avoid copying Tailwind v3 configuration conventions into a v4
  project unless a documented compatibility need requires it.
- Keep class composition readable; extract repeated UI patterns into
  components rather than maintaining long duplicated class strings.
- Do not use arbitrary values for repeated tokens; promote repeated
  values into named tokens.
- Verify responsive and focus/hover/disabled states in the browser.

Exact build configuration follows the dependencies selected during the
implementation milestone.

## 13. Development fixtures and production data

- Development fixtures must be visibly labeled synthetic and isolated
  from production seed/import processes.
- Never hardcode real vehicle specifications, reliability claims, or
  verified price values into UI components.
- Production UI displays catalog data only from the Vehicle Catalog
  Service contract.
- A sample screenshot or demo card must not imply the data is verified
  unless the catalog record has approved provenance and verification.

## 14. Page implementation dependencies

| Page/flow | Required API contract |
|---|---|
| Discovery | `GET /api/v1/vehicles` |
| Vehicle details | `GET /api/v1/vehicles/:vehicleId` |
| Recommendation questionnaire/results | `POST /api/v1/recommendations` |
| Comparison | `POST /api/v1/compare` |
| Login/register/logout | `/api/v1/auth/*` |
| User dashboard/profile | `/api/v1/auth/me`, `/api/v1/users/me` |
| Preferences | `/api/v1/users/me/preferences` |
| Saved vehicles | `/api/v1/favorites` |
| Admin management | `/api/v1/admin/vehicles/*` |
| Longevity (optional) | `POST /api/v1/longevity/estimate` only when enabled |

## 15. Review gate

This document defines the selected visual direction and page behavior;
it is not an implemented interface. Review the design tokens,
comparison behavior, accessibility target, and page hierarchy before
creating the recommendation scoring design or implementing frontend
code.
