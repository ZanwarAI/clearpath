# ClearPath - Product Requirements Document
## Healthcare Prior Authorization Platform

**Version:** 2.0  
**Last Updated:** January 2026  
**Target:** Series A / VC-Ready Demo

---

## Executive Summary

ClearPath is an AI-powered prior authorization platform that reduces PA processing time by 50% while improving approval rates. The platform serves three key stakeholders: patients, healthcare providers, and administrators.

**Market Opportunity:** The prior authorization market represents a $31B+ opportunity, with 88% of physicians reporting PA as a high or extremely high burden (AMA 2024).

---

## Design Philosophy

### Brand Identity
- **Primary Color:** Sky Blue (#0ea5e9) - Trust, Healthcare, Technology
- **Secondary:** Emerald (#10b981) - Success, Approval, Growth  
- **Accent:** Violet (#8b5cf6) - Premium, Innovation
- **Neutrals:** Slate scale for professional, enterprise feel

### Design Principles (Inspired by Linear, Stripe, Oscar Health)

1. **Clarity Over Cleverness**
   - Every element serves a purpose
   - No decorative gradients or unnecessary animations
   - Typography-first hierarchy

2. **Subtle Depth**
   - Soft shadows (not harsh drop shadows)
   - Glass morphism for overlays only
   - White space as a design element

3. **Micro-Interactions**
   - Hover states on all interactive elements
   - Smooth 200ms transitions
   - Loading skeletons, not spinners

4. **Data Visualization**
   - Progress indicators with semantic colors
   - Sparklines for trends
   - Status pills with icons

---

## UI Component Specifications

### Typography
```
Font: Geist Sans (Variable)
Headings: 
  - H1: 36px/40px, -0.02em tracking, font-weight: 700
  - H2: 24px/32px, -0.02em tracking, font-weight: 600
  - H3: 18px/28px, -0.01em tracking, font-weight: 600
Body: 
  - Large: 16px/24px
  - Base: 14px/20px  
  - Small: 12px/16px
```

### Spacing System
```
4px base unit
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
```

### Border Radius
```
Small (buttons, inputs): 8px
Medium (cards): 12px
Large (modals, panels): 16px
Full (avatars, pills): 9999px
```

### Shadows
```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)
lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)
xl: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)
```

---

## Page Specifications

### 1. Login / Landing Page
**Goal:** Convert visitors, establish trust, premium feel

**Hero Section:**
- Split layout (60/40)
- Left: Value proposition, social proof, key metrics
- Right: Login cards with role-based entry
- Background: Subtle gradient mesh (sky-50 to white)

**Elements:**
- Animated counter showing "10,500+ PAs processed"
- Trust badges: HIPAA Compliant, SOC 2, 256-bit encryption
- Testimonial carousel with healthcare exec quotes
- Feature highlights with icons

### 2. Patient Portal

**Dashboard:**
- Welcome banner with personalized greeting
- Insurance card component (gradient, premium feel)
- Stats grid: Total, Pending (amber), Approved (emerald), Denied (red)
- PA list with status pills, risk scores, timeline preview
- Notification center with unread badge
- Quick actions sidebar

**PA Detail Page:**
- Breadcrumb navigation
- Status timeline (horizontal stepper)
- Two-column layout: Main content + sidebar
- Risk score visualization (circular progress)
- Document upload with drag-drop
- Secure messaging interface

### 3. Physician Portal

**Dashboard:**
- Action-oriented header with "New PA" CTA
- Performance metrics (approval rate trend)
- PA queue with filtering/sorting
- Quick links: Appeals, Gold Card Status
- Tips carousel for improving approvals

**New PA Wizard:**
- 3-step flow with progress indicator
- Patient search with autocomplete
- EHR data preview cards
- Treatment selection grid
- Real-time risk calculation
- AI narrative generator with strength score
- Review & submit with confidence indicator

**PA Detail:**
- Full risk breakdown with factors
- Historical comparison chart
- One-click actions: Approve, Deny, Request Info
- Audit trail timeline

### 4. Admin Analytics Dashboard

**Overview:**
- Key metrics row: Approval Rate, Avg Processing Time, Volume, Savings
- Insurer performance comparison (bar chart)
- Denial reasons breakdown (horizontal bars)
- Physician leaderboard
- Time-series trend charts

**Filters:**
- Date range picker
- Insurer dropdown
- Treatment category
- Export to CSV/PDF

---

## Interaction Patterns

### Loading States
- Skeleton screens matching content shape
- Pulsing animation (not spinning)
- Progressive loading for lists

### Empty States
- Friendly illustration
- Clear explanation
- Call-to-action button

### Error States
- Red border highlight
- Inline error message
- Recovery suggestion

### Success States
- Green checkmark animation
- Toast notification
- Auto-dismiss after 4s

---

## Mobile Responsiveness

### Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Mobile Adaptations
- Collapsible sidebar → bottom nav
- Cards stack vertically
- Tables → card lists
- Touch-friendly tap targets (44px min)

---

## Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader labels
- Color contrast ratios ≥ 4.5:1
- Focus indicators
- Reduced motion support

---

## Performance Targets

- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.5s

---

## Technical Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **Components:** shadcn/ui + custom
- **Icons:** Lucide React
- **Database:** SQLite (demo) / PostgreSQL (prod)
- **ORM:** Drizzle
- **AI:** OpenAI GPT-4 (narrative generation)

---

## Demo Accounts

| Role | Email | Access |
|------|-------|--------|
| Patient | sarah.johnson@email.com | Patient Portal |
| Physician | dr.chen@cityhospital.com | Physician Portal |
| Admin | admin@clearpath.health | Analytics Dashboard |

---

## Success Metrics

1. **Conversion:** Demo → Sign-up rate > 15%
2. **Engagement:** Avg session duration > 3 min
3. **Satisfaction:** User feedback score > 4.5/5
4. **Performance:** Lighthouse score > 90

---

## Competitive Positioning

| Feature | ClearPath | Competitor A | Competitor B |
|---------|-----------|--------------|--------------|
| AI Risk Scoring | ✓ | ✗ | Partial |
| Real-time Status | ✓ | ✓ | ✗ |
| Multi-stakeholder | ✓ | Partial | ✗ |
| Appeals Management | ✓ | ✗ | ✗ |
| Gold Card Tracking | ✓ | ✗ | ✗ |

---

*This PRD represents a VC-ready product specification designed to attract Series A investment and enterprise healthcare customers.*
