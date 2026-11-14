import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';

test('the deployed Worker serves every new module and preserves property highlights',async()=>{
 for(const path of ['/','/app.mjs','/model.mjs','/prospects.mjs','/marketing-touchpoints.mjs','/leasing.mjs','/leasing.css','/styles.css','/call-center.mjs','/call-center.css']){const response=await worker.fetch(new Request('https://example.invalid'+path));assert.equal(response.status,200,path);assert.ok((await response.text()).length>20,path);}
 const response=await worker.fetch(new Request('https://example.invalid/api/property-website/north'));assert.equal(response.status,200);const listing=await response.json();assert.ok(listing.images.length>0);assert.ok(listing.amenities.length>0);assert.ok(listing.suites.length>0);
 assert.equal((await worker.fetch(new Request('https://example.invalid/api/property-website/missing'))).status,404);
});
