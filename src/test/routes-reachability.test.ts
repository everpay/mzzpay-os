import { describe, it, expect } from 'vitest';
import App from '@/App';

/**
 * Route reachability + role-gating sanity tests.
 *
 * These don't render the full app (auth/Supabase mocking would balloon the
 * suite); instead they assert that every newly added page has a corresponding
 * route registered in App.tsx and that role-gated routes use RoleProtectedRoute
 * with the right allowedRoles. Catches regressions where someone adds a page
 * but forgets to wire the route or the gate.
 */

import fs from 'node:fs';
import path from 'node:path';

const appSrc = fs.readFileSync(
  path.resolve(__dirname, '../App.tsx'),
  'utf8',
);
const sidebarSrc = fs.readFileSync(
  path.resolve(__dirname, '../components/AppSidebar.tsx'),
  'utf8',
);

const NEW_PAGES = [
  { path: '/payment-widget', component: 'PaymentWidget', protected: true, role: null },
  { path: '/saved-cards', component: 'SavedCards', protected: true, role: null },
  { path: '/payment-methods', component: 'PaymentMethodsPage', protected: true, role: null },
  { path: '/live-analytics', component: 'LiveAnalytics', protected: true, role: null },
  { path: '/balances', component: 'Balances', protected: true, role: null },
];

describe('route registration for added pages', () => {
  it('App.tsx imports every new page component', () => {
    for (const p of NEW_PAGES) {
      expect(appSrc, `expected import for ${p.component}`).toMatch(
        new RegExp(`import\\s+${p.component}\\s+from\\s+["']\\./pages/${p.component}["']`),
      );
    }
  });

  it('every new page has a <Route path=...> entry', () => {
    for (const p of NEW_PAGES) {
      expect(appSrc, `expected route ${p.path}`).toContain(`path="${p.path}"`);
    }
  });

  it('every new page is wrapped in <ProtectedRoute>', () => {
    for (const p of NEW_PAGES) {
      // Crude but effective: find the line declaring this path and
      // ensure ProtectedRoute is on the same JSX expression.
      const re = new RegExp(`path="${p.path}"[^/]*element=\\{[^}]*ProtectedRoute`);
      expect(appSrc).toMatch(re);
    }
  });

  it('App imports App is consistent (sanity)', () => {
    expect(App).toBeTruthy();
  });
});

describe('role-gated routes', () => {
  it('Reconciliation requires super_admin', () => {
    expect(appSrc).toMatch(
      /path="\/reconciliation"[^/]*allowedRoles=\{\['super_admin'\]\}/,
    );
  });
  it('Treasury requires super_admin', () => {
    expect(appSrc).toMatch(
      /path="\/treasury"[^/]*allowedRoles=\{\['super_admin'\]\}/,
    );
  });
  it('AuditTrail requires super_admin', () => {
    expect(appSrc).toMatch(
      /path="\/audit-trail"[^/]*allowedRoles=\{\['super_admin'\]\}/,
    );
  });
  it('Reseller portal restricted to reseller role', () => {
    expect(appSrc).toMatch(
      /path="\/reseller"[^/]*allowedRoles=\{\['reseller'\]\}/,
    );
  });
});

describe('sidebar exposure for new pages', () => {
  it('sidebar references each new route', () => {
    const expected = ['/payment-widget', '/saved-cards', '/payment-methods', '/live-analytics', '/balances'];
    for (const p of expected) {
      expect(sidebarSrc, `sidebar should link to ${p}`).toContain(p);
    }
  });
});
