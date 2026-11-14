import * as display from '../dist/display-views.mjs';
import {renderPortfolio} from '../dist/portfolio.mjs';
import {createEventsWorkspace} from '../dist/events.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from '../dist/model.mjs';
import {prepareCRM} from '../dist/prospects.mjs';
import {createCallCenter} from '../dist/call-center.mjs';
import {createLeasingWorkspace} from '../dist/leasing.mjs';

// Exercise real rendering and delegated filter events without pretending this is browser layout QA.
function app(){
 const elements=new Map(),handlers={},downloads=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{dataset:{},querySelectorAll(){return [];},innerHTML:'',textContent:'',addEventListener(type,fn){handlers[id+':'+type]=fn;},focus(){},classList:{add(){},remove(){}},close(){}});return elements.get(id);};
 let hash='#attribution/overview';const location={get hash(){return hash;},set hash(value){hash=value.startsWith('#')?value:'#'+value;}};
 const context=vm.createContext({...model,...display,renderPortfolio,prepareCRM,createCallCenter,createEventsWorkspace,createLeasingWorkspace:api=>({...createLeasingWorkspace(api),change(){return false;}}),location,Intl,Date,Blob,URL:{createObjectURL(blob){downloads.push(blob);return 'blob:test';},revokeObjectURL(){}},setTimeout(){},clearTimeout(){},localStorage:{getItem(){return null;},setItem(){}},document:{getElementById:element,querySelector:element,documentElement:{style:{setProperty(){}}},addEventListener(){},body:{append(){}},createElement(){return {click(){},remove(){}};}},window:{scrollTo(){},addEventListener(type,fn){handlers['window:'+type]=fn;}}});
 const code=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8').replace(/^import .+;\n/gm,'');vm.runInContext(code,context);
 return {context,downloads,run:code=>vm.runInContext(code,context),html:()=>element('app').innerHTML,change:(key,value)=>handlers['app:change']({target:{id:'marketing-'+key,hasAttribute(){return false;},dataset:{marketing:key},value}})};
}

test('marketing filters update rendering, support every report and stay scoped to marketing',()=>{
 const a=app();assert.match(a.html(),/Marketing Intelligence/);assert.match(a.html(),/Custom date range/);
 a.change('source','google');assert.match(a.html(),/9,000/);assert.equal(a.run('metrics(reportFilters()).leads.length'),90);
 a.change('channel','Paid social');assert.equal(a.run('marketingFilters.source'),'all');assert.equal(a.run('metrics(reportFilters()).leads.length'),30);
 for(const tab of ['overview','sources','funnel','website','organic','journeys','recommendations']){a.run(`location.hash='#attribution/${tab}';render()`);assert.doesNotMatch(a.html(),/NaN|undefined/);}
 a.run("location.hash='#portfolio';render()");assert.equal(a.run('metrics(reportFilters()).leads.length'),240);assert.doesNotMatch(a.html(),/id="marketing-source"/);
});

test('custom dates and funnel drill-downs reconcile with the actual CSV data',async()=>{
 const a=app();a.change('range','all');assert.equal(a.run('metrics(reportFilters()).leads.length'),468);a.change('range','custom');assert.match(a.html(),/id="marketing-from"/);
 a.run("marketingFilters.dateFrom='2026-10-01';marketingFilters.dateTo='2026-10-05';marketingFilters.source='google';render()");
 assert.match(a.html(),/Partial-month spend is estimated/);
 const leased=a.run('metrics(reportFilters()).leases');
 await a.run("onAction({target:{closest:()=>({dataset:{action:'marketing-stage',stage:'leased'}})}})");
 a.run('render()');assert.equal(a.run('marketingJourneyRecords(metrics(reportFilters())).length'),leased);
 a.run('exportData()');const csv=await a.downloads.at(-1).text();assert.equal(csv.split('\r\n').length-1,leased);
 assert.ok(csv.split('\r\n').slice(1).every(row=>row.includes('Google Ads')&&row.includes('Lease signed')));
 a.run("location.hash='#attribution/sources';exportData()");assert.match(await a.downloads.at(-1).text(),/Daily prorated estimate/);
 a.run("marketingFilters.dateFrom='2027-01-01';marketingFilters.dateTo='2027-01-31';location.hash='#attribution/website';render()");assert.match(a.html(),/No enquiries match these filters/);assert.doesNotMatch(a.html(),/NaN|undefined/);
 a.run('resetMarketingFilters();render()');assert.equal(a.run('metrics(reportFilters()).leads.length'),240);
});


test('portfolio sections remain ordered and leasing conversions drill into filtered records', async()=>{
 const a=app();a.run("location.hash='#portfolio';render()");
 const titles=[...a.html().matchAll(/<h2 id="overview-[^"]+">([^<]+)<\/h2>/g)].map(match=>match[1]);
 assert.deepEqual(titles,['Portfolio Overview','Leasing Overview','Marketing Overview','Call Center Overview','Online Reputation Overview']);
 for (const rate of ['41.7%','72.0%','44.4%','56.3%']) assert.ok(a.html().includes(rate));
 assert.doesNotMatch(a.html(),/NaN|undefined/);
 a.run("filters.property='north';render()");assert.match(a.html(),/33.3%/);
 await a.run("onAction({target:{closest:()=>({dataset:{action:'drill-stage',stage:'scheduled'}})}})");
 a.run('render()');assert.equal(a.run('filters.property'),'north');assert.match(a.html(),/Tours scheduled · 30 leads/);
});
