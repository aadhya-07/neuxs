# Nexus — UI design system

## Concept

Nexus replaces scattered WhatsApp groups and physical noticeboards with one
verified, searchable feed. The UI should feel like a **clean, modern
noticeboard** — content organized by type, colored by module, easy to scan —
not a generic dashboard template. Every visual choice below ties back to that:
color always tells you *what kind* of post you're looking at, and the
verified checkmark is shown everywhere identity appears, because
college-email verification is the product's core differentiator from
WhatsApp.

## Color palette

Base colors (light mode):

| Token | Hex | Use |
|---|---|---|
| Page background | `#F6F7F9` | App canvas |
| Card surface | `#FFFFFF` | Post cards, search bar, sidebar active state |
| Ink (primary text) | `#14171F` | Headlines, primary text |
| Ink soft (secondary text) | `#6B7180` | Descriptions, meta text |
| Ink faint (tertiary text) | `#9CA1AD` | Timestamps, placeholder text |
| Border | `#E7E9EE` | Card borders, dividers |
| Brand | `#2F5CF3` | Primary buttons, verified checkmark |

Dark mode swaps these for `#0F1115` page / `#171A21` card / `#EEF0F4` ink,
keeping the same relationships (see the HTML for exact values).

### Module colors

Each of the five modules gets exactly one color. It's used *only* for that
module's tag and card accent — never mixed in for decoration elsewhere. This
is what lets someone recognize a post's category at a glance without reading
the label.

| Module | Color | Hex |
|---|---|---|
| Lost & found | Orange | `#E98A1E` |
| Marketplace | Green | `#17A673` |
| Doubt board | Purple | `#7C5CF0` |
| Referrals | Blue | `#2F80F0` |
| Events | Pink | `#E23F8E` |

Each module color also has a pale tint (10–15% mix into white/black) used
as the background behind its tag label, so text stays readable — never
plain black or gray text on a colored tag.

## Typography

Two typefaces, two clearly different jobs:

- **Archivo Black** — post titles and page headlines only. Bold, condensed,
  a little loud — it's meant to read like a notice, not a caption.
- **Inter** — everything else: body copy, meta text, buttons, navigation,
  tags. Weights used: 400 (body), 500 (labels), 600–700 (buttons, tags).

Type scale:

| Element | Size | Weight | Family |
|---|---|---|---|
| Page heading (`h1`) | 26px | 400 | Archivo Black |
| Post title (`h3`) | 15.5px | 400 | Archivo Black |
| Body / description | 13–14px | 400 | Inter |
| Meta text (timestamps, counts) | 11.5–12px | 400 | Inter |
| Buttons, nav items | 14px | 600 | Inter |
| Tags, status chips | 10.5px | 700 | Inter |

## Layout

**Desktop (>1100px):** three-column layout — fixed 240px sidebar (logo,
module navigation, "New post" button, profile) on the left, a centered
feed area with a 2-column card grid in the middle, and a 280px "Trending on
campus" rail on the right.

**Tablet (860–1100px):** sidebar stays, right rail drops, feed grid becomes
single or double column depending on width.

**Mobile (<860px):** sidebar becomes a slim top bar (logo + avatar) with a
horizontally scrollable row of filter pills underneath it. Feed drops to a
single column. A floating "+" action button appears bottom-right for
creating a post, replacing the sidebar's button.

This is one component set with responsive rules, not a separate "mobile
design" — the same card, same colors, same type scale everywhere.

## Components

- **Post card:** white surface, 1px border, 3px colored left border matching
  its module, 12px corner radius, subtle shadow (`0 1px 2px rgba(0,0,0,.04),
  0 8px 20px rgba(0,0,0,.05)`). Lifts 2px on hover — the only hover motion
  in the system.
- **Tag:** small pill, module color text on that module's pale background.
- **Verified checkmark:** small filled circle with a check, brand blue,
  placed directly after any person or club name.
- **Status chip:** neutral gray by default; turns to the marketplace green
  tint when a post is "open" (applied, upvoted, RSVP'd) so open/active
  states share one consistent color regardless of module.
- **Filter pills / nav items:** inactive states are quiet (gray text, white
  or transparent background); the active state fills solid with that
  module's color and switches text to white.

## Motion

One rule: motion only responds to what the person does.

- Tapping a filter switches the active pill/nav color and filters the grid —
  no animation beyond the instant color swap.
- Hovering a card lifts it 2px — the only ambient hover effect in the system.
- Nothing animates on page load. No staggered fade-ins, no scroll-triggered
  reveals.

## What to avoid

- Don't introduce a 6th "neutral" accent color — gray/ink already covers
  anything that isn't tied to a specific module.
- Don't reuse a module color outside its module (e.g. green anywhere other
  than Marketplace and "open" status).
- Don't add drop shadows heavier than the card default — one shadow weight,
  used consistently, keeps the interface calm.
- Don't switch typefaces for emphasis — use Inter's 600/700 weights instead
  of introducing a third family.
