# Requirements Document

## Introduction

This feature adds a fully responsive mobile layout to the StellarKraal Next.js frontend. The application currently renders correctly on desktop but lacks mobile-optimised navigation, touch-friendly targets, and fluid layouts. The goal is to make every page and component usable on small screens (≥ 320 px) without introducing new dependencies — Tailwind CSS utility classes only — and without breaking any existing functionality or CSS variable styles.

## Glossary

- **Navbar**: The top-level navigation component rendered on every page, providing links to Home, Dashboard, and Borrow.
- **Hamburger_Menu**: A three-line icon button that toggles the mobile navigation drawer on small screens.
- **Touch_Target**: An interactive element (button, link, input) whose clickable area meets the WCAG 2.5.5 minimum of 44 × 44 CSS pixels.
- **Card_List**: A vertically stacked set of styled `<div>` cards used to replace horizontal tables on mobile viewports.
- **Breakpoint**: Tailwind's `md` breakpoint (768 px), used to switch between mobile and desktop layouts.
- **CSS_Variable_Style**: An inline `style` prop referencing a CSS custom property (e.g. `style={{ color: "var(--color-text)" }}`), which must be preserved unchanged.
- **RootLayout**: The Next.js root layout component in `src/app/layout.tsx` that wraps all pages.

---

## Requirements

### Requirement 1: Responsive Navigation Bar

**User Story:** As a mobile user, I want a collapsible navigation menu, so that I can access all pages without the nav overflowing the screen.

#### Acceptance Criteria

1. THE Navbar SHALL be created at `src/components/Navbar.tsx` and exported as a default React component.
2. WHEN the viewport width is below the `md` Breakpoint, THE Navbar SHALL render a Hamburger_Menu button instead of the horizontal link list.
3. WHEN the Hamburger_Menu button is activated, THE Navbar SHALL toggle a visible mobile navigation drawer containing links to Home (`/`), Dashboard (`/dashboard`), and Borrow (`/borrow`).
4. WHILE the viewport width is at or above the `md` Breakpoint, THE Navbar SHALL render the navigation links in a horizontal row without a Hamburger_Menu button.
5. THE Navbar SHALL apply `min-h-[44px] min-w-[44px]` to the Hamburger_Menu button and to every navigation link to satisfy Touch_Target requirements.
6. THE RootLayout SHALL import and render the Navbar above `{children}` in the document body.
7. THE RootLayout SHALL add `overflow-x-hidden` and `px-4` classes to the `<body>` element.

---

### Requirement 2: Responsive Home Page

**User Story:** As a mobile user, I want the home page to reflow gracefully on small screens, so that text and call-to-action links are readable and tappable.

#### Acceptance Criteria

1. THE Home_Page SHALL apply `text-4xl md:text-5xl` to the main heading so font size scales with viewport.
2. THE Home_Page SHALL apply `flex-col md:flex-row` to the call-to-action link container so links stack vertically on mobile.
3. THE Home_Page SHALL apply `max-w-sm md:max-w-md` to the descriptive paragraph to constrain line length appropriately per viewport.
4. THE Home_Page SHALL apply `min-h-[44px]` to every `<Link>` element to satisfy Touch_Target requirements.
5. THE Home_Page SHALL preserve all existing CSS_Variable_Style inline `style` props unchanged.

---

### Requirement 3: Responsive Dashboard Page

**User Story:** As a mobile user, I want the dashboard to display loan and health information in a readable single-column layout, so that I can manage loans on a phone.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL apply `w-full md:w-auto` to all action buttons so they span full width on mobile.
2. THE Dashboard_Page SHALL apply `min-h-[44px]` to all buttons to satisfy Touch_Target requirements.
3. WHEN the viewport is below the `md` Breakpoint, THE Dashboard_Page SHALL render tabular loan data as a Card_List instead of a horizontal table.
4. THE Dashboard_Page SHALL preserve the `setActiveLoanId` state logic and all existing handler functions unchanged.

---

### Requirement 4: Responsive Borrow Page

**User Story:** As a mobile user, I want all form inputs and buttons on the Borrow page to fill the available width, so that I can enter loan details comfortably on a small screen.

#### Acceptance Criteria

1. THE Borrow_Page SHALL ensure all `<input>` elements carry the `w-full` class.
2. THE Borrow_Page SHALL apply `w-full md:w-auto` and `min-h-[44px]` to all `<button>` elements.

---

### Requirement 5: Responsive Shared Components

**User Story:** As a mobile user, I want all shared UI components to adapt to small screens, so that the entire application is consistently usable on mobile.

#### Acceptance Criteria

1. THE LoanForm SHALL ensure all `<input>` and `<select>` elements carry the `w-full` class.
2. THE LoanForm SHALL apply `min-h-[44px]` to all `<button>` elements.
3. THE CollateralCard SHALL ensure the lookup `<input>` carries the `w-full` class.
4. THE CollateralCard SHALL apply `min-h-[44px]` to the Fetch `<button>`.
5. THE RepayPanel SHALL ensure all `<input>` elements carry the `w-full` class.
6. THE RepayPanel SHALL apply `min-h-[44px]` to the Repay `<button>`.
7. THE WalletConnect SHALL apply `min-h-[44px]` to the Connect `<button>`.
8. THE HealthGauge SHALL preserve its existing layout; no structural changes are required beyond confirming `w-full` on the progress bar container.
9. THE LoanRepaymentCalculator SHALL ensure all `<input>` elements carry the `w-full` class.
10. THE LoanRepaymentCalculator SHALL apply `min-h-[44px]` to the "Proceed to Repay" `<button>`.
11. WHERE a component renders a grid, THE component SHALL apply `grid-cols-1 md:grid-cols-2` so the grid collapses to a single column on mobile.

---

### Requirement 6: No New Dependencies

**User Story:** As a developer, I want the responsive layout implemented with existing tools only, so that the bundle size and dependency surface remain unchanged.

#### Acceptance Criteria

1. THE implementation SHALL use only Tailwind CSS utility classes for all responsive styling.
2. THE implementation SHALL NOT introduce any new `npm` packages or modify `package.json`.
3. THE implementation SHALL NOT break any existing CSS_Variable_Style inline `style` props.
