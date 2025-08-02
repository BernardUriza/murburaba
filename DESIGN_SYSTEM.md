# 🎨 Murmuraba Studio Design System v3.0.0

The Murmuraba Studio design system provides a comprehensive set of design tokens, components, and guidelines that ensure consistency and maintainability across the entire application.

## 🌈 Color System

### Primary Colors
```css
--primary-50: #f0f4ff;
--primary-100: #e0e7ff;
--primary-400: #8b5cf6;
--primary-500: #8b5cf6;
--primary-600: #7c3aed;
```

### Gradients
```css
--primary-gradient: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
--secondary-gradient: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
--success-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
--warning-gradient: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
--danger-gradient: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
```

### Dark Theme Colors
```css
--dark-bg: #0a0b0f;
--dark-surface: #1a1b26;
--dark-surface-2: #24253a;
--dark-surface-3: #2e2f4a;
--dark-text: #e0e0e6;
--dark-text-secondary: #a0a0ab;
--dark-border: #3b3c5a;
```

### Accent Colors
```css
--accent-cyan: #67e8f9;
--accent-green: #10b981;
--accent-yellow: #fbbf24;
--accent-pink: #ec4899;
--accent-purple: #a78bfa;
```

## 📏 Spacing System

```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
```

## 🔤 Typography Scale

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
```

### Font Families
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Fira Code', 'Monaco', 'Consolas', monospace;
```

## 🔘 Border Radius

```css
--radius-sm: 0.125rem;   /* 2px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-3xl: 1.5rem;    /* 24px */
--radius-full: 9999px;
```

## 🌟 Shadows & Elevation

```css
--elevation-1: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
--elevation-2: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
--elevation-3: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);

--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.1);
--shadow-glow: 0 0 20px rgba(139, 92, 246, 0.3);
```

## ⚡ Animations & Transitions

```css
--transition-fast: 150ms ease-out;
--transition-base: 250ms ease-out;
--transition-slow: 500ms ease-out;
--transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Animation Keyframes
- `fade-in`: Smooth fade in with slide up
- `pulse-glow`: Pulsing glow effect for emphasis
- `gradient-shift`: Animated gradient movement
- `shake`: Error indication animation

## 🧩 Component Patterns

### Glass Panels
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-xl);
}
```

### Neon Effects
```css
.neon-text {
  text-shadow: 
    0 0 10px currentColor,
    0 0 20px currentColor,
    0 0 40px currentColor;
}
```

### Modern Buttons
```css
.btn {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--primary-gradient);
  color: white;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}
```

## 📱 Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

## 🎯 Usage Guidelines

### Do's ✅
- Use design tokens for all spacing, colors, and typography
- Implement hover and focus states for interactive elements  
- Use gradient animations for primary actions
- Apply glassmorphism effects for floating panels
- Follow the established component patterns

### Don'ts ❌
- Don't hardcode colors, spacing, or typography values
- Don't mix different animation timing functions
- Don't override design system variables
- Don't create new color variants without system approval

## 🔧 Implementation

The design system is implemented through CSS custom properties in `/src/styles/design-system.css` and imported globally. All components should reference these tokens rather than hardcoded values.

### Example Usage
```css
.my-component {
  padding: var(--space-4);
  background: var(--dark-surface);
  border-radius: var(--radius-lg);
  color: var(--dark-text);
  transition: all var(--transition-base);
}

.my-component:hover {
  background: var(--primary-gradient);
  box-shadow: var(--elevation-2);
}
```

This design system ensures visual consistency, maintainability, and a modern aesthetic throughout Murmuraba Studio.