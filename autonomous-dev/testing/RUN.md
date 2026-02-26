# Test Session Protocol

> Read this file at the start of every testing session.
> It defines the JS listeners, audit functions, guardrails, discovery process, and results format.

---

## Step 1: Inject the Mega Listener

Before doing ANYTHING else, navigate to the target URL and execute this JavaScript.
This captures errors, warnings, network failures, performance metrics, and layout shifts.

```javascript
// ═══════════════════════════════════════════════════════════════════
//  MEGA LISTENER — Inject on every page load
// ═══════════════════════════════════════════════════════════════════

window.__testErrors = [];
window.__testWarnings = [];
window.__networkErrors = [];
window.__layoutShifts = [];
window.__perfMetrics = {};

// ─── Console Error Capture ──────────────────────────────────────
const origError = console.error;
console.error = function(...args) {
  window.__testErrors.push({
    type: 'console.error',
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
  origError.apply(console, args);
};

// ─── Console Warn Capture ───────────────────────────────────────
const origWarn = console.warn;
console.warn = function(...args) {
  window.__testWarnings.push({
    type: 'console.warn',
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
  origWarn.apply(console, args);
};

// ─── Uncaught Errors ────────────────────────────────────────────
window.addEventListener('error', function(e) {
  window.__testErrors.push({
    type: 'window.onerror',
    message: e.message,
    source: e.filename + ':' + e.lineno,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
});

// ─── Unhandled Promise Rejections ───────────────────────────────
window.addEventListener('unhandledrejection', function(e) {
  window.__testErrors.push({
    type: 'unhandledrejection',
    message: String(e.reason),
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
});

// ─── Failed Network Requests ────────────────────────────────────
const origFetch = window.fetch;
window.fetch = function(...args) {
  return origFetch.apply(this, args).then(response => {
    if (!response.ok) {
      window.__networkErrors.push({
        type: 'fetch_error',
        url: typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown',
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString(),
        page: window.location.href
      });
    }
    return response;
  }).catch(err => {
    window.__networkErrors.push({
      type: 'fetch_network_error',
      url: typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown',
      message: String(err),
      timestamp: new Date().toISOString(),
      page: window.location.href
    });
    throw err;
  });
};

// ─── Performance Metrics (Core Web Vitals) ──────────────────────
try {
  new PerformanceObserver(function(list) {
    var entries = list.getEntries();
    window.__perfMetrics.lcp = entries[entries.length - 1].startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch(e) {}

try {
  var clsValue = 0;
  new PerformanceObserver(function(list) {
    list.getEntries().forEach(function(entry) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        window.__layoutShifts.push({
          value: entry.value,
          timestamp: new Date().toISOString(),
          url: window.location.href
        });
      }
    });
    window.__perfMetrics.cls = clsValue;
  }).observe({ type: 'layout-shift', buffered: true });
} catch(e) {}

try {
  var worstINP = 0;
  new PerformanceObserver(function(list) {
    list.getEntries().forEach(function(entry) {
      if (entry.interactionId && entry.duration > worstINP) {
        worstINP = entry.duration;
      }
    });
    window.__perfMetrics.inp = worstINP;
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
} catch(e) {}

try {
  new PerformanceObserver(function(list) {
    list.getEntries().forEach(function(entry) {
      if (entry.name === 'first-contentful-paint') {
        window.__perfMetrics.fcp = entry.startTime;
      }
    });
  }).observe({ type: 'paint', buffered: true });
} catch(e) {}

try {
  var nav = performance.getEntriesByType('navigation')[0];
  if (nav) window.__perfMetrics.ttfb = nav.responseStart - nav.requestStart;
} catch(e) {}

console.log('MEGA LISTENER active: errors + warnings + network + performance + layout shifts');
```

**Re-inject after any full page reload** (SPA navigation preserves it, hard reloads lose it).

---

## Step 2: Audit Functions

These are OPTIONAL. Run them via `browser_evaluate` when a suite requires deeper analysis.
They are NOT auto-injected — call them only when needed to stay within action budgets.

### Accessibility Quick Audit

```javascript
// Run via browser_evaluate — returns a11y violations detectable without axe-core
window.__auditAccessibility = function() {
  var violations = [];

  // Color contrast (simplified — checks text against direct background)
  function luminance(r, g, b) {
    var a = [r, g, b].map(function(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
  function contrastRatio(rgb1, rgb2) {
    var l1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
    var l2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function parseColor(str) {
    var m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }

  document.querySelectorAll('p,span,a,button,label,h1,h2,h3,h4,h5,h6,li,td,th').forEach(function(el) {
    var style = window.getComputedStyle(el);
    var text = el.textContent && el.textContent.trim();
    if (!text || style.display === 'none' || style.visibility === 'hidden') return;
    var fg = parseColor(style.color);
    var bg = parseColor(style.backgroundColor);
    if (!fg || !bg || style.backgroundColor === 'rgba(0, 0, 0, 0)') return;
    var ratio = contrastRatio(fg, bg);
    var fontSize = parseFloat(style.fontSize);
    var fontWeight = parseInt(style.fontWeight);
    var isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    var threshold = isLarge ? 3.0 : 4.5;
    if (ratio < threshold) {
      violations.push({ type: 'color-contrast', element: el.tagName, text: text.substring(0, 40),
        ratio: Math.round(ratio * 100) / 100, required: threshold });
    }
  });

  // Missing labels on inputs
  document.querySelectorAll('input,select,textarea').forEach(function(el) {
    if (el.type === 'hidden' || el.type === 'submit') return;
    var hasLabel = el.labels && el.labels.length > 0;
    var hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    var hasTitle = el.getAttribute('title');
    if (!hasLabel && !hasAria && !hasTitle) {
      violations.push({ type: 'missing-label', element: el.tagName, name: el.name || el.id || 'unnamed' });
    }
  });

  // Heading order
  var headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
  var prevLevel = 0;
  headings.forEach(function(h) {
    var level = parseInt(h.tagName[1]);
    if (prevLevel > 0 && level > prevLevel + 1) {
      violations.push({ type: 'heading-skip', from: 'h' + prevLevel, to: h.tagName, text: h.textContent.trim().substring(0, 30) });
    }
    prevLevel = level;
  });

  // Missing lang on html
  if (!document.documentElement.getAttribute('lang')) {
    violations.push({ type: 'missing-lang', element: 'html' });
  }

  // Missing page title
  if (!document.title || document.title.trim().length === 0) {
    violations.push({ type: 'missing-title' });
  }

  // Images without alt
  document.querySelectorAll('img').forEach(function(img) {
    if (!img.alt && img.getAttribute('role') !== 'presentation' && !img.getAttribute('aria-label')) {
      violations.push({ type: 'missing-alt', src: img.src.substring(0, 60) });
    }
  });

  // Buttons/links without accessible names
  document.querySelectorAll('button,a,[role="button"]').forEach(function(el) {
    var name = el.textContent && el.textContent.trim();
    var ariaLabel = el.getAttribute('aria-label');
    var ariaLabelledby = el.getAttribute('aria-labelledby');
    var title = el.getAttribute('title');
    if (!name && !ariaLabel && !ariaLabelledby && !title) {
      violations.push({ type: 'missing-name', element: el.tagName, html: el.outerHTML.substring(0, 60) });
    }
  });

  // Touch target sizes (WCAG 2.5.8 — 24x24 minimum)
  document.querySelectorAll('a,button,input,select,[role="button"],[onclick]').forEach(function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24)) {
      violations.push({ type: 'small-target', element: el.tagName, text: (el.textContent || '').trim().substring(0, 20),
        width: Math.round(rect.width), height: Math.round(rect.height) });
    }
  });

  return { violations: violations, count: violations.length, url: window.location.href };
};
```

### Accessibility Fix Verification

Use this AFTER fixing an a11y bug to confirm the fix is correct. Returns numerical measurements.

```javascript
// Run via browser_evaluate — measures specific a11y properties on targeted elements
window.__verifyA11yFix = function(selector) {
  var results = [];
  var els = document.querySelectorAll(selector || '*');

  function luminance(r, g, b) {
    var a = [r, g, b].map(function(v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
  function contrastRatio(rgb1, rgb2) {
    var l1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
    var l2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function parseColor(str) {
    var m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }

  els.forEach(function(el) {
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    var rect = el.getBoundingClientRect();
    var entry = {
      tag: el.tagName,
      text: (el.textContent || '').trim().substring(0, 40),
      selector: el.id ? '#' + el.id : el.className ? '.' + el.className.split(' ')[0] : el.tagName
    };

    // Contrast measurement
    var fg = parseColor(style.color);
    var bg = parseColor(style.backgroundColor);
    if (fg && bg && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      entry.contrast = Math.round(contrastRatio(fg, bg) * 100) / 100;
      entry.fg = style.color;
      entry.bg = style.backgroundColor;
    }

    // Accessible name
    entry.ariaLabel = el.getAttribute('aria-label') || null;
    entry.ariaLabelledby = el.getAttribute('aria-labelledby') || null;
    entry.role = el.getAttribute('role') || null;
    entry.hasVisibleText = !!(el.textContent && el.textContent.trim());

    // Size (for touch target check)
    if (rect.width > 0 && rect.height > 0) {
      entry.width = Math.round(rect.width);
      entry.height = Math.round(rect.height);
    }

    // Focus indicator (check computed outline)
    entry.outlineStyle = style.outlineStyle;
    entry.outlineColor = style.outlineColor;
    entry.outlineWidth = style.outlineWidth;

    results.push(entry);
  });

  return { elements: results, count: results.length, url: window.location.href };
};
```

**Usage examples:**
- Verify sidebar active link contrast: `__verifyA11yFix('.sidebar-link.active, [aria-current="page"]')`
- Verify all buttons have names: `__verifyA11yFix('button')`
- Verify touch target sizes: `__verifyA11yFix('button, a, [role="button"]')`
- Check specific element: `__verifyA11yFix('[aria-label="Toggle sidebar"]')`

### Empty State Audit

```javascript
// Run on a page with no data — checks if empty states are helpful
window.__auditEmptyStates = function() {
  var findings = [];
  var body = document.body;
  var text = body.innerText || '';
  var wordCount = text.split(/\s+/).filter(Boolean).length;

  // Check if page appears empty (very little content)
  if (wordCount < 20) {
    findings.push({ type: 'possibly-empty-page', wordCount: wordCount });
  }

  // Check for helpful empty state patterns
  var hasIllustration = !!document.querySelector('[data-empty-state], .empty-state, [class*="empty"]');
  var hasCTA = false;
  var hasExplanation = false;

  document.querySelectorAll('p, span, div').forEach(function(el) {
    var t = (el.textContent || '').trim();
    if (t.length > 20 && t.length < 200) {
      if (/add|create|get started|no .* yet|begin|first/i.test(t)) {
        hasExplanation = true;
      }
    }
  });

  document.querySelectorAll('button, a[href]').forEach(function(el) {
    var t = (el.textContent || '').trim();
    if (/add|create|get started|new|import/i.test(t)) {
      hasCTA = true;
    }
  });

  return {
    url: window.location.href,
    wordCount: wordCount,
    hasEmptyStateMarker: hasIllustration,
    hasExplanation: hasExplanation,
    hasCTA: hasCTA,
    score: (hasIllustration ? 1 : 0) + (hasExplanation ? 1 : 0) + (hasCTA ? 1 : 0),
    maxScore: 3,
    findings: findings
  };
};
```

### State Coverage Audit

```javascript
// Run on any page — checks that loading, empty, error, and success states exist
window.__auditStateCoverage = function() {
  var states = {
    loading: { found: false, evidence: [] },
    empty: { found: false, evidence: [] },
    error: { found: false, evidence: [] },
    success: { found: false, evidence: [] },
    disabled: { found: false, evidence: [] }
  };

  var html = document.body.innerHTML;
  var text = document.body.innerText || '';

  // Loading state indicators
  var loadingSelectors = '[class*="skeleton"], [class*="spinner"], [class*="loading"], [class*="shimmer"], [role="progressbar"], [aria-busy="true"]';
  var loadingEls = document.querySelectorAll(loadingSelectors);
  if (loadingEls.length > 0) {
    states.loading.found = true;
    states.loading.evidence.push(loadingEls.length + ' loading indicators in DOM');
  }
  if (/loading|spinner|skeleton|shimmer/i.test(html)) {
    states.loading.found = true;
    states.loading.evidence.push('Loading-related classes found in markup');
  }

  // Empty state indicators
  var emptyPatterns = /no .*(yet|found|results)|get started|create your first|empty|nothing here/i;
  if (emptyPatterns.test(text)) {
    states.empty.found = true;
    states.empty.evidence.push('Empty state text found');
  }
  var emptyEls = document.querySelectorAll('[class*="empty"], [data-empty-state], [class*="no-data"], [class*="placeholder"]');
  if (emptyEls.length > 0) {
    states.empty.found = true;
    states.empty.evidence.push(emptyEls.length + ' empty state elements in DOM');
  }

  // Error state indicators
  var errorSelectors = '[class*="error"], [role="alert"], [aria-invalid="true"], [class*="destructive"]';
  var errorEls = document.querySelectorAll(errorSelectors);
  if (errorEls.length > 0) {
    states.error.found = true;
    states.error.evidence.push(errorEls.length + ' error-related elements in DOM');
  }
  if (/error|failed|something went wrong|try again/i.test(html)) {
    states.error.found = true;
    states.error.evidence.push('Error-related markup found');
  }

  // Success state indicators
  var successSelectors = '[class*="success"], [class*="toast"], [class*="notification"]';
  var successEls = document.querySelectorAll(successSelectors);
  if (successEls.length > 0) {
    states.success.found = true;
    states.success.evidence.push(successEls.length + ' success/notification elements in DOM');
  }

  // Disabled state indicators
  var disabledEls = document.querySelectorAll('[disabled], [aria-disabled="true"], [class*="disabled"]');
  if (disabledEls.length > 0) {
    states.disabled.found = true;
    states.disabled.evidence.push(disabledEls.length + ' disabled elements found');
  }

  var coveredCount = Object.values(states).filter(function(s) { return s.found; }).length;

  return {
    url: window.location.href,
    states: states,
    coveredCount: coveredCount,
    totalStates: 5,
    score: coveredCount + '/5',
    missing: Object.entries(states).filter(function(e) { return !e[1].found; }).map(function(e) { return e[0]; })
  };
};
```

**Usage:** `__auditStateCoverage()` — returns which of 5 state types (loading/empty/error/success/disabled)
are present on the current page. Missing states should be logged to IMPROVEMENTS.md.
Note: This checks for the *capability* to show these states in the DOM, not whether they're
currently visible. A page that has skeleton components (even if data is loaded) scores for loading.

### Design Token Compliance Audit

```javascript
// Checks for hardcoded colors and magic pixel values that bypass design tokens
window.__auditDesignTokens = function() {
  var violations = [];
  var hexPattern = /#[0-9a-fA-F]{3,8}\b/;
  var rgbPattern = /rgb\(|rgba\(/;
  var pxPattern = /\b\d+px\b/;

  // Known design token values (from globals.css) — these are OK
  var knownColors = ['#0A0A0B', '#111113', '#14B8A6', '#3B82F6', '#22C55E',
    '#EAB308', '#EF4444', '#F97316', '#8B5CF6', '#60A5FA',
    '#2563EB', '#1D4ED8', '#000000', '#ffffff', '#fff', '#000'];
  var knownColorsLower = knownColors.map(function(c) { return c.toLowerCase(); });

  // Check inline styles for hardcoded colors
  document.querySelectorAll('[style]').forEach(function(el) {
    var style = el.getAttribute('style') || '';
    var hexMatches = style.match(/#[0-9a-fA-F]{3,8}/g) || [];
    hexMatches.forEach(function(hex) {
      if (knownColorsLower.indexOf(hex.toLowerCase()) === -1) {
        violations.push({
          type: 'hardcoded-color',
          value: hex,
          element: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
          context: style.substring(0, 80)
        });
      }
    });
  });

  // Check computed styles on visible interactive elements for non-token colors
  var interactiveEls = document.querySelectorAll('button, a, input, select, [role="button"]');
  var sampledCount = 0;
  interactiveEls.forEach(function(el) {
    if (sampledCount > 30) return; // cap to avoid performance hit
    var computed = window.getComputedStyle(el);
    var bg = computed.backgroundColor;
    // Flag RGB values that aren't transparent or standard black/white
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(0, 0, 0)' && bg !== 'rgb(255, 255, 255)') {
      // This is informational — just collect what's in use
      sampledCount++;
    }
  });

  // Check for inline style pixel values that should use spacing scale
  document.querySelectorAll('[style]').forEach(function(el) {
    var style = el.getAttribute('style') || '';
    var pxMatches = style.match(/(?:margin|padding|gap|top|left|right|bottom|width|height):\s*\d+px/g) || [];
    pxMatches.forEach(function(match) {
      var px = parseInt(match.match(/\d+/)[0]);
      // Tailwind spacing scale: 0,1,2,4,6,8,10,12,14,16,20,24,28,32,36,40,44,48...
      var scale = [0,1,2,4,6,8,10,12,14,16,20,24,28,32,36,40,44,48,56,64,72,80,96];
      if (scale.indexOf(px) === -1 && px > 0) {
        violations.push({
          type: 'off-scale-spacing',
          value: px + 'px',
          element: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
          context: match
        });
      }
    });
  });

  return {
    url: window.location.href,
    violations: violations,
    violationCount: violations.length,
    summary: violations.length === 0
      ? 'Clean — no hardcoded colors or off-scale spacing found in inline styles'
      : violations.length + ' potential design token violations found'
  };
};
```

**Usage:** `__auditDesignTokens()` — scans for inline styles with hardcoded hex colors
(not matching known tokens) and pixel values that don't align with the Tailwind spacing scale.
Note: This only catches inline `style=""` attributes, not Tailwind classes — those are validated
at build time. Focus is on dynamic styles and manual overrides.

### Performance Audit

```javascript
window.__auditPerformance = function() {
  var resources = performance.getEntriesByType('resource');
  var issues = [];
  var totalTransfer = 0;

  resources.forEach(function(r) {
    totalTransfer += r.transferSize || 0;
    if (r.transferSize > 250000) {
      issues.push({ type: 'large-resource', name: r.name.split('/').pop(), size: Math.round(r.transferSize / 1024) + 'KB' });
    }
    if (r.renderBlockingStatus === 'blocking') {
      issues.push({ type: 'render-blocking', name: r.name.split('/').pop() });
    }
  });

  var memory = null;
  if (performance.memory) {
    memory = {
      usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
      totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    };
  }

  return {
    metrics: window.__perfMetrics || {},
    resources: { total: resources.length, totalTransferKB: Math.round(totalTransfer / 1024) },
    memory: memory,
    issues: issues,
    thresholds: { lcp: 2500, cls: 0.1, inp: 200, fcp: 1800, ttfb: 800 }
  };
};
```

### Responsive Audit

```javascript
window.__auditResponsive = function() {
  var violations = [];
  var vw = window.innerWidth;

  // Horizontal overflow
  if (document.documentElement.scrollWidth > window.innerWidth) {
    violations.push({ type: 'horizontal-overflow',
      overflowPx: document.documentElement.scrollWidth - window.innerWidth });
  }

  // Hidden truncation without ellipsis
  document.querySelectorAll('*').forEach(function(el) {
    var style = window.getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth && style.overflow === 'hidden' && style.textOverflow !== 'ellipsis') {
      var text = el.textContent && el.textContent.trim();
      if (text && text.length > 5) {
        violations.push({ type: 'hidden-truncation', element: el.tagName + '.' + (el.className || '').split(' ')[0],
          text: text.substring(0, 30) });
      }
    }
  });

  // Touch targets too small on mobile (< 768px)
  if (vw < 768) {
    document.querySelectorAll('a,button,input,select,[role="button"]').forEach(function(el) {
      var rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
        violations.push({ type: 'small-touch-target', element: el.tagName,
          text: (el.textContent || '').trim().substring(0, 20),
          width: Math.round(rect.width), height: Math.round(rect.height), required: 44 });
      }
    });
  }

  // Non-responsive images
  document.querySelectorAll('img').forEach(function(img) {
    var style = window.getComputedStyle(img);
    if (img.naturalWidth > vw && style.maxWidth === 'none') {
      violations.push({ type: 'non-responsive-image', src: img.src.substring(0, 60) });
    }
  });

  return { viewport: vw, violations: violations };
};
```

### Content Quality Audit

```javascript
window.__auditContent = function() {
  var violations = [];
  var patterns = [
    /lorem ipsum/i, /dolor sit amet/i, /\bTODO\b/, /\bFIXME\b/, /\bHACK\b/, /\bXXX\b/,
    /placeholder/i, /sample text/i, /example\.com/i, /foo@bar/i, /john\.?doe/i,
    /coming soon/i, /under construction/i, /\basdf\b/i, /\bqwerty\b/i
  ];

  // Placeholder text detection
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    var text = walker.currentNode.textContent.trim();
    if (text.length < 3) continue;
    patterns.forEach(function(p) {
      if (p.test(text)) {
        violations.push({ type: 'placeholder-text', pattern: p.source,
          text: text.substring(0, 50), element: walker.currentNode.parentElement.tagName });
      }
    });
  }

  // Broken images
  document.querySelectorAll('img').forEach(function(img) {
    if (img.complete && img.naturalWidth === 0) {
      violations.push({ type: 'broken-image', src: img.src.substring(0, 60) });
    }
  });

  // Empty elements that should have content
  document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,button,a,label,th').forEach(function(el) {
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    if (!el.textContent.trim() && !el.querySelector('img,svg,[aria-label]')) {
      violations.push({ type: 'empty-element', element: el.tagName, id: el.id || el.className });
    }
  });

  return { violations: violations, url: window.location.href };
};
```

### Cognitive Load Audit

```javascript
window.__auditCognitiveLoad = function() {
  var interactive = document.querySelectorAll('a,button,input,select,textarea,[role="button"]');
  var colors = new Set();
  var fonts = new Set();
  document.querySelectorAll('*').forEach(function(el) {
    var s = window.getComputedStyle(el);
    if (s.display !== 'none') {
      colors.add(s.color);
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(s.backgroundColor);
      fonts.add(s.fontFamily.split(',')[0].trim());
    }
  });

  var maxDepth = 0;
  function measureDepth(el, depth) {
    if (depth > maxDepth) maxDepth = depth;
    for (var i = 0; i < el.children.length; i++) measureDepth(el.children[i], depth + 1);
  }
  measureDepth(document.body, 0);

  var wordCount = document.body.innerText.split(/\s+/).filter(Boolean).length;

  return {
    interactiveElements: interactive.length,
    distinctColors: colors.size,
    distinctFonts: fonts.size,
    maxDOMDepth: maxDepth,
    wordCount: wordCount,
    thresholds: {
      interactiveElements: { good: 25, poor: 40 },
      distinctColors: { good: 10, poor: 15 },
      distinctFonts: { good: 2, poor: 3 },
      maxDOMDepth: { good: 12, poor: 15 },
      wordCount: { good: 300, poor: 500 }
    }
  };
};
```

### Security Audit

```javascript
window.__auditSecurity = function() {
  var findings = [];
  var sensitiveKeys = [/token/i, /password/i, /secret/i, /api.?key/i, /bearer/i, /jwt/i, /private/i];

  // localStorage audit
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    var val = localStorage.getItem(key);
    sensitiveKeys.forEach(function(p) {
      if (p.test(key) || (val && p.test(val))) {
        findings.push({ type: 'sensitive-storage', storage: 'localStorage', key: key, pattern: p.source });
      }
    });
  }

  // sessionStorage audit
  for (var j = 0; j < sessionStorage.length; j++) {
    var skey = sessionStorage.key(j);
    var sval = sessionStorage.getItem(skey);
    sensitiveKeys.forEach(function(p) {
      if (p.test(skey) || (sval && p.test(sval))) {
        findings.push({ type: 'sensitive-storage', storage: 'sessionStorage', key: skey, pattern: p.source });
      }
    });
  }

  // Sensitive data in current URL
  var url = window.location.href;
  [/password=/i, /token=/i, /secret=/i, /api_key=/i, /bearer=/i].forEach(function(p) {
    if (p.test(url)) {
      findings.push({ type: 'sensitive-url-param', pattern: p.source, url: url });
    }
  });

  return { findings: findings, url: window.location.href };
};
```

---

## Step 3: Load Context (if available)

If an app context file exists in `testing/apps/`, read it now. It provides:
- Test credentials
- Known routes to verify
- Priority flows (golden paths)
- Design tokens (for visual consistency audit)
- Known issues to skip

If no context file exists, proceed with discovery (the suites are designed for cold starts).

## Step 4: Run the Suite

Read the requested suite file from `testing/suites/`. Follow its instructions.
See `testing/suites/SUITE-INDEX.md` for the full list and recommended cadences.

Apply `testing/CHECKLIST.md` to every page visited.

---

## Guardrails

These limits prevent runaway sessions and wasted tokens.

| Rule | Limit | What to do when hit |
|------|-------|---------------------|
| Action budget | 40 actions per suite | Stop, report findings so far, ask if user wants to continue. |
| State dump | Every 10 actions | Print: current page, actions taken, errors found, coverage so far. |
| Loop detection | Same page visited 3 times | Stop that flow. You're stuck. Move to the next item. |
| Stuck detection | Same element clicked twice with no page change | Try a different approach or skip. |
| Error cascade | 5+ P0 errors on a single page | Stop testing that page. It is fundamentally broken. Report and move on. |

### Counting Actions

An "action" is any interaction with the page:
- Clicking a link or button
- Filling an input field
- Pressing a key
- Navigating to a URL
- Resizing the viewport

Reading the accessibility tree, checking `window.__testErrors`, or running audit functions does NOT count as an action.

## One Action at a Time

Before every click or interaction:
1. **State** what you're about to do: "Clicking the 'Companies' link in the sidebar"
2. **Do it** — one action only
3. **Observe** — read the accessibility tree, check for errors
4. **Record** — note the result before moving on

Never chain multiple clicks without observing between them.

---

## Discovery Phase

Every suite starts with discovery. Before testing anything:

1. Read the current page's accessibility tree
2. Identify all navigation elements: `<nav>`, sidebar links, header links, footer links, tab bars
3. List every clickable link/button with its text and apparent destination
4. This becomes your test map for the session

If an app context file provided a route list, verify it matches what you discover. Report any discrepancies.

---

## Results Format

At the end of every suite, produce:

### Findings Table

| # | Severity | Category | Page | Finding | Steps to Reproduce |
|---|----------|----------|------|---------|--------------------|
| 1 | P0 | Error | /deals | Console error on page load | Navigate to /deals |
| 2 | P1 | A11y | /people/new | Form input missing label | Click People → New Person |
| 3 | P2 | Perf | /dashboard | LCP 3200ms (threshold: 2500ms) | Navigate to /dashboard |
| ... | | | | | |

### Severity Definitions

- **P0 — Broken:** Page crashes, console errors, 404s, data loss, stuck states, security vulnerabilities. Must fix.
- **P1 — Blocked:** Feature doesn't work, dead-end navigation, form can't submit, WCAG AA violations. Should fix.
- **P2 — Degraded:** Poor UX, missing validation, performance above threshold, missing empty states. Fix when convenient.
- **P3 — Polish:** Cosmetic issues, minor inconsistencies, improvement suggestions, cognitive load warnings. Backlog.

### Category Tags

Use these in findings: `Error`, `A11y`, `Perf`, `Responsive`, `Visual`, `Content`, `Security`, `UX`, `Data`, `Navigation`

### Console Error Log

```
[COUNT]x ERROR on PAGE: MESSAGE
```

### Network Error Log

```
[STATUS] URL on PAGE
```

### Performance Summary (if performance audit was run)

```
LCP:  [value]ms (threshold: 2500ms) — [PASS/FAIL]
CLS:  [value] (threshold: 0.1) — [PASS/FAIL]
INP:  [value]ms (threshold: 200ms) — [PASS/FAIL]
FCP:  [value]ms (threshold: 1800ms) — [PASS/FAIL]
TTFB: [value]ms (threshold: 800ms) — [PASS/FAIL]
```

### Accessibility Summary (if a11y audit was run)

```
Color contrast violations: N
Missing labels: N
Heading order issues: N
Missing alt text: N
Small touch targets: N
Missing accessible names: N
```

### Coverage Summary

```
Pages discovered: N
Pages visited:    N
Pages with errors: N
Links tested:     N
Forms tested:     N
Network errors:   N
A11y violations:  N
Perf warnings:    N
```

---

## Prompt Templates

Use these to start a session. Adjust URL and suite as needed.

### Smoke Test (5 min, ~15 actions)
```
Read testing/RUN.md
Navigate to http://localhost:3000
Inject the mega listener.
Discover the app's navigation structure.
Click through every top-level nav item. For each page, run the CHECKLIST.md checks.
Report findings.
```

### Full Navigation Audit (15 min, ~40 actions)
```
Read testing/RUN.md → Run testing/suites/navigation.md
```

### Adversarial Forms (10 min, ~30 actions)
```
Read testing/RUN.md → Run testing/suites/forms.md
```

### Accessibility Audit (15 min, ~35 actions)
```
Read testing/RUN.md → Run testing/suites/accessibility.md
```

### Performance Audit (10 min, ~20 actions)
```
Read testing/RUN.md → Run testing/suites/performance.md
```

### Responsive Audit (15 min, ~35 actions)
```
Read testing/RUN.md → Run testing/suites/responsive.md
```

### Full Quality Audit (30 min, ~80 actions across multiple suites)
```
Read testing/RUN.md → Run testing/suites/SUITE-INDEX.md (full audit mode)
```
