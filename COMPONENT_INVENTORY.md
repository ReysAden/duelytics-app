# Duelytics UI Component Inventory

## Overview
This document catalogs all UI components across the three main application sections: **Login**, **SessionSelector/Lobby**, and **DuelRecords**. Components are categorized by type and their associated CSS files are documented.

---

## 1. LOGIN SECTION

**Files:**
- `src/App.jsx` (component logic)
- `src/index.css` (global styles)
- `src/App.css` (legacy - contains login styles)

### Components:

#### 1.1 Layout Components
- **login-container** - Full-screen flex container for login page
  - Applies: `display: flex`, `flex-direction: column`, `justify-content: center`, `align-items: center`, `height: 100vh`
  
- **loading-spinner** - Loading state display
  - Contains animated spinner and pulsing text

#### 1.2 Authentication Components
- **login-box** - Main login card container
  - Styling: Glass-morphism effect with border, border-radius 15px, semi-transparent black background
  - Contains title and Discord button
  
- **title** - "Duelytics" app title
  - Font: 2.5rem, white, 700 weight, text-shadow
  
- **discord-btn** - Login button with Discord branding
  - Styling: #7289da background, flex layout with icon + text, 8px border-radius
  - Hover: darker background, translateY transform
  - Contains: discord-icon (SVG inverted)

#### 1.3 Supporting Components
- **footer** - Copyright notice
  - Position: `position: absolute`, `bottom: 20px`
  - Styling: 0.9rem font, rgba text, text-shadow

- **spinner** - Animated loading indicator
  - Border-radius: 50%, 4px border, 0.8s rotation animation

- **loading-text** - "Duelytics" text during loading
  - Font: 2rem, pulsing animation (1.5s ease-in-out)

### CSS Patterns:
- Dark background with overlay
- Scrollbar styling (custom webkit scrollbar with semi-transparent white)
- Keyframe animations: `spin`, `pulse`

---

## 2. SESSION SELECTOR / LOBBY SECTION

**Files:**
- `src/pages/SessionSelector/SessionSelector.jsx`
- `src/pages/SessionSelector/SessionSelector.css`
- Sub-tabs: User, Admin, Supporter

### Global Layout Components

#### 2.1 Sidebar Navigation
- **sidebar** - Fixed left navigation panel
  - Styling: `width: 180px`, `height: 100vh`, `position: fixed`, dark background with border-right
  - Contains: title, subtitle, navigation items, language selector, logout button

- **sidebar-title** - "Duelytics" title in sidebar
  - Font: 26px, 700 weight, letter-spacing 0.5px

- **sidebar-subtitle** - "Select Session" prompt
  - Font: 13px, 0.5 opacity

- **sidebar-divider** - Horizontal rule
  - Height: 1px, rgba border, margin 16px 0

- **sidebar-nav** - Navigation button container
  - Layout: `display: flex`, `flex-direction: column`, `gap: 4px`

- **sidebar-item** - Nav button
  - Styling: Transparent bg, 10px padding, 15px font, 0.15s transition
  - Hover: rgba(255,255,255,0.08) bg
  - Active: rgba(255,255,255,0.12) bg, white text

- **sidebar-footer** - Bottom section with language + logout
  - Layout: `margin-top: auto`

- **logout-btn** - Logout button
  - Styling: Similar to sidebar-item, left-aligned text

#### 2.2 Main Content Area
- **main-content** - Right-side content panel
  - Styling: `margin-left: 180px`, `min-height: 100vh`, flex column
  
- **content-header** - Section header
  - Padding: 16px 32px, transparent bg

- **content-title** - Page title
  - Font: 22px, 600 weight, white

- **content-body** - Main content area
  - Styling: `flex: 1`, `padding: 32px`, `overflow-y: auto`

### User Tab Components

#### 2.3 ActiveSession Tab (user role)
**File:** `src/pages/SessionSelector/tabs/user/ActiveSession.css`

- **active-session** - Container
  - Max-width: 400px

- **form-group** - Input/select wrapper
  - Margin: 20px bottom, flex column

- **form-group label** - Form labels
  - Font: 13px, 500 weight, 6px margin-bottom

- **form-group select** - Select dropdowns
  - Styling: 10px padding, 14px h-padding, dark bg, 1px border, 6px border-radius
  - Focus: border-color opacity 0.3, bg opacity 0.95
  - Option: dark bg (#1a1a2e), white text

- **join-btn** - Join session button
  - Styling: Black bg, 1px border (rgba blue), 14px font, 500 weight, 6px radius, 8px top-margin
  - Hover: darker bg, border opacity 0.6
  - Disabled: opacity 0.4

- **message** - Status messages
  - Padding: 12px 16px, border-radius 6px, margin-bottom 20px

- **error-message** - Error styling
  - Background: rgba(244, 67, 54, 0.1), border: rgba(244, 67, 54, 0.3), color: #ff6b6b

- **success-message** - Success styling
  - Background: rgba(0, 0, 0, 0.5), border: rgba(76, 175, 80, 0.5), color: #66bb6a, 600 weight

- **modal-overlay** - Modal backdrop
  - Position: fixed, full screen, rgba(0,0,0,0.7) bg, z-index: 1000

- **modal-content** - Modal dialog
  - Styling: Dark bg, 1px border, 8px border-radius, 24px padding, max-width 400px

- **modal-actions** - Button group
  - Layout: flex, gap: 12px

- **cancel-btn** / **confirm-btn** - Modal buttons
  - Flex: 1, padding: 10px 20px, transition all 0.2s
  - cancel: transparent with border
  - confirm: black bg with blue border

#### 2.4 ArchiveSession Tab (user role)
**File:** `src/pages/SessionSelector/tabs/user/ArchiveSession.css`
- Similar structure to ActiveSession but for archived sessions

#### 2.5 CreateNewSession Tab (admin role)
**File:** `src/pages/SessionSelector/tabs/admin/CreateNewSession.css`

- **create-session-form** - Form container
  - Max-width: 400px

- **form-group** - Reused from ActiveSession
  - Inputs + selects: 10px padding, bg opacity 0.6, border opacity 0.15
  - Focus: border opacity 0.3, bg opacity 0.7

- **form-row** - Multi-column layout
  - Grid: 2 columns, gap: 16px

- **submit-btn** - Form submit button
  - Styling: rgba(255,255,255,0.1) bg, white border, 14px font, 500 weight, 6px radius
  - Hover: opacity 0.15, border opacity 0.3
  - Disabled: opacity 0.5, cursor not-allowed

#### 2.6 ManageSessions Tab (admin role)
**File:** `src/pages/SessionSelector/tabs/admin/ManageSessions.css`
- (To be documented based on actual component structure)

#### 2.7 Decks Tab (admin role)
**File:** `src/pages/SessionSelector/tabs/admin/Decks.css`
- (To be documented based on actual component structure)

#### 2.8 Backgrounds Tab (supporter role)
**File:** `src/pages/SessionSelector/tabs/supporter/Backgrounds.css`
- (To be documented based on actual component structure)

#### 2.9 LanguageSelector Component
**File:** `src/components/LanguageSelector.jsx/.css`
- Language selector dropdown
- Located in sidebar-footer

---

## 3. DUEL RECORDS SECTION

**Files:**
- `src/pages/DuelRecords/DuelRecords.jsx`
- `src/pages/DuelRecords/DuelRecords.css`
- Multiple tab-specific CSS files

### Global Layout Components (same as SessionSelector)
- **sidebar** - Fixed left navigation with stats
- **main-content** - Right-side content area
- **content-body** - Scrollable content area

#### 3.1 Sidebar Components

- **sidebar-session-name** - Current session name
  - Font: 13px, 0.7 opacity, 500 weight

- **sidebar-stats** - Stats container
  - Padding: 0 20px, flex column, gap: 12px

- **stat-item** - Individual stat row
  - Layout: `display: flex`, `justify-content: space-between`, `align-items: center`

- **stat-label** - Stat name
  - Font: 13px, 0.6 opacity, 400 weight

- **stat-value** - Stat value
  - Font: 14px, white, 600 weight

- **record-win** - Win text styling
  - Color: #4ade80 (green)

- **record-loss** - Loss text styling
  - Color: #f87171 (red)

- **back-btn** - Back to lobby button
  - Similar to logout-btn styling

### Tab 1: Submit

**File:** `src/pages/DuelRecords/tabs/Submit.css`

#### 3.2 Form Components
- **submit-container** - Wrapper
  - Max-width: 800px, margin: 0 auto

- **submit-form** - Form layout
  - Flex column, gap: 24px

- **form-row** - Horizontal input groups
  - Flex, gap: 20px

- **form-field** - Individual field
  - Flex: 1, flex-column, gap: 8px

- **field-label** - Form label
  - Font: 14px, 600 weight, 0.9 opacity

- **field-select** - Select dropdowns
  - Styling: 12px padding, dark bg (0.9), 1px border, 6px border-radius
  - Focus: border opacity 0.3

- **field-input** - Text inputs
  - Same styling as field-select
  - Placeholder: 0.4 opacity

#### 3.3 Combobox (Autocomplete) Components
- **combobox** - Container
  - Position: relative, width: 100%

- **dropdown-icon** - Chevron indicator
  - Position: absolute, right: 12px, top: 50%, pointer-events: none
  - Rotate: 180deg when open

- **dropdown** - Autocomplete menu
  - Position: absolute, top: calc(100% + 4px), full width
  - Background: rgba(0,0,0,0.95), border: 1px, border-radius: 6px
  - Max-height: 250px, z-index: 100, box-shadow

- **dropdown-item** - Menu option
  - Padding: 12px, cursor: pointer, 0.15s transition
  - Hover: rgba(255,255,255,0.1) bg

#### 3.4 Button Group Components
- **button-group** - Container for choice buttons
  - Flex, gap: 12px

- **choice-btn** - Toggle buttons (Coin Flip, Turn Order)
  - Styling: Flex, 12px padding, dark bg, 1px border, 6px radius
  - Hover: border opacity 0.3
  - Active: indigo bg (rgba(99,102,241,0.3)), indigo border, white text

- **btn-icon** - Icon in choice button
  - 20x20px, object-fit: contain

#### 3.5 Result Selection Components
- **result-btn** - Win/Loss buttons
  - Flex: 1, 20px padding, 2px border, 6px radius, 16px font, 600 weight, 0.2s transition

- **result-btn.win** - Win button styling
  - Background: rgba(34, 197, 94, 0.3)
  - Active: rgb(34, 197, 94)

- **result-btn.loss** - Loss button styling
  - Background: rgba(239, 68, 68, 0.3)
  - Active: rgb(239, 68, 68)

#### 3.6 Submit Button Components
- **submit-btn** - Primary submit button
  - Width: 100%, 16px padding, indigo bg (rgb(99, 102, 241))
  - Hover: darker indigo (rgb(79, 70, 229))
  - Disabled: rgba(255,255,255,0.1) bg, 0.3 opacity text

- **submit-buttons-group** - Container for submit + secondary buttons
  - Flex, gap: 12px

- **overlay-btn-secondary** - "Overlay" and "Delete Last" buttons
  - Styling: 12px padding, 16px h-padding, indigo border + transparent bg, indigo text
  - Hover: bg opacity increases

#### 3.7 Overlay Window Components
**Location:** Electron overlay window (`electron/overlay.html`)

- **overlay-backdrop** - Full-screen modal backdrop
  - Position: fixed, full coverage, rgba(0,0,0,0.5) bg, z-index: 9998

- **floating-overlay** - Main overlay window
  - Z-index: 9999, 420-550px width, dark bg with backdrop-filter blur(10px)
  - Border: 1px rgba, 12px border-radius, box-shadow
  - Display: flex column

- **overlay-header** - Draggable title bar
  - Styling: 16px padding, gradient bg, 1px bottom border
  - Cursor: grab (active: grabbing)
  - User-select: none, flex-shrink: 0

- **overlay-title** - Window title
  - Font: 15px, 600 weight, 0.9 opacity

- **overlay-close-btn** - Close/minimize button
  - Styling: 32x32px, bg opacity 0.05, border radius 6px
  - Hover: red-tinted background

- **overlay-form-contents** - Scrollable form area
  - Flex: 1, padding: 20px, max-height: calc(100vh - 100px)
  - Custom scrollbar: thin, rgba(255,255,255,0.2)

### Tab 2: Browse

**File:** `src/pages/DuelRecords/tabs/Browse.css`
- View archived session data
- (Styling details to be documented)

### Tab 3: Personal Stats

**File:** `src/pages/DuelRecords/tabs/PersonalStats/PersonalStats.css`

#### 3.8 Subtab Navigation
- **subtab-header** - Header with subtab navigation and filters
  - Padding: 16px 20px 12px, border-bottom: 1px, flex between

- **subtab-nav** - Subtab button container
  - Flex, gap: 6px

- **subtab-btn** - Individual subtab button
  - Padding: 5px 10px, transparent bg, 13px font, 500 weight
  - Hover: rgba(255,255,255,0.05) bg
  - Active: indigo bg (rgba(99,102,241,0.3)), white text, 1px indigo border

- **date-filter** - Date/filter dropdown
  - Padding: 5px 10px, dark bg, 1px border, 4px radius
  - 12px font, white-space: nowrap

- **subtab-content** - Subtab content area
  - Flex: 1, padding: 32px, overflow-y: auto

#### 3.9 Overview Subtab
**File:** `src/pages/DuelRecords/tabs/PersonalStats/Overview.css`
- Summary statistics display
- (Styling details to be documented)

#### 3.10 Matchups Subtab
**File:** `src/pages/DuelRecords/tabs/PersonalStats/Matchups.css`
- Deck matchup win rates
- (Styling details to be documented)

#### 3.11 CoinFlip Subtab
**File:** `src/pages/DuelRecords/tabs/PersonalStats/CoinFlip.css`
- Coin flip statistics
- (Styling details to be documented)

#### 3.12 DeckAnalysis Subtab
**File:** `src/pages/DuelRecords/tabs/PersonalStats/DeckAnalysis.css`
- Deck performance analysis
- (Styling details to be documented)

#### 3.13 PointsTracker Subtab
**File:** `src/pages/DuelRecords/tabs/PersonalStats/PointsTracker.css`
- Points progression over time
- (Styling details to be documented)

### Tab 4: Duel History

**File:** `src/pages/DuelRecords/tabs/DuelHistory/DuelHistory.css`

#### 3.14 Table Components
- **duel-history-container** - Main container
  - Flex column, full width/height with margins
  - Hidden scrollbar with multiple techniques

- **duel-table-wrapper** - Scrollable table area
  - Flex: 1, overflow: auto

- **duel-table** - Table element
  - Width: 100%, border-collapse: separate, border-spacing: 0 2px, font: 12px

- **duel-table thead** - Table header
  - Position: sticky, top: 0, dark bg, z-index: 10

- **duel-table th** - Header cells
  - Padding: 8px 6px, 11px font, 600 weight, border-bottom: 1px
  - First child: text-align center, 40px width
  - Last child: text-align center, 100px width

- **duel-table td** - Data cells
  - Padding: 8px 6px, 12px font, white text, 0.95 opacity
  - First & last: border-radius (4px 0 0 4px / 0 4px 4px 0)

- **duel-table tbody tr** - Row styling
  - Background: rgba(0,0,0,0.6)
  - Even rows: rgba(0,0,0,0.5)
  - Hover: rgba(99,102,241,0.2) bg (indigo highlight)

- **result** - Result text
  - Font-weight: 600

- **result.win** - Win styling
  - Color: #4ade80 (green)

- **result.loss** - Loss styling
  - Color: #f87171 (red)

- **delete-btn** - Row delete button
  - Padding: 6px 12px, red transparent bg, red text, 4px radius
  - Hover: red bg opacity increases

- **no-duels** - Empty state message
  - Text-align: center, 0.5 opacity, 40px padding, italic

- **loading-spinner** - Loading state
  - Flex center, animated spinner, rgba text

- **error-message** - Error display
  - Color: #f87171, text-align: center, 20px padding
  - Background: rgba(220, 38, 38, 0.1), border: 1px rgba(220, 38, 38, 0.3)

### Tab 5: Deck Winrates

**File:** `src/pages/DuelRecords/tabs/DeckWinrates/DeckWinrates.css`
- Deck performance statistics
- (Styling details to be documented)

### Tab 6: Matchup Matrix

**File:** `src/pages/DuelRecords/tabs/MatchupMatrix/MatchupMatrix.css`
- Matrix view of deck matchups
- (Styling details to be documented)

### Tab 7: Leaderboard

**File:** `src/pages/DuelRecords/tabs/Leaderboard/Leaderboard.css`
- Session-wide leaderboard
- (Styling details to be documented)

---

## COLOR PALETTE

### Current Colors Used:
- **Primary Backgrounds:**
  - `rgba(0, 0, 0, 0.7)` - Sidebar/containers
  - `rgba(0, 0, 0, 0.9)` - Input fields
  - `rgba(15, 23, 42, 0.95)` - Overlay window
  - `#0f0f1e`, `#0a0e1e` - Dark gradients

- **Primary Accent:**
  - `rgb(99, 102, 241)` - Indigo (buttons, active states)
  - `rgba(99, 102, 241, 0.3)` - Indigo transparent

- **State Colors:**
  - Success/Win: `#4ade80`, `rgb(34, 197, 94)` (green)
  - Error/Loss: `#f87171`, `rgb(239, 68, 68)` (red)
  - Blue: `#7289da` (Discord blue)

- **Text Colors:**
  - Primary: `#ffffff`
  - Secondary: `rgba(255, 255, 255, 0.7)`
  - Tertiary: `rgba(255, 255, 255, 0.5)`
  - Muted: `rgba(255, 255, 255, 0.3)`

- **Borders:**
  - `rgba(255, 255, 255, 0.2)` - Primary border
  - `rgba(255, 255, 255, 0.1)` - Subtle border
  - `rgba(255, 255, 255, 0.08)` - Very subtle border

---

## TYPOGRAPHY

### Font Stack:
- Primary: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`

### Font Sizes:
- H1 (App Title): `26px` (sidebar), `2.5rem` (login)
- H2 (Page Title): `22px`
- H3 (Subtab): `18px`
- Form Labels: `13px`, `14px`
- Body Text: `14px`, `15px`
- Small Text: `12px`, `13px`
- Table Text: `12px`, `11px` (header)

### Font Weights:
- Regular: `400`
- Medium: `500`
- Semi-bold: `600`
- Bold: `700`

---

## SPACING PATTERNS

### Padding:
- Sidebar items: `10px 20px`
- Form fields: `12px` (general), `10px 14px` (specific)
- Headers: `16px 32px`
- Content areas: `32px`
- Modal content: `24px`

### Gaps:
- Form rows: `20px`
- Button groups: `12px`
- Navigation: `4px`, `6px`

### Margins:
- Bottom margins: `16px`, `20px`, `24px`

---

## BORDER RADIUS

### Current Values Used:
- `4px` - Small elements, table cells
- `5px` - Rare
- `6px` - Most UI elements (inputs, buttons, cards)
- `8px` - Cards, larger elements
- `12px` - Large cards, overlay window
- `15px` - Login box
- `50%` - Circles (spinners)

**INCONSISTENCY:** Multiple border-radius values should be consolidated.

---

## TRANSITIONS & ANIMATIONS

### Transition Durations:
- Quick interactions: `0.15s`
- Standard: `0.2s`
- Longer: `0.3s`

### Easing Functions:
- `ease` - General
- `ease-in-out` - Animations
- `linear` - Spinners

### Keyframe Animations:
- `spin` - 0.8s-1s rotation (spinners)
- `pulse` - 1.5s opacity fade (loading text)

---

## SHADOW EFFECTS

### Box Shadows:
- Light: `0 4px 15px rgba(0, 0, 0, 0.3)`
- Medium: `0 8px 24px rgba(0, 0, 0, 0.4)`, `0 8px 32px rgba(0, 0, 0, 0.3)`
- Heavy: `0 20px 50px rgba(0, 0, 0, 0.7)`
- Discord Blue: `0 4px 15px rgba(114, 137, 218, 0.3)`, `0 6px 20px rgba(114, 137, 218, 0.4)`

---

## GLASS-MORPHISM EFFECTS

### Backdrop Filters:
- Input/Modal: `backdrop-filter: blur(10px)`
- Login Overlay: `backdrop-filter: blur(4px)`

---

## IDENTIFIED ISSUES & INCONSISTENCIES

1. **Border Radius Scattered:** Multiple values (4, 5, 6, 8, 12, 15px) → Consolidate to 2-3 values
2. **Color Opacity Inconsistent:** Various opacity levels for same color purpose
3. **Duplicate CSS:** SessionSelector.css and DuelRecords.css duplicate sidebar styling
4. **Multiple Button Styles:** Different buttons (join-btn, submit-btn, choice-btn, result-btn, etc.) with inconsistent patterns
5. **No Design Token System:** Colors, spacings, typography not centralized
6. **Scrollbar Styling:** Multiple techniques (hidden in different ways) across components
7. **Form Field Inconsistencies:** Different padding/styling across similar input types
8. **Tab/Subtab Navigation:** Inconsistent active/hover states between different navigation levels

---

## NEXT STEPS FOR DESIGN SYSTEM REFACTOR

1. **Choose Framework:** Tailwind CSS (recommended) or CSS-in-JS (styled-components/Emotion)
2. **Define Design Tokens:** Centralize colors, spacing, typography, shadows
3. **Create Component Library:** Build reusable components with consistent styling
4. **Consolidate CSS:** Eliminate duplicate styles, merge similar components
5. **Implement Across Codebase:** Replace vanilla CSS incrementally
6. **Maintain Gaming Aesthetic:** Preserve Riot Client-inspired dark theme with polish
