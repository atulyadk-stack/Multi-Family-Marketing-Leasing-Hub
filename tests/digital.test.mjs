import test from 'node:test';
import assert from 'node:assert/strict';
import {properties} from '../dist/model.mjs';
import {selectWebsite,websiteSummary,websiteBreakdown,websiteTrend,seedAccounts,selectAccounts,validateAccount,restoreAccounts,safeSocialUrl,socialRows,socialSummary,socialPosts} from '../dist/digital-model.mjs';
import worker from '../dist/server/index.js';
const f={property:'all',pmc:'all',city:'all',dateFrom:'2026-10-01',dateTo:'2026-10-31'};
test('website activity is scoped by property, company, date and session channel',()=>{
 const all=selectWebsite(f),s=websiteSummary(all);
 assert.ok(s.activeUsers>0);assert.equal(s.sessions,all.length);
 assert.equal(websiteBreakdown(all,'channel').reduce((n,r)=>n+r.sessions,0),s.sessions);
 assert.equal(websiteBreakdown(all,'age').reduce((n,r)=>n+r.activeUsers,0),s.activeUsers);
 assert.equal(websiteTrend(all,f).reduce((n,r)=>n+r.value,0),s.sessions);
 const one=selectWebsite({...f,property:'north',dateFrom:'2026-10-05',dateTo:'2026-10-09',channel:'Paid Search'});
 assert.ok(one.length);assert.ok(one.every(r=>r.property==='north'&&r.channel==='Paid Search'&&r.date>='2026-10-05'&&r.date<='2026-10-09'));
 assert.deepEqual(selectWebsite({...f,property:'north',pmc:'Crest Management'}),[]);
 assert.deepEqual(selectWebsite({...f,dateFrom:'2027-01-01',dateTo:'2027-01-31'}),[]);
 assert.equal(websiteTrend([],f).length,31);
 assert.throws(()=>selectWebsite({...f,dateFrom:'2026-11-01'}),/valid/);
});
test('new and returning audiences overlap; interests are not an additive partition',()=>{
 const rows=selectWebsite({...f,dateFrom:'2026-09-01'}),s=websiteSummary(rows);
 assert.ok(s.newUsers+s.returningUsers>s.activeUsers);
 assert.ok(websiteBreakdown(rows,'interests').reduce((n,r)=>n+r.activeUsers,0)>s.activeUsers);
 assert.ok(websiteBreakdown(rows,'age').some(r=>r.label==='Unknown'));
 assert.equal(websiteBreakdown(rows.filter(r=>r.newUser),'firstChannel').reduce((n,r)=>n+r.newUsers,0),s.newUsers);
});
test('shared social accounts are counted once and followers use the latest snapshot',()=>{
 const accounts=seedAccounts(),selected=selectAccounts(accounts,{...f,pmc:'Harbour Management'});
 assert.equal(selected.filter(a=>a.id==='harbour-manager').length,1);
 assert.ok(selectAccounts(accounts,{...f,property:'north'}).some(a=>a.id==='harbour-manager'));
 assert.ok(!selectAccounts(accounts,{...f,property:'river'}).some(a=>a.id==='harbour-manager'));
 const rows=socialRows(accounts,f),s=socialSummary(rows),latest=rows.filter(r=>r.date==='2026-10-31');
 assert.equal(s.followers,latest.reduce((n,r)=>n+(r.followers||0),0));
 assert.ok(rows.filter(r=>r.platform==='Facebook Marketplace').every(r=>r.followers===null));
 assert.deepEqual(socialRows(accounts,{...f,dateFrom:'2027-01-01',dateTo:'2027-01-31'}),[]);
});
test('mapped handles validate ownership and URL safety without inventing connected data',()=>{
 const accounts=seedAccounts(),input={platform:'Instagram',label:'New account',handle:'@new.handle',ownerType:'manager',ownerId:'Harbour Management',url:'https://www.instagram.com/new.handle/'};
 const a=validateAccount(input,accounts,'custom');
 assert.equal(a.sample,false);const manager=validateAccount({...input,ownerType:'person',ownerId:'north'},[],'manager');assert.deepEqual(manager.propertyIds,['north']);assert.equal(manager.ownerType,'person');assert.equal(a.handle,'new.handle');assert.deepEqual(a.propertyIds,properties.filter(p=>p.pmc===input.ownerId).map(p=>p.id));
 assert.deepEqual(socialRows([a],f),[]);assert.deepEqual(socialPosts([a],f),[]);
 assert.equal(restoreAccounts([a])[0].sample,false);
 assert.throws(()=>validateAccount(input,[a],'other'),/already mapped/);
 assert.throws(()=>validateAccount({...input,ownerId:'missing'},[],'other'),/valid property/);
 for(const url of ['javascript:alert(1)','https://instagram.com.evil.example/test','https://user:pass@instagram.com/test','http://instagram.com/test'])assert.throws(()=>safeSocialUrl(url,'Instagram'));
 assert.equal(safeSocialUrl('https://facebook.com/marketplace/item/123','Facebook Marketplace'),'https://facebook.com/marketplace/item/123');
});
test('built worker serves analytics assets and their correct content types',async()=>{
 for(const path of ['/digital.mjs','/digital-model.mjs','/digital.css']){const r=await worker.fetch(new Request('https://example.com'+path));assert.equal(r.status,200);assert.ok((await r.text()).length>100);assert.match(r.headers.get('content-type'),path.endsWith('.css')?/text\/css/:/javascript/);}
});
