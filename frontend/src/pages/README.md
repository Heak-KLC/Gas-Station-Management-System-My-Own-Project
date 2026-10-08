# V-SYCHL — Admin Dashboard (all screens)

React components for every Admin menu screen, styled to match the navy V-SYCHL Figma design.

## Dependencies

```bash
npm install recharts lucide-react
```

Tailwind CSS v4 must be set up (see setup notes below) — these components use Tailwind
utility classes only, no custom CSS.

## File layout

```
src/
  App.jsx              – wires sidebar + topbar + all 13 pages (simple useState routing)
  components/
    Sidebar.jsx         – left nav, all 12 menu items, active-state highlighting
    TopBar.jsx           – search bar, language toggle, notification bell, user avatar
    ui.jsx                – shared <Panel>, <StatCard>, <StatusBadge>
  pages/
    Dashboard.jsx
    FuelManagement.jsx
    FuelTanks.jsx
    FuelPumps.jsx              – 4 pump status cards, calibration data
    ConvenienceStore.jsx       – product grid, category list, inventory status chart
    POSSalesHistory.jsx        – sales records table with filters
    SuppliersPurchases.jsx     – compliance scorecard, AP ageing, delivery log, POs, directory
    CustomerLoyalty.jsx        – stat cards, tabs (Customer List / Promotions / Loyalty Rules)
    EmployeeAttendance.jsx     – stat cards, attendance tracking table
    EquipmentMaintenance.jsx   – stat cards, maintenance log table
    MasterReports.jsx          – stat cards, 4 charts, audit log table
    Notifications.jsx          – filter chips, notification feed
    Settings.jsx                – tabs (Station Info / Pricing & Tax / Roles / Backup)
```

## Tailwind v4 setup (if not already done)

```bash
npm install tailwindcss @tailwindcss/vite
```

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`src/index.css` (replace entire contents):
```css
@import "tailwindcss";
```

Make sure `src/main.jsx` imports `./index.css`.

## Notes

- All data in the pages is placeholder/mock — swap the arrays at the top of each file
  for API calls once your backend endpoints are ready.
- `StatusBadge` maps common status strings (Sufficient, Critical Low, Active, Low Stock,
  Check Status, In Stock, etc.) to colors — extend `STATUS_STYLES` in `ui.jsx` if you add more.
- `App.jsx` uses local state for navigation (`active` + `setActive`). Drop in React Router
  and pass the current route into `Sidebar`'s `active` prop instead if you need real URLs.
- Several tabbed pages (`CustomerLoyalty`, `Settings`) have placeholder panels for tabs
  that weren't fully speced in the screenshots (Promotions, Loyalty Rules, System Roles) —
  swap those in once those screens are designed.
- Colors: navy sidebar `#0b2545`, cyan accent `#0ea5e9` — adjust in `Sidebar.jsx` and
  chart `fill`/`stroke` props to match your final brand palette.
