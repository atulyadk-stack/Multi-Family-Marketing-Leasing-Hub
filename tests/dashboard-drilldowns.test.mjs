import {createDigitalWorkspace} from '../dist/digital.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from '../dist/model.mjs';
import * as display from '../dist/display-views.mjs';
import {renderPortfolio} from '../dist/portfolio.mjs';
import {prepareCRM} from '../dist/prospects.mjs';
import {createCallCenter} from '../dist/call-center.mjs';
import {createLeasingWorkspace} from '../dist/leasing.mjs';
import {createEventsWorkspace} from '../dist/events.mjs';

// Actual page rendering and delegated actions; this is not a browser layout test.
function app(){
  const elements=new Map(),downloads=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',open:false,dataset:{},querySelectorAll(){return [];},querySelector(){return {focus(){}};},addEventListener(){},focus(){},classList:{add(){},remove(){},toggle(){}},close(){this.open=false;},showModal(){this.open=true;}});return elements.get(id);};
  let hash='#portfolio';const location={get hash(){return hash;},set hash(value){hash=value.startsWith('#')?value:'#'+value;},origin:'https://demo.invalid'};
  const context=vm.createContext({createDigitalWorkspace,...model,...display,renderPortfolio,prepareCRM,createCallCenter,createLeasingWorkspace,createEventsWorkspace,location,Intl,Date,Blob,AbortSignal,URL:{createObjectURL(blob){downloads.push(blob);return 'blob:test';},revokeObjectURL(){}},fetch:async()=>({ok:false}),setTimeout(){},clearTimeout(){},localStorage:{getItem(){return null;},setItem(){}},document:{getElementById:element,querySelector:element,querySelectorAll(){return [];},documentElement:{style:{setProperty(){}}},addEventListener(){},body:{append(){}},createElement(){return {click(){},remove(){}};}},window:{scrollTo(){},addEventListener(){}}});
  vm.runInContext(readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8').replace(/^import .+;\n/gm,''),context);
  const run=code=>vm.runInContext(code,context);
  return {run,html:()=>element('app').innerHTML,dialog:()=>element('dialog').innerHTML,downloads,async click(dataset){await run(`onAction({target:{closest:()=>({dataset:${JSON.stringify(dataset)}})}})`);run('render()');}};
}

test('all four reputation KPI drill-downs match their counts and clear stale inbox filters', async()=>{
  const a=app();
  assert.equal((a.html().match(/class="metric metric-link" data-action="review-drill"/g)||[]).length,4);
  for(const [status,count] of [['all',240],['answered',216],['open',24],['overdue',9]]){
    a.run("inboxSearch='not a review';inboxOwner='Sam Patel';inboxTopic='Parking';inboxRating='negative';inboxPage=8");
    await a.click({action:'review-drill',status});
    assert.equal(a.run('reviewSelection(metrics(filters,state)).length'),count);
    assert.equal(a.run('inboxPage'),0);assert.equal(a.run('inboxSearch'),'');
    assert.equal(a.run('inboxOwner'),'all');assert.equal(a.run('inboxTopic'),'all');
    a.run('exportData()');assert.equal((await a.downloads.at(-1).text()).split('\r\n').length-1,count);
  }
});

test('review property and owner drill-downs retain portfolio scope and reflect saved responses',async()=>{
  const a=app();a.run("Object.assign(filters,{city:'Toronto',pmc:'Harbour Management',month:9});render()");
  await a.click({action:'review-drill',status:'overdue',property:'north'});
  assert.equal(a.run('filters.city'),'Toronto');assert.equal(a.run('filters.pmc'),'Harbour Management');assert.equal(a.run('filters.month'),9);
  assert.ok(a.run("reviewSelection(metrics(filters,state)).every(r=>r.property==='north'&&!r.answered&&r.overdue)"));
  const before=a.run('reviewSelection(metrics(filters,state)).length');assert.ok(before>0);
  a.run("respond(state,reviewSelection(metrics(filters,state))[0].id,'Sample response');render()");
  assert.equal(a.run('reviewSelection(metrics(filters,state)).length'),before-1);
  await a.click({action:'review-drill',status:'all',property:'north',owner:'Maya Chen',rating:'neutral'});
  assert.ok(a.run("reviewSelection(metrics(filters,state)).every(r=>r.owner==='Maya Chen'&&r.rating===3)"));
  assert.match(a.html(),/id="inbox-owner"/);assert.match(a.html(),/3 stars/);
  await a.click({action:'review-drill',status:'all',property:'willow'});
  assert.equal(a.run('metrics(filters,state).properties.length'),0,'conflicting geographic scope must not silently widen');
});

test('marketing source links open matching source records without stale filters',async()=>{
  const a=app();a.run("Object.assign(filters,{property:'north',month:9});Object.assign(marketingFilters,{range:'custom',dateFrom:'2027-01-01',dateTo:'2027-01-31',source:'meta',channel:'Paid social'});leadSource='ils';leadSearch='stale'");
  await a.click({action:'source-drill',source:'google',view:'journeys',stage:'leased'});
  assert.equal(a.run('filters.property'),'north');assert.equal(a.run('filters.month'),9);assert.equal(a.run('marketingFilters.range'),'month');
  assert.ok(a.run("marketingJourneyRecords(metrics(reportFilters(),state)).every(l=>l.source==='google'&&l.property==='north'&&l.month===9&&l.leased)"));
  const count=a.run('marketingJourneyRecords(metrics(reportFilters(),state)).length');assert.ok(count>0);
  a.run('exportData()');assert.equal((await a.downloads.at(-1).text()).split('\r\n').length-1,count);
  a.run("Object.assign(marketingFilters,{range:'custom',dateFrom:'2026-09-01',dateTo:'2026-10-05'})");
  await a.click({action:'source-drill',source:'ils',view:'sources'});
  assert.equal(a.run('marketingFilters.dateTo'),'2026-10-05','within marketing, keep the selected dates');
});

test('conversion connectors and inventory cards open accurate detail dialogs',async()=>{
  const a=app();
  assert.equal((a.html().match(/data-action="conversion-drill"/g)||[]).length,5);
  await a.click({action:'conversion-drill',stage:'scheduled'});
  assert.match(a.dialog(),/41.7%/);assert.match(a.dialog(),/100 tours scheduled ÷ 240 enquiries/);
  assert.match(a.dialog(),/data-stage="scheduled"/);
  await a.click({action:'drill-stage',stage:'scheduled'});
  assert.equal(a.run('dialog.open'),false);assert.match(a.html(),/Tours scheduled · 100 leads/);
  await a.click({action:'inventory-drill',measure:'vacant'});
  assert.match(a.dialog(),/Vacant homes/);assert.match(a.dialog(),/<strong>53<\/strong>/);
  a.run("Object.assign(filters,{property:'north',city:'Oakville'})");
  await a.click({action:'conversion-drill',stage:'overall'});
  assert.match(a.dialog(),/a conversion rate cannot be calculated/);assert.doesNotMatch(a.dialog(),/NaN|Infinity/);
});
