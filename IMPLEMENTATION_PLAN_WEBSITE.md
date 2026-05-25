# SnipX — Marketing Website Implementation Plan

> **Project**: Single-file HTML/CSS/JS showcase page for SnipX (macOS text expander)
> **Stack**: Pure HTML + CSS + vanilla JS, one file
> **Status**: Plan ready; no code written yet.

---

## 1. File Structure

A single file: `public/index.html` (placed alongside `vite.svg` and `tauri.svg` so it can be served by Vite during dev, or opened directly in a browser).

```
snipx/
├── public/
│   ├── index.html    ← NEW: the marketing site (this plan)
│   ├── tauri.svg
│   └── vite.svg
```

---

## 2. HTML Skeleton (`index.html`)

### 2.1 `<head>`

| Item | Detail |
|------|--------|
| `<!DOCTYPE html>` | Standard |
| `<html lang="en">` | English |
| Meta charset | `UTF-8` |
| Meta viewport | `width=device-width, initial-scale=1.0` |
| Title | `SnipX — Type less. Expand more.` |
| Description | `SnipX is a Mac text expander that inserts templates, snippets, and macros anywhere with a keyboard shortcut.` |
| Favicon | Inline SVG data URI (the interlocking circle mark, small) — OR skip and omit favicon |
| Google Fonts preconnect | `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` |
| Google Fonts stylesheet | `https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap` |
| Styles | Inline `<style>` block in `<head>` |

### 2.2 `<body>`

8 sections in order:

```
1. Fixed Navigation  (<nav>)
2. Hero              (<section id="hero">)
3. Stats Row         (<section id="stats">)
4. Features Grid     (<section id="features">)
5. How It Works      (<section id="how-it-works">)
6. Snippet Examples  (<section id="examples">)
7. CTA Block         (<section id="cta">)
8. Footer            (<footer>)
```

Followed by a single `<script>` block at the bottom for the typing demo animation.

---

## 3. Section-by-Section Implementation

### 3.1 Fixed Navigation

**Structure:**
```html
<nav>
  <div class="nav-inner">
    <div class="nav-left">
      <svg>…</svg>  <!-- inline SVG logo, ~28px -->
      <span class="nav-wordmark">SnipX</span>
    </div>
    <div class="nav-center">
      <a href="#features">Features</a>
      <a href="#how-it-works">How it works</a>
      <a href="#examples">Examples</a>
    </div>
    <div class="nav-right">
      <a href="#" class="btn-download">Download for Mac</a>
    </div>
  </div>
</nav>
```

**Styling:**
- `position: fixed; top: 0; width: 100%; z-index: 100`
- Background: `rgba(10,10,10,0.85)` with `backdrop-filter: blur(16px)`
- Border-bottom: `1px solid rgba(255,255,255,0.07)`
- Height: ~64px, `display: flex; align-items: center`
- Nav link hover: transition to cyan (`#2DD4BF`)
- CTA button: `#2DD4BF` bg, `#0A0A0A` text, `8px` radius, `padding: 8px 20px`

**Logo SVG:**
- Interlocking yin-yang-style dual circle mark
- Two halves: cyan (`#2DD4BF`) and gold (`#F5C518`)
- `viewBox="0 0 32 32"`
- Outer circle: split into two semi-circles
- Inner dot in each half
- `stroke="none"`, `fill` each path
- At smaller size (28×28), reads clearly as two interlocking halves

### 3.2 Hero

**Structure:**
```html
<section id="hero">
  <div class="hero-badge">● Now available for macOS 14+</div>
  <h1>Type less.<br><span class="cyan">Expand more.</span><br><span class="gold">Ship faster.</span></h1>
  <p class="hero-sub">...</p>
  <div class="hero-ctas">
    <a href="#" class="btn-primary">Download for Mac — Free</a>
    <a href="#" class="btn-secondary">See it in action →</a>
  </div>
  <p class="hero-note">Requires macOS 14 or later</p>
  <div class="demo-window">…</div>
</section>
```

**Hero layout:**
- `min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center`
- `padding-top: 64px` (to clear fixed nav)
- Everything centered, max-width ~800px for text

**Hero badge:**
- Inline flex, small font (DM Sans 400, 13px), `rgba(45,212,191,0.15)` bg, `#2DD4BF` text
- `border-radius: 100px`, `padding: 6px 16px`
- Pulsing dot: `::before` with animation — `box-shadow` pulse on a small circle

**Hero H1:**
- Syne 800, ~clamp(40px, 5.5vw, 72px)
- `letter-spacing: -0.04em`
- Line 1: `#F0F0EE` (off-white)
- Line 2: `<span class="cyan">` → `#2DD4BF`
- Line 3: `<span class="gold">` → `#F5C518`

**Hero subheadline:**
- DM Sans 300, `#888884` (muted), ~18px
- "Create shortcuts for your most-used text. Insert them anywhere on your Mac — email, code, docs, chat. Instant."

**CTA buttons:**
- Primary: `#2DD4BF` bg, `#0A0A0A` text, Syne 700, 14px, `border-radius: 10px`, `padding: 14px 28px`
  - Includes inline Apple logo SVG (simple 16px Apple icon)
- Secondary: transparent bg, `1px solid rgba(255,255,255,0.2)`, `#F0F0EE` text, same sizing
- Both: `display: inline-flex; align-items: center; gap: 8px`
- Hover: primary → slightly darker cyan, secondary → `border-color: #2DD4BF`

**Hero note:**
- DM Sans 300, `#888884`, 12px, `margin-top: 12px`

**Fade-up animations:**
- Each hero child gets `opacity: 0; transform: translateY(18px)` initially
- `@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }`
- Applied with `animation: fadeUp 0.6s ease forwards`
- Staggered delays: `.hero-badge` 0.1s, `h1` 0.2s, `.hero-sub` 0.35s, `.hero-ctas` 0.5s, `.hero-note` 0.6s, `.demo-window` 0.75s

### 3.3 Demo Window (Inside Hero)

**Structure:**
```html
<div class="demo-window">
  <div class="demo-chrome">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
  </div>
  <div class="demo-body">
    <span class="demo-prompt">$</span>
    <span class="demo-text" id="demo-text"></span>
    <span class="demo-cursor">|</span>
    <span class="demo-expand" id="demo-expand">✦ Expanding...</span>
  </div>
</div>
```

**Demo chrome:**
- `border-radius: 10px 10px 0 0` on chrome bar
- Three dots: 10px circles, red `#FF5F57`, yellow `#FEBC2E`, green `#28C840`
- Pills inside a flex row with `gap: 8px`, `padding: 12px 16px`
- Chrome bar bg: `#1A1A1A` (slightly lighter than body)
- Body area: `padding: 20px 24px`, bg `#0D0D0D`

**Demo body layout:**
- Flex row: prompt `$` in muted green, text area, cursor, expand message
- `font-family: 'SF Mono', 'Fira Code', monospace`, `font-size: 15px`
- `color: #F0F0EE`
- Shortcut chars typed in white, then the expanded template in gold

**Typing animation (JS):**
```
State machine in the <script> block:

states: TYPING_SHORTCUT | EXPANDING | REVEALING | PAUSING

TYPING_SHORTCUT:
  - characters: ";meeting\n"
  - push char every 60ms into demo-text
  - when done → transition to EXPANDING

EXPANDING:
  - show demo-expand div (fade in, gold color)
  - wait 700ms
  - hide demo-expand
  - transition to REVEALING

REVEALING:
  - resolved text: "Quick sync — Mon 26 May\nAgenda:\n- [ ] {topic}\n- [ ] Action items\n- [ ] Next steps"
  - reveal char by char every 20ms (faster than typing)
  - when done → transition to PAUSING

PAUSING:
  - wait 4 seconds
  - clear demo-text
  - loop back to TYPING_SHORTCUT
```

**Blinking cursor:**
- `.demo-cursor` with `animation: blink 1s step-end infinite`
- `@keyframes blink { 50% { opacity: 0 } }`
- Hidden during PAUSING, visible otherwise

### 3.4 Stats Row

**Structure:**
```html
<section id="stats">
  <div class="stat">
    <span class="stat-number cyan">10×</span>
    <span class="stat-label">faster repetitive writing</span>
  </div>
  <div class="stat">
    <span class="stat-number gold">500+</span>
    <span class="stat-label">snippets supported</span>
  </div>
  <div class="stat">
    <span class="stat-number white">Any app</span>
    <span class="stat-label">works system-wide on Mac</span>
  </div>
  <div class="stat">
    <span class="stat-number cyan">0ms</span>
    <span class="stat-label">expansion delay</span>
  </div>
</section>
```

**Styling:**
- `border-top: 1px solid rgba(255,255,255,0.07)`
- `border-bottom: 1px solid rgba(255,255,255,0.07)`  
- `display: flex; justify-content: center; padding: 48px 24px`
- Each `.stat`: flex column, center-aligned, `flex: 1`, max-width ~240px
- `.stat-number`: Syne 800, ~clamp(28px, 3vw, 36px), `letter-spacing: -0.03em`
- `.stat-label`: DM Sans 300, 14px, `#888884`

### 3.5 Features Grid

**Structure:**
```html
<section id="features">
  <div class="section-label">Features</div>
  <h2>Everything your typing needed.</h2>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon">⌨️</div>
      <h3>Keyboard shortcuts</h3>
      <p>Type a short trigger like ;email to insert entire paragraphs. Your fingers never leave the keyboard.</p>
    </div>
    <div class="feature-card">…</div>
    <div class="feature-card">…</div>
    <div class="feature-card">…</div>
    <div class="feature-card">…</div>
    <div class="feature-card">…</div>
  </div>
</section>
```

**6 feature cards:**
| Icon | H3 | Description |
|------|-----|-------------|
| Keyboard icon (SVG) | Keyboard shortcuts | Type a short trigger like ;email to insert entire paragraphs. |
| Document icon (SVG) | Rich templates | Templates with {placeholders} for names, dates, and dynamic content. |
| Lightning icon (SVG) | Smart macros | Auto-insert today's date, clipboard content, or cursor position. |
| Globe icon (SVG) | Works everywhere | System-wide expansion in email, VS Code, Slack, browsers — any app. |
| Cloud icon (SVG) | iCloud sync | Your snippets sync across Macs via iCloud. Always up to date. |
| Lock icon (SVG) | 100% private | All data stays on your machine. No tracking, no analytics, no cloud processing. |

**Icon SVGs:** simple 24×24 inline paths, colored stroke `currentColor` or explicitly `#2DD4BF`/`#F5C518`. Each icon in a small pill: `border-radius: 8px`, `padding: 6px`, either cyan-tint or gold-tint background.

**Grid layout:**
- `display: grid; grid-template-columns: repeat(3, 1fr)`
- Border-collapse technique: each card has `border-right: 1px solid rgba(255,255,255,0.07)` and `border-bottom: 1px solid rgba(255,255,255,0.07)`
- Cards in the 3rd column have `border-right: none`
- Last row has `border-bottom: none`
- `padding: 32px` per card
- Hover: `background: rgba(255,255,255,0.02)` transition 0.2s

**Section label + H2:**
- Label: DM Sans 400, 12px, uppercase, `letter-spacing: 0.1em`, `#2DD4BF`
- H2: Syne 700, ~clamp(28px, 3vw, 40px), `#F0F0EE`, `margin-bottom: 40px`

### 3.6 How It Works

**Structure:**
```html
<section id="how-it-works">
  <div class="section-label">How it works</div>
  <h2>Three steps to never typing the same thing twice.</h2>
  <div class="steps-row">
    <div class="step-card">
      <div class="step-number">01</div>
      <h3>Create a snippet</h3>
      <p>Write it once. Assign a trigger like <code>;email</code>.</p>
    </div>
    <div class="step-card">
      <div class="step-number">02</div>
      <h3>Type the shortcut</h3>
      <p>In any app — Mail, VS Code, Slack, Safari — type <code>;email</code>.</p>
    </div>
    <div class="step-card">
      <div class="step-number">03</div>
      <h3>Watch it expand</h3>
      <p>Instantly replaced with your full text. Templates, dates, dynamic content.</p>
    </div>
  </div>
</section>
```

**Step number:** Syne 800, ~48px, `color: #F0F0EE; opacity: 0.12`, positioned at top of card.

**Steps row:** `display: flex; gap: 24px; justify-content: center`
- Each step card: `flex: 1`, max-width ~320px, `border: 1px solid rgba(255,255,255,0.07)`, `border-radius: 12px`, `padding: 32px`

**Inline `<code>`:** `font-family: 'SF Mono', 'Fira Code', monospace; color: #2DD4BF; background: rgba(45,212,191,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.9em`

### 3.7 Snippet Examples

**Structure:**
```html
<section id="examples">
  <div class="section-label">Snippet examples</div>
  <h2>Your most-used text, one shortcut away.</h2>
  <div class="examples-grid">
    <div class="example-card">
      <div class="example-header">
        <span class="example-shortcut">;intro</span>
        <span class="example-label">Email intro</span>
      </div>
      <pre class="example-body">Hi {name},

Thanks for reaching out about {topic}. I'd be happy to help.

Let me look into this and get back to you by end of day.

Best,
Wilmond</pre>
    </div>
    <div class="example-card">…</div>
    <div class="example-card">…</div>
    <div class="example-card">…</div>
  </div>
</section>
```

**4 example cards:**
| Shortcut | Label | Template note |
|----------|-------|--------------|
| `;intro` | Email intro | `{name}` and `{topic}` placeholders |
| `;date` | Dynamic date | Shows today's actual date (JS-injected). Note: "← auto-filled every time" |
| `;lgtm` | Code review | "LGTM! A few nits but nothing blocking. Ship it. 🚀" |
| `;ooo` | Out of office | `{return_date}` and `{backup_contact}` placeholders |

**Grid:** `display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px`
- Card: `border: 1px solid rgba(255,255,255,0.07)`, `border-radius: 12px`, `padding: 24px`
- Hover: `border-color: rgba(45,212,191,0.3)` transition 0.2s

**Example header:** flex row, `gap: 12px`
- Shortcut pill: `background: rgba(45,212,191,0.15)`, `color: #2DD4BF`, `font-family: 'SF Mono', monospace`, `padding: 4px 12px`, `border-radius: 6px`, `font-size: 13px`
- Label: DM Sans 400, `#888884`, 14px

**Example body:** `<pre>` with `font-family: 'SF Mono', monospace`, `font-size: 13px`, `line-height: 1.6`, `color: #F0F0EE`, `margin-top: 16px`, `white-space: pre-wrap`
- `{placeholders}` in muted cyan: `color: #5EEAD4` (lighter cyan tint)

**Dynamic date in `;date` card:**
- The `<pre>` contains a `<span id="demo-date"></span>` 
- JS on load: `document.getElementById('demo-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })`
- Note below: "← auto-filled every time" in `#888884`, 12px

### 3.8 CTA Block

**Structure:**
```html
<section id="cta">
  <div class="cta-glow"></div>
  <div class="section-label">Get started</div>
  <h2>Stop retyping. Start flying.</h2>
  <p class="cta-sub">Join thousands of Mac users who type less and ship faster.</p>
  <a href="#" class="btn-primary">Download for Mac — Free</a>
</section>
```

**Styling:**
- `background: #111111`
- `border-top: 1px solid rgba(255,255,255,0.07)`
- `border-bottom: 1px solid rgba(255,255,255,0.07)`
- Centered layout, `padding: 80px 24px`
- `cta-glow`: absolute-positioned div behind text, `width: 400px; height: 400px; background: radial-gradient(circle, rgba(45,212,191,0.12), transparent); filter: blur(60px); pointer-events: none`
- Positioned with `position: relative; overflow: hidden` on the section

### 3.9 Footer

**Structure:**
```html
<footer>
  <div class="footer-inner">
    <div class="footer-left">
      <svg>…</svg>  <!-- small logo mark -->
      <span>SnipX</span>
    </div>
    <div class="footer-center">© 2026 SnipX. All rights reserved.</div>
    <div class="footer-right">
      <a href="#">Privacy</a>
      <a href="#">Support</a>
      <a href="#">Twitter</a>
    </div>
  </div>
</footer>
```

**Styling:**
- `border-top: 1px solid rgba(255,255,255,0.07)`, `padding: 32px 24px`
- Footer inner: `display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto`
- All text: DM Sans 400, 13px, `#888884`
- Links: same muted color, hover → `#F0F0EE`

---

## 4. CSS Architecture

### 4.1 Global Styles

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; background: #0A0A0A; }
body { 
  font-family: 'DM Sans', sans-serif; 
  color: #F0F0EE; 
  background: #0A0A0A;
  -webkit-font-smoothing: antialiased;
}
a { text-decoration: none; color: inherit; }
::selection { background: rgba(45,212,191,0.3); }
```

### 4.2 Reusable Classes

| Class | Properties |
|-------|-----------|
| `.section-label` | DM Sans 400, 12px, uppercase, `letter-spacing: 0.1em`, `#2DD4BF`, `margin-bottom: 8px` |
| `.btn-primary` | inline-flex, `#2DD4BF` bg, `#0A0A0A` text, Syne 700, 14px, `border-radius: 10px`, `padding: 14px 28px` |
| `.btn-secondary` | inline-flex, transparent bg, `1px solid rgba(255,255,255,0.2)`, `#F0F0EE` text, same sizing |
| `.cyan` | `color: #2DD4BF` |
| `.gold` | `color: #F5C518` |

### 4.3 Section Spacing

Each `<section>` (except stats and hero): `padding: 80px 24px` with `max-width: 1100px; margin: 0 auto` for inner content.

Hero: full viewport, centering via flexbox.

Stats: full-width row with top/bottom borders.

---

## 5. JavaScript — Typing Demo

### 5.1 Data

```javascript
const demo = {
  prompt: '$ ',
  shortcut: ';meeting',
  expansion: 'Quick sync — Mon 26 May\nAgenda:\n- [ ] Review sprint progress\n- [ ] Discuss blockers\n- [ ] Plan next steps',
  typingSpeed: 60,      // ms per char
  expandDuration: 700,  // ms for "✦ Expanding..." flash
  revealSpeed: 20,      // ms per char during reveal
  pauseDuration: 4000,  // ms pause before restart
};
```

### 5.2 State Machine

```
idle → TYPING (push shortcut chars into demo-text)
     → EXPANDING (show demo-expand div, fade in)
     → REVEALING (push expansion chars into demo-text)
     → PAUSING (wait, cursor off)
     → TYPING (clear, restart)
```

### 5.3 Functions

| Function | Purpose |
|----------|---------|
| `typeChars(chars, i, speed, cb)` | Adds chars one by one to `demo-text` with `setTimeout` |
| `showExpand()` | Makes `demo-expand` visible (opacity 1) |
| `hideExpand(cb)` | Hides `demo-expand`, calls callback |
| `pause(ms, cb)` | `setTimeout` wrapper |
| `reset()` | Clears `demo-text`, hides cursor |
| `startLoop()` | Entry point, starts the full cycle |
| `updateDate()` | Sets today's date in the `;date` example card |

### 5.4 Date Demo

```javascript
function updateDate() {
  const el = document.getElementById('demo-date');
  if (el) {
    const d = new Date();
    el.textContent = d.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
  }
}
```

Called once on `DOMContentLoaded`.

---

## 6. Animations Reference

| Animation | Element | Keyframes | Duration |
|-----------|---------|-----------|----------|
| `fadeUp` | Hero children | `opacity 0→1; translateY 18px→0` | 0.6s |
| `pulse-dot` | Hero badge dot | `box-shadow` expansion/contraction | 2s infinite |
| `blink` | Demo cursor | `opacity 1→0` | 1s step-end infinite |
| `fadeIn` | Demo expand msg | `opacity 0→1` | 0.2s |
| card hover | Feature cards | `background` lighten | 0.2s |
| card hover border | Example cards | `border-color` → cyan tint | 0.2s |

---

## 7. Inline SVG Assets Needed

| SVG | Size | Description |
|-----|------|-------------|
| Logo mark | 28×28 viewBox | Interlocking cyan + gold circles |
| Apple logo | 16×16 | Simple Apple shape for download button |
| Keyboard icon | 24×24 | ⌨️ simplified |
| Document icon | 24×24 | 📄 simplified |
| Lightning icon | 24×24 | ⚡ simplified |
| Globe icon | 24×24 | 🌐 simplified |
| Cloud icon | 24×24 | ☁️ simplified |
| Lock icon | 24×24 | 🔒 simplified |
| Chevron right | 12×12 | → for secondary CTA |

All are simple inline paths, no external icon libs.

---

## 8. Implementation Order

```
Step 1: HTML skeleton — <head>, all 8 sections with placeholder content
Step 2: CSS global styles — reset, colors, fonts, reusable classes
Step 3: Navigation — fixed nav, logo, links, CTA button
Step 4: Hero section — badge, H1, sub, CTAs, fade-up animations
Step 5: Demo window — chrome, HTML structure, CSS
Step 6: Stats row — 4 stats
Step 7: Features grid — 6 cards with icons
Step 8: How it works — 3 step cards
Step 9: Snippet examples — 4 example cards with dynamic date
Step 10: CTA block + footer
Step 11: JavaScript typing demo
Step 12: Polish — hover states, transitions, glow effects, selection color
```

---

## 9. Verification

- Open `public/index.html` directly in browser (no server needed — no JS modules, no imports)
- Or serve via Vite: navigate to `http://localhost:1420/index.html` if dev server is running
- Check: all sections render, animations play, typing demo loops, date shows current date, hover states work
- File size target: under 150KB (mostly inline SVG paths and CSS)
- Zero external dependencies beyond Google Fonts stylesheet
