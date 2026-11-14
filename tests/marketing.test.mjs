import test from 'node:test';
import assert from 'node:assert/strict';
import {leads,metrics,sourceMetrics,reportingRange,periodFactor,defaultState,bookTour} from '../dist/model.mjs';

test('marketing channel, platform and acquisition scopes reconcile counts and spend',()=>{
 const scopes=[{channel:'Paid search'},{source:'meta'},{acquisition:'paid'},{acquisition:'non-paid'},{acquisition:'unknown'},{channel:'Paid social',source:'google'},{property:'north',city:'Toronto',pmc:'Harbour Management',acquisition:'paid'}];
 for(const scope of scopes){const f={month:10,...scope},m=metrics(f),rows=sourceMetrics(f);for(const key of ['scheduled','toured','applied','leases','spend'])assert.equal(rows.reduce((n,r)=>n+r[key],0),m[key]);assert.equal(rows.reduce((n,r)=>n+r.leads,0),m.leads.length);}
 assert.equal(metrics({month:10,channel:'Paid search'}).leads.length,90);
 assert.equal(metrics({month:10,source:'google'}).spend,9000);
 assert.equal(metrics({month:10,source:'meta'}).spend,3600);
 assert.equal(metrics({month:10,acquisition:'non-paid'}).leads.length,57);
 assert.equal(metrics({month:10,acquisition:'unknown'}).leads.length,3);
 assert.equal(metrics({month:10,channel:'Paid social',source:'google'}).spend,0);
});

test('custom date ranges include both boundary dates and can span months',()=>{
 const f={dateFrom:'2026-09-18',dateTo:'2026-10-03',source:'google',property:'north'},m=metrics(f);
 const expected=leads.filter(l=>l.source==='google'&&l.property==='north'&&l.created>='2026-09-18'&&l.created<='2026-10-03');
 assert.deepEqual(m.leads.map(l=>l.id),expected.map(l=>l.id));
 assert.ok(m.leads.some(l=>l.created===f.dateFrom));assert.ok(m.leads.some(l=>l.created===f.dateTo));
 assert.ok(Math.abs(m.spend-4200*(13/30*.92+3/31))<1e-9);
 const all=metrics({dateFrom:'2026-09-01',dateTo:'2026-10-31'});
 assert.equal(all.leads.length,468);assert.equal(all.leases,32);assert.equal(all.spend,34560);
});

test('single-day cohorts keep later outcomes and use daily prorated spend',()=>{
 const f={dateFrom:'2026-10-01',dateTo:'2026-10-01',source:'google'},m=metrics(f);
 assert.ok(m.leads.length>0);assert.ok(m.leads.every(l=>l.created==='2026-10-01'));assert.ok(m.leads.some(l=>l.leaseDate>'2026-10-01'));
 assert.ok(Math.abs(m.spend-9000/31)<1e-9);
 assert.equal(sourceMetrics(f)[0].leases,m.leases);
});

test('invalid dates are rejected and periods outside available data are empty',()=>{
 for(const f of [{dateFrom:'2026-10-20',dateTo:'2026-10-01'},{dateFrom:'',dateTo:'2026-10-01'},{dateFrom:'2026-02-30',dateTo:'2026-10-01'},{dateFrom:'2026-10-01'}])assert.throws(()=>reportingRange(f));
 const f={dateFrom:'2026-11-01',dateTo:'2026-11-30'},m=metrics(f);assert.equal(m.leads.length,0);assert.equal(m.spend,0);assert.equal(m.p75,null);assert.equal(periodFactor(f),0);
 assert.equal(periodFactor({dateFrom:'2026-08-01',dateTo:'2026-09-15'}),.46);
});

test('tour updates respect marketing filters and do not change enquiry counts',()=>{
 const state=defaultState(),f={month:10,source:'meta'},before=metrics(f,state),lead=before.leads.find(l=>!l.scheduled);
 bookTour(state,lead.id);const after=metrics(f,state);assert.equal(after.leads.length,before.leads.length);assert.equal(after.scheduled,before.scheduled+1);assert.equal(sourceMetrics(f,state)[0].scheduled,after.scheduled);
 // Ordinary portfolio and call-center cohorts are unaffected by marketing view filters.
 assert.equal(metrics({month:10},state).leads.length,240);
});
