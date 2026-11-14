import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,metrics,leads,properties,sources} from '../dist/model.mjs';
import {contactStats,prospect} from '../dist/prospects.mjs';
import {seededMarketingTouches,selectMarketingTouches,marketingHistory,summarizeMarketingTouches,validMarketingRange,marketingExportRows} from '../dist/marketing-touchpoints.mjs';
import {createLeasingWorkspace} from '../dist/leasing.mjs';

test('Charlie has six marketing touches across eight calendar months, separate from communications and original source',()=>{
 const s=defaultState(),before=metrics({month:10},s),contact=contactStats('L236',s),source=prospect('L236',s).source;
 const events=marketingHistory('L236'),summary=summarizeMarketingTouches(events);
 assert.equal(events.length,6);assert.equal(summary.channelCount,3);assert.equal(summary.repeats,3);
 assert.deepEqual(Object.fromEntries(summary.channels.map(c=>[c.name,c.count])),{'Apartments.com':3,Google:2,Facebook:1});
 assert.ok(summary.first.at<prospect('L236',s).created);
 const first=new Date(summary.first.at),last=new Date(summary.last.at);
 assert.equal((last.getUTCFullYear()-first.getUTCFullYear())*12+last.getUTCMonth()-first.getUTCMonth()+1,8);
 assert.deepEqual(contactStats('L236',s),contact);assert.equal(metrics({month:10},s).leads.length,before.leads.length);assert.equal(prospect('L236',s).source,source);
 assert.ok(events.every(e=>e.demo&&e.linked&&e.contactId==='P-L236'&&e.property==='north'));
});

test('scope uses contact and property IDs; deduplication retains separate repeat events and other enquiries for the same contact',()=>{
 const seed=seededMarketingTouches('L236'),base=seed[0];
 const sameContactOtherEnquiry={...base,id:'MKT-L999-1',externalId:'other-enquiry',leadId:'L999'};
 const otherProvider={...base,id:'OTHER',provider:'different-provider'};
 const events=[...seed,{...base},sameContactOtherEnquiry,otherProvider,{...base,id:'unlinked',externalId:'unlinked',linked:false},{...base,id:'other-person',externalId:'other-person',contactId:'P-L230'},{...base,id:'other-property',externalId:'other-property',property:'river'},{...base,id:'bad-date',externalId:'bad-date',at:'not-a-date'}];
 const selected=selectMarketingTouches(events,{contactId:'P-L236',property:'north'});
 assert.equal(selected.length,8);assert.ok(selected.some(e=>e.leadId==='L999'));
 assert.equal(selected.filter(e=>e.id===base.id).length,1);
 assert.equal(selectMarketingTouches(events,{}).length,0);
 assert.ok(selected.every(e=>e.contactId==='P-L236'&&e.property==='north'&&e.linked));
});

test('date and channel filters are inclusive, ordered and export the same selected touches',()=>{
 const events=marketingHistory('L236'),referral=events[1],day=referral.at.slice(0,10);
 const one=marketingHistory('L236',{channel:'apartments',from:day,to:day});assert.deepEqual(one,[referral]);
 const apartments=marketingHistory('L236',{channel:'apartments'});assert.equal(apartments.length,3);
 assert.equal(marketingExportRows(apartments).length,4);assert.ok(marketingExportRows(apartments).slice(1).every(row=>row[4]==='Apartments.com'));
 assert.ok(events.every((e,i)=>!i||events[i-1].at<=e.at));
 for(const options of [{from:'2026-11-01',to:'2026-01-01'},{from:'2026-02-30'},{to:'bad'}]){assert.equal(validMarketingRange(options),false);assert.deepEqual(marketingHistory('L236',options),[]);}
 assert.equal(validMarketingRange({from:'2024-02-29'}),true);
 assert.deepEqual(marketingHistory('missing'),[]);assert.equal(summarizeMarketingTouches([]).first,null);assert.equal(summarizeMarketingTouches([]).channelCount,0);
});

function setup(t){
 const s=defaultState();let downloaded=null,navigated='';const previousDocument=globalThis.document,previousLocation=globalThis.location;
 globalThis.document={querySelector:()=>null,getElementById:()=>null,createElement:()=>({click(){}})};globalThis.location={hash:'#prospect/L236'};
 t.after(()=>{globalThis.document=previousDocument;globalThis.location=previousLocation;});
 t.mock.method(URL,'createObjectURL',blob=>{downloaded=blob;return 'blob:demo';});t.mock.method(URL,'revokeObjectURL',()=>{});
 const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const api={esc,btn:(label,action,attrs='',kind='')=>`<button class="${kind}" data-action="${action}" ${attrs}>${label}</button>`,chip:text=>`<span>${text}</span>`,heading:(title,sub,actions)=>`<h1>${title}</h1><p>${sub}</p>${actions}`,panel:(title,sub,body,actions)=>`<section><h2>${title}</h2><p>${sub}</p>${actions||''}${body}</section>`,metric:(label,value)=>`<div>${label}: ${value}</div>`,icon:()=>'',money:n=>'$'+n,pName:id=>properties.find(p=>p.id===id).name,sName:id=>sources.find(s=>s.id===id).name,filters:{month:10,property:'north'},getState:()=>s,render:()=>{},navigate:route=>{navigated=route;},persist:()=>{},toast:()=>{}};
 return {ui:createLeasingWorkspace(api),downloaded:()=>downloaded,navigated:()=>navigated};
}

test('contact overview separates marketing from contact channels and pills open filtered journey with matching CSV',async t=>{
 const {ui,downloaded}=setup(t);const overview=ui.detail('L236');
 assert.match(overview,/Contact channels: 4/);assert.match(overview,/Marketing touchpoints/);assert.match(overview,/Marketing channels/);assert.match(overview,/View 3 marketing touchpoints from Apartments.com/);
 ui.action({dataset:{action:'marketing-channel',channel:'apartments'}});
 let html=ui.detail('L236');assert.match(html,/3 touchpoints · 1 channel/);assert.match(html,/Marketing journey/);assert.match(html,/Demo data — live tracking is not connected/);
 ui.action({dataset:{action:'marketing-export',id:'L236'}});
 const csv=await downloaded().text();assert.equal(csv.split('\r\n').length,4);assert.match(csv,/Apartments.com/);assert.doesNotMatch(csv,/"Google"/);
 const day=marketingHistory('L236',{channel:'apartments'})[0].at.slice(0,10);
 ui.change({id:'marketing-from',value:day,dataset:{}});ui.change({id:'marketing-to',value:day,dataset:{}});assert.match(ui.detail('L236'),/1 touchpoint · 1 channel/);
 ui.change({id:'marketing-from',value:'2027-01-01',dataset:{}});html=ui.detail('L236');assert.match(html,/end date on or after/);assert.match(html,/data-action="marketing-export"[^>]*disabled/);
 ui.action({dataset:{action:'marketing-reset'}});assert.match(ui.detail('L236'),/6 touchpoints · 3 channels/);
});

test('opening another lead clears journey filters and the new record retains its own identifiers',t=>{
 const {ui,navigated}=setup(t);
 ui.action({dataset:{action:'marketing-channel',channel:'apartments'}});
 ui.change({id:'marketing-from',value:'2030-01-01',dataset:{}});
 ui.open('L230');assert.equal(navigated(),'prospect/L230');
 ui.action({dataset:{action:'record-tab',tab:'marketing'}});
 const html=ui.detail('L230');assert.match(html,/6 touchpoints/);assert.match(html,/MKT-L230-1/);assert.doesNotMatch(html,/MKT-L236/);assert.match(html,/id="marketing-from" value=""/);
});
