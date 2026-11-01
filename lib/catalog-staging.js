const branch = 'codex/catalog-reference-staging-20261101';
const origin = 'https://sellmyslabs-git-codex-catalog-refere-c4c1b4-john-towns-projects.vercel.app';
export function catalogStaging(settings = process.env) {
  if (settings.CATALOG_TEST_MODE !== '1') return false;
  try {
    const url = new URL(settings.DATABASE_URL);
    return settings.VERCEL_ENV === 'preview' && settings.VERCEL_GIT_COMMIT_REF === branch &&
      settings.SITE_URL === origin && decodeURIComponent(url.username) === 'sellmyslabs_catalog_staging';
  } catch { return false; }
}
export function assertCatalogDatabase(settings = process.env) {
  const intended = settings.CATALOG_TEST_MODE === '1' ||
    (settings.VERCEL_ENV === 'preview' && settings.VERCEL_GIT_COMMIT_REF === branch);
  if (intended && !catalogStaging(settings)) throw new Error('The catalog preview requires its isolated test database.');
}
