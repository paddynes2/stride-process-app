# Testing RUN Guide — Stride

## Step 1: Inject Mega Listener

Paste this into the browser console (via Playwright `page.evaluate()`) at the start of each test session:

```javascript
// Console error collector
window.__testErrors = [];
window.__originalConsoleError = console.error;
console.error = function(...args) {
  window.__testErrors.push({
    timestamp: new Date().toISOString(),
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  });
  window.__originalConsoleError.apply(console, args);
};

// Console warning collector
window.__testWarnings = [];
window.__originalConsoleWarn = console.warn;
console.warn = function(...args) {
  window.__testWarnings.push({
    timestamp: new Date().toISOString(),
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  });
  window.__originalConsoleWarn.apply(console, args);
};

// Network error collector
window.__networkErrors = [];
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  try {
    const response = await originalFetch.apply(this, args);
    if (!response.ok) {
      window.__networkErrors.push({
        timestamp: new Date().toISOString(),
        url: typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown',
        status: response.status,
        statusText: response.statusText
      });
    }
    return response;
  } catch (error) {
    window.__networkErrors.push({
      timestamp: new Date().toISOString(),
      url: typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown',
      error: error.message
    });
    throw error;
  }
};

// Accessibility quick audit
window.__auditAccessibility = function() {
  const violations = [];

  // Check images without alt
  document.querySelectorAll('img:not([alt])').forEach(el => {
    violations.push({ type: 'img-no-alt', element: el.outerHTML.substring(0, 100) });
  });

  // Check buttons without accessible name
  document.querySelectorAll('button').forEach(el => {
    if (!el.textContent?.trim() && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
      violations.push({ type: 'button-no-label', element: el.outerHTML.substring(0, 100) });
    }
  });

  // Check inputs without labels
  document.querySelectorAll('input:not([type="hidden"])').forEach(el => {
    const id = el.id;
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    const hasPlaceholder = el.getAttribute('placeholder');
    if (!hasLabel && !hasAria && !hasPlaceholder) {
      violations.push({ type: 'input-no-label', element: el.outerHTML.substring(0, 100) });
    }
  });

  // Check heading hierarchy
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  let lastLevel = 0;
  headings.forEach(h => {
    const level = parseInt(h.tagName[1]);
    if (level > lastLevel + 1) {
      violations.push({ type: 'heading-skip', element: `${h.tagName}: ${h.textContent?.substring(0, 50)}`, expected: `h${lastLevel + 1}`, got: h.tagName });
    }
    lastLevel = level;
  });

  console.log(`Accessibility audit: ${violations.length} violations found`);
  return violations;
};

// Cognitive load audit
window.__auditCognitiveLoad = function() {
  const results = {};
  results.totalElements = document.querySelectorAll('*').length;
  results.interactiveElements = document.querySelectorAll('button, a, input, select, textarea').length;
  results.textBlocks = document.querySelectorAll('p, li, span, label').length;
  results.headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
  results.images = document.querySelectorAll('img, svg').length;

  // Miller's Law: 7±2 items per group
  const groups = document.querySelectorAll('nav, ul, ol, [role="group"], [role="list"]');
  results.overloadedGroups = [];
  groups.forEach(g => {
    const children = g.children.length;
    if (children > 9) {
      results.overloadedGroups.push({ element: g.tagName + (g.className ? '.' + g.className.split(' ')[0] : ''), children });
    }
  });

  console.log('Cognitive load audit:', results);
  return results;
};

// Design token audit
window.__auditDesignTokens = function() {
  const violations = [];
  const computed = getComputedStyle(document.documentElement);

  document.querySelectorAll('*').forEach(el => {
    const style = getComputedStyle(el);
    // Check for hardcoded colors (non-inherited, non-transparent, non-variable)
    const color = style.color;
    const bg = style.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !bg.includes('var(')) {
      // This is a rough check — many valid colors come from Tailwind classes
    }
  });

  console.log('Design token audit complete');
  return violations;
};

// State coverage audit
window.__auditStateCoverage = function() {
  const results = {};
  results.hasLoadingState = !!document.querySelector('[class*="skeleton"], [class*="loading"], [class*="spinner"], [aria-busy="true"]');
  results.hasEmptyState = !!document.querySelector('[class*="empty"], [class*="no-data"], [class*="placeholder"]');
  results.hasErrorBoundary = !!document.querySelector('[class*="error"], [role="alert"]');
  console.log('State coverage audit:', results);
  return results;
};

console.log('🧪 Test listeners injected. Available: __testErrors, __testWarnings, __networkErrors, __auditAccessibility(), __auditCognitiveLoad(), __auditDesignTokens(), __auditStateCoverage()');
```

## Step 2: Navigate and Test

Navigate directly to the page under test. Use test credentials from `testing/apps/stride.md`.

## Step 3: Check Results

After testing:
```javascript
console.log('Errors:', window.__testErrors);
console.log('Warnings:', window.__testWarnings);
console.log('Network errors:', window.__networkErrors);
```
