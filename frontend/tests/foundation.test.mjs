import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readProjectFile = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  return port;
}

async function startApp(app) {
  const port = await freePort();
  const cwd = path.join(root, 'frontend/apps', app);
  const next = path.join(cwd, 'node_modules/next/dist/bin/next');
  const nodeExecutable = process.env.EPE_TEST_NODE_BINARY || process.execPath;
  const child = spawn(nodeExecutable, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  try {
    await new Promise((resolve, reject) => {
      // Start-up is dominated by cold module resolution, not by the app itself. Under
      // `--test` the files run concurrently, so a 15s ceiling produced flaky failures on
      // slower CI/sandbox machines. 90s still fails fast on a genuinely broken build.
      const timeout = setTimeout(() => reject(new Error(`Timed out starting ${app}: ${output}`)), 90000);
      const fail = (error) => { clearTimeout(timeout); reject(error); };
      child.once('error', fail);
      child.once('exit', (code) => fail(new Error(`${app} exited with ${code}: ${output}`)));
      for (const stream of [child.stdout, child.stderr]) {
        stream.on('data', (data) => {
          output += data.toString();
          if (/Ready in/i.test(output)) { clearTimeout(timeout); resolve(); }
        });
      }
    });
  } catch (error) {
    child.kill();
    throw error;
  }
  return { child, base: `http://127.0.0.1:${port}` };
}

async function withApp(app, run) {
  const { child, base } = await startApp(app);
  try { await run(base); }
  finally {
    const finished = new Promise((resolve) => child.once('exit', resolve));
    child.kill('SIGTERM');
    await finished;
  }
}

test('main has honest indexable metadata, working public links and security headers', async () => {
  await withApp('main', async (base) => {
    for (const path of ['/', '/about', '/not-a-real-page', '/robots.txt', '/sitemap.xml', '/icon.png']) {
      const response = await fetch(base + path);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
      assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
      assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
      assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()', path);
      const csp = response.headers.get('content-security-policy') || '';
      assert.match(csp, /frame-ancestors 'none'/, path);
      assert.match(csp, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/, path);
      assert.equal(response.headers.get('content-security-policy-report-only'), null, 'CSP is enforced');
      assert.equal(response.headers.get('access-control-allow-origin'), 'https://epelawa.vercel.app', path);
    }
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const module of [
      /Trending News/,
      /Ìtàn Ilú Mi|Itan Ilu Mi/,
      /Chat Forum/,
      /Map &amp; Navigation|Map & Navigation/,
      /Local businesses|Business Directory/,
      /Tourism/,
      /EPE LAWA Radio/,
      /Who is Who/,
    ]) assert.match(html, module, `homepage module ${module}`);
    for (const href of ['/news', '/itan-ilu-mi', '/forum', '/map', '/business-directory', '/tourism', '/radio', '/who-is-who']) {
      assert.match(html, new RegExp(`href="${href}"`), `homepage route ${href}`);
    }
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/i);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.match(html, /<link rel="canonical" href="https:\/\/epelawa\.vercel\.app\/?"/);
    assert.doesNotMatch(html, /clyvro-verification/, 'unverified third-party verification tag must not ship');
    assert.match(html, /<meta property="og:title"/);
    assert.match(html, /<meta property="og:description"/);
    assert.match(html, /<meta property="og:image" content="https:\/\/epelawa\.vercel\.app\/share\.png"/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
    assert.match(html, /<link rel="icon"/);
    assert.match(html, /href="\/about"/);
    const about = await fetch(base + '/about');
    assert.equal(about.status, 200);
    const aboutHtml = await about.text();
    assert.doesNotMatch(aboutHtml, /clyvro-verification/, 'unverified third-party verification tag must not ship');
    assert.match(aboutHtml, /<link rel="canonical" href="https:\/\/epelawa\.vercel\.app\/about"/);
    assert.match(aboutHtml, /href="\/"/);
    assert.match(aboutHtml, /Editorial staff details will appear here once confirmed/i);
    const missing = await fetch(base + '/not-a-real-page');
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Page not found/);
    const robots = await fetch(base + '/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Sitemap: https:\/\/epelawa\.vercel\.app\/sitemap\.xml/i);
    const sitemap = await fetch(base + '/sitemap.xml');
    assert.equal(sitemap.status, 200);
    const xml = await sitemap.text();
    assert.match(xml, /<urlset/);
    assert.match(xml, /<loc>https:\/\/epelawa\.vercel\.app\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/epelawa\.vercel\.app\/about<\/loc>/);
    for (const path of ['/news', '/itan-ilu-mi', '/forum', '/map', '/business-directory', '/tourism', '/radio', '/who-is-who']) {
      assert.ok(xml.includes(`<loc>https://epelawa.vercel.app${path}</loc>`), `${path} must be indexed as a public module landing page`);
    }
    const expiredCallback = await fetch(`${base}/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email%20link%20is%20invalid%20or%20has%20expired`, { redirect: 'manual' });
    assert.equal(expiredCallback.status, 307);
    const expiredLocation = new URL(expiredCallback.headers.get('location'), base);
    assert.equal(expiredLocation.pathname, '/auth/link-expired');
    assert.equal(expiredLocation.search, '', 'raw provider error parameters must be removed');
    for (const [path, heading] of [['/auth/link-expired', /That email link has expired/], ['/auth/link-problem', /We couldn’t verify that email link/]]) {
      const issueResponse = await fetch(base + path);
      assert.equal(issueResponse.status, 200, path);
      const issueHtml = await issueResponse.text();
      assert.match(issueHtml, heading, path);
      assert.match(issueHtml, /Request a fresh verification email/, path);
      assert.match(issueHtml, /Request a password reset/, path);
      assert.match(issueHtml, /Return to sign in/, path);
      assert.doesNotMatch(issueHtml, /otp_expired|access_denied|error_description|Email link is invalid or has expired/i, path);
    }
    for (const [path, width, height] of [['/icon.png', 192, 192], ['/apple-touch-icon.png', 180, 180], ['/share.png', 1200, 630]]) {
      const image = await fetch(base + path);
      assert.equal(image.status, 200, path);
      const bytes = Buffer.from(await image.arrayBuffer());
      assert.equal(bytes.readUInt32BE(16), width, path);
      assert.equal(bytes.readUInt32BE(20), height, path);
    }
    assert.equal((await fetch(base + '/favicon.ico')).status, 200);
    assert.equal((await fetch(base + '/llms.txt')).status, 200);
    const security = await fetch(base + '/.well-known/security.txt');
    assert.equal(security.status, 200);
    assert.match(security.headers.get('content-type'), /text\/plain/);
    const securityText = await security.text();
    assert.match(securityText, /This file is informational only and does not accept reports\./i);
    assert.doesNotMatch(securityText, /^Contact:/m);
    assert.doesNotMatch(securityText, /mailto:|info\.epelawa@gmail\.com/i);
    assert.match(securityText, /Expires: 2027-05-02T00:00:00Z/);
    for (const route of ['/about', '/contact', '/guidelines', '/privacy', '/terms']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      const html = await response.text();
      assert.doesNotMatch(html, /info\.epelawa@gmail\.com|mailto:/i, route);
      if (route === '/contact') {
        assert.match(html, /Coming Soon/);
        assert.match(html, /nothing is sent or stored/i);
        assert.doesNotMatch(html.split("</main>")[0], /<form\b/i);
      }
    }
    for (const code of [200, 400, 401, 403, 404, 429, 500, 503, 599]) {
      const statusPage = await fetch(base + '/status/' + code);
      assert.equal(statusPage.status, code, String(code));
      assert.equal(statusPage.headers.get('cache-control'), 'no-store');
      assert.match(statusPage.headers.get('x-robots-tag'), /noindex/);
      const statusBody = await statusPage.text();
      assert.match(statusBody, /status reference page/);
      assert.match(statusBody, /Try again/);
      if (code === 401) assert.match(statusPage.headers.get('www-authenticate'), /^Bearer/);
    }
    assert.equal((await fetch(base + '/status/204')).status, 404);
    assert.equal((await fetch(base + '/status/302')).status, 404);
    const logo = await fetch(base + '/brand-logo.png');
    const logoBytes = Buffer.from(await logo.arrayBuffer());
    assert.equal(logoBytes.readUInt32BE(16), 1348);
    assert.equal(logoBytes.readUInt32BE(20), 1167);
  });
});

test('homepage hero gallery is sourced, responsive, eager and resource-aware', async () => {
  const source = await readProjectFile('frontend/apps/main/components/hero-carousel.tsx');
  const page = await readProjectFile('frontend/apps/main/app/page.tsx');
  const icons = await readProjectFile('frontend/apps/main/components/icons.tsx');
  const styles = await readProjectFile('frontend/apps/main/app/hero-logo.css');
  const credits = await readProjectFile('docs/hero-image-sources.md');
  const manifest = JSON.parse(await readProjectFile('frontend/apps/main/lib/hero-images.json'));
  const layout = await readProjectFile('frontend/apps/main/app/layout.tsx');
  assert.match(page, /<HeroCarousel>/);
  assert.match(page, /Stay Connected/);
  assert.doesNotMatch(page, /home-hero__brand|BrandLockup/);
  assert.match(source, /ROTATION_DELAY_MS\s*=\s*7200/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /aria-roledescription="carousel"/);
  assert.match(source, /aria-roledescription="slide"/);
  assert.match(source, /onFocusCapture|focus/);
  assert.doesNotMatch(source, /home-hero__caption|home-hero__credit|home-hero__slide-label|home-hero__counter|Photo by <a/);
  assert.match(source, /key=\{slide\.slug\}/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(source, /saveData/);
  assert.match(source, /slow-2g/);
  assert.match(source, /effectiveType === "3g"/);
  assert.match(source, /loading="eager"/);
  assert.doesNotMatch(source, /loading="lazy"/);
  assert.match(source, /fetchPriority=\{index === INITIAL_SLIDE \? "high" : "auto"\}/);
  assert.match(source, /new window\.Image\(\)/);
  assert.match(source, /image\.fetchPriority = "low"/);
  assert.match(source, /type="image\/avif"/);
  assert.match(source, /srcSet=\{responsiveSrcSet\(slide\.webp\)\}/);
  assert.doesNotMatch(source, /MapPinIcon|Epe · Lagos State|Rooted in the community\. Open to everyone\.|Photo by \{slide\.author\}/);
  assert.doesNotMatch(styles, /@media[^{}]*pointer:\s*coarse[^{}]*\.home-hero__slide-control[^{}]*clip-path:\s*none/);
  assert.match(styles, /min-width:\s*44px|width:\s*44px/);
  assert.doesNotMatch(styles, /home-hero__caption|home-hero__credit|home-hero__slide-label|home-hero__counter/);
  assert.doesNotMatch(styles, /home-hero__brand/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.equal(manifest.length, 54);
  assert.deepEqual(manifest.slice(0, 2).map(({ slug, author, source }) => ({ slug, author, source })), [
    { slug: 'new-epe-road', author: 'Joseph Slyboy', source: 'https://commons.wikimedia.org/wiki/File:New_Epe_lagos_road.jpg' },
    { slug: 'fish-statue-epe', author: 'Kwadoskii', source: 'https://commons.wikimedia.org/wiki/File:Fish_Statue_Epe.jpg' },
  ]);
  assert.equal(manifest.slice(2).length, 52, 'all existing credited Commons photos must remain');
  assert.match(layout, /<html lang="en" data-theme="light" style=\{\{ colorScheme: "light" \}\} suppressHydrationWarning>/);
  assert.equal(new Set(manifest.map((slide) => slide.slug)).size, 54);
  assert.equal(new Set(manifest.map((slide) => slide.source)).size, 54);
  const creditsPage = await readProjectFile('frontend/apps/main/app/photo-credits/page.tsx');
  assert.match(creditsPage, /Photo by \{image\.author\}/);
  assert.match(creditsPage, /href=\{image\.source\}/);
  assert.match(creditsPage, /href=\{image\.licenseUrl\}/);
  const footer = await readProjectFile('frontend/apps/main/components/news-footer.tsx');
  assert.match(footer, /href="\/photo-credits">Photo credits/);

  const documentedSources = [...credits.matchAll(/- Source: \[[^\]]+\]\((https:\/\/commons\.wikimedia\.org\/wiki\/[^)]+)\)/g)].map((match) => match[1]).sort();
  assert.deepEqual(manifest.map((slide) => slide.source).sort(), documentedSources);
  const localFiles = new Set();
  for (const slide of manifest) {
    assert.ok(['new-epe-road', 'fish-statue-epe'].includes(slide.slug) || /^\d{2}-epe-/.test(slide.slug), `unexpected hero slug: ${slide.slug}`);
    assert.ok(['CC0 1.0', 'CC BY-SA 4.0'].includes(slide.license), slide.license);
    assert.match(slide.licenseUrl, /^https:\/\/creativecommons\.org\//);
    assert.ok(credits.includes(`[${slide.license}](${slide.licenseUrl})`), `missing license for ${slide.slug}`);
    assert.ok(credits.includes(`(${slide.source})`), `missing source for ${slide.slug}`);
    for (const format of ['avif', 'webp']) {
      for (const size of ['small', 'large']) {
        const variant = slide[format][size];
        assert.match(variant.src, new RegExp(`\\.${format}$`));
        assert.ok([640, 1280].includes(variant.width), `${slide.slug} ${format} width`);
        assert.equal(Number(variant.src.match(/-(\d+)\.(?:avif|webp)$/)?.[1]), variant.width, `${slide.slug} filename width`);
        const localPath = path.join(root, 'frontend/apps/main/public', variant.src.replace(/^\//, ''));
        assert.ok(fs.existsSync(localPath), `missing optimized image: ${localPath}`);
        localFiles.add(localPath);
      }
    }
  }
  assert.equal(localFiles.size, 214);
  assert.doesNotMatch(page, /ui-eyebrow">Epe · Lagos State/);
  assert.doesNotMatch(source, /unsplash|pexels|placeholder/i);
});

test('main news route reports unavailable data honestly and retains the custom 404', async () => {
  await withApp('main', async (base) => {
    const response = await fetch(base + '/news');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /The newsroom did not load|No stories published yet/i);
    assert.match(html, /Source-backed reporting from Epe and its connected communities\./);
    assert.match(html, /<meta name="description"/);
    assert.match(html, /<link rel="icon"/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    const missing = await fetch(base + '/not-a-real-page');
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Page not found/);
  });
});

test('admin dashboard is protected and login is noindex with security headers', async () => {
  await withApp('admin', async (base) => {
    const response = await fetch(base + '/', { redirect: 'manual' });
    assert.ok([302, 307, 308].includes(response.status), 'anonymous dashboard access must redirect');
    assert.match(response.headers.get('location') || '', /\/login/);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');

    const login = await fetch(base + '/login');
    assert.equal(login.status, 200);
    assert.match(login.headers.get('cache-control') || '', /no-store/);
    const html = await login.text();
    assert.match(html, /Staff sign in|Admin sign in|Sign in/i);
    assert.match(html, /name="email"/i);
    assert.match(html, /name="password"/i);
    assert.match(html, /noindex,?\s*nofollow/i);
    assert.doesNotMatch(html, /Create draft|Quick actions/i);
  });
});

test('same-origin Admin login is noindex and management routes redirect anonymous users', async () => {
  await withApp('main', async (base) => {
    const login = await fetch(base + '/admin/login');
    assert.equal(login.status, 200);
    assert.match(await login.text(), /noindex,?\s*nofollow/i);

    for (const route of ['/admin', '/admin/roles', '/admin/users']) {
      const response = await fetch(base + route, { redirect: 'manual' });
      const location = response.headers.get('location') || '';
      const body = await response.text();
      const responseRedirect = [302, 307, 308].includes(response.status) && /\/admin\/login/.test(location);
      const streamedRedirect = response.status === 200 && /NEXT_REDIRECT|http-equiv="refresh"[^>]*\/admin\/login|\/admin\/login\?next=/i.test(body);
      assert.ok(responseRedirect || streamedRedirect, `${route} must redirect; status=${response.status}, location=${location || 'none'}, redirectMarker=${/NEXT_REDIRECT|http-equiv="refresh"|\/admin\/login\?next=/i.test(body)}`);
      assert.doesNotMatch(body, /Create a role|Staff directory|Invite staff/i, `${route} must not render protected management content anonymously`);
      assert.match(response.headers.get('cache-control') || '', /no-store/);
    }
  });
});
