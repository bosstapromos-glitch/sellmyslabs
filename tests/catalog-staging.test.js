import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogStaging, assertCatalogDatabase} from '../lib/catalog-staging';
const good = {CATALOG_TEST_MODE:'1', VERCEL_ENV:'preview', VERCEL_GIT_COMMIT_REF:'codex/catalog-reference-staging-20261101', SITE_URL:'https://sellmyslabs-git-codex-catalog-refere-c4c1b4-john-towns-projects.vercel.app', DATABASE_URL:'postgresql://sellmyslabs_catalog_staging:fixture@localhost/test'};
test('only isolated preview configuration permits the staging database',()=>{
  assert.equal(catalogStaging(good),true); assert.doesNotThrow(()=>assertCatalogDatabase(good));
  for(const key of Object.keys(good)) {
    const settings={...good,[key]:'incorrect'};
    assert.equal(catalogStaging(settings),false);
    assert.throws(()=>assertCatalogDatabase(settings));
  }
  assert.throws(()=>assertCatalogDatabase({...good,DATABASE_URL:'postgresql://neondb_owner:fixture@localhost/production'}));
});
test('normal production configuration retains its database access',()=>{
  assert.equal(catalogStaging({VERCEL_ENV:'production'}),false);
  assert.doesNotThrow(()=>assertCatalogDatabase({VERCEL_ENV:'production'}));
});
