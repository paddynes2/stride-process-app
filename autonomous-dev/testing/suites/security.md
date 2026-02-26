# Security Suite

> Test the app's client-side security surface. XSS, storage exposure, URL params,
> authentication boundaries. This is NOT a penetration test — it's a surface scan.
> Budget: 30 actions. Apply CHECKLIST.md to every page.

---

## Phase 1: Storage Audit

1. Navigate to any authenticated page
2. Run `window.__auditSecurity()` from `RUN.md`
3. Review findings — any sensitive data in localStorage/sessionStorage?

**Sensitive data in client storage is P0 if it contains:**
- Passwords, API keys, secrets, private keys
- Full auth tokens without HttpOnly flag (should be in cookies, not storage)
- PII (SSN, credit card numbers)

**Acceptable in client storage:**
- JWT access tokens (short-lived, normal for SPAs)
- User preferences, UI state
- Supabase session tokens (expected behavior)

## Phase 2: XSS Probes

On 2-3 forms (create entity, search, settings), enter these payloads:

| Payload | What it tests |
|---------|--------------|
| `<script>alert('xss')</script>` | Script injection |
| `<img src=x onerror=alert(1)>` | Event handler injection |
| `"><svg onload=alert(1)>` | Attribute breakout |
| `javascript:alert(1)` | Protocol injection (in URL fields) |
| `{{constructor.constructor('alert(1)')()}}` | Template injection |

For EACH:
1. Enter the payload in a text field
2. Submit the form
3. Navigate to where the data appears (list view, detail view)
4. **Check:** Is the payload rendered as text (SAFE) or executed (VULNERABLE)?
5. **Check:** Inspect the DOM — is the payload HTML-escaped in the source?

**Any executed script = P0 security vulnerability.**

## Phase 3: URL Parameter Safety

Test URL manipulation:

1. Navigate to an authenticated route
2. Check: Does the URL contain sensitive data? (tokens, passwords, API keys)
3. Add suspicious params: `/people?redirect=https://evil.com`
4. **Check:** Does the app redirect to the external URL? (open redirect = P1)
5. Try: `/people?id=../../etc/passwd` or `/api/v1/people?query='; DROP TABLE;--`
6. **Check:** Graceful error handling, no server errors exposed

## Phase 4: Authentication Boundaries

1. Note a URL that requires authentication (e.g., `/dashboard`)
2. Open a new browser context (or clear cookies)
3. Navigate directly to that URL
4. **Check:** Redirected to login? (not showing data without auth)
5. **Check:** After login, redirected back to the original URL?

If the app has roles/permissions:
1. Identify a page restricted to certain roles
2. Access it as a user without that role
3. **Check:** Access denied? Proper error message?

## Phase 5: Client-Side Data Exposure

1. Open browser DevTools Network tab (or check via Playwright)
2. Navigate through the app
3. **Check:** Are API responses leaking extra data? (e.g., other users' data, internal IDs, passwords)
4. **Check:** Are source maps exposed in production? (`.map` files accessible)
5. **Check:** Is `console.log` outputting sensitive data?

## Phase 6: Security Headers (if accessible)

Check the initial page load response headers:

| Header | Expected | Why |
|--------|----------|-----|
| `Content-Security-Policy` | Present | Prevents XSS, data injection |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options` or CSP frame-ancestors | Present | Prevents clickjacking |
| `Strict-Transport-Security` | Present (production) | Forces HTTPS |
| `Referrer-Policy` | Present | Controls referrer data leakage |

Note: Dev servers may not have all headers. Report as P3 with note "verify in production."

## Completion

Report format:
```markdown
## Security Audit — Iteration [N]

**XSS payloads tested:** N
**XSS vulnerabilities found:** N
**Storage issues:** N
**Auth boundary issues:** N
**URL manipulation issues:** N

### Critical Findings (P0)
| # | Finding | Page | Payload | Impact |
|---|---------|------|---------|--------|
| 1 | XSS via name field | /people/new | <script>alert(1)</script> | Stored XSS |

### Other Findings
| # | Severity | Finding | Page |
|---|----------|---------|------|
| 1 | P2 | JWT in localStorage | Global |
| 2 | P3 | Missing CSP header | Global |
```

**P0 findings are EMERGENCY.** Add to `prd/BUGS.md` with highest priority.
**Update `testing/RESULTS.md`** with this audit's results.
