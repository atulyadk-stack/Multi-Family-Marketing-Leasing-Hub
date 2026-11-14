import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,properties} from '../dist/model.mjs';
import {callRecords,agentPerformance,summarizeCalls,createCallCenter} from '../dist/call-center.mjs';
import {addInteraction} from '../dist/prospects.mjs';
import {setDisplayMode,displayMode} from '../dist/display-views.mjs';

test('agent and service call counts reconcile to every property and reporting cohort',()=>{
  for(const month of [9,10])for(const property of properties){
    const calls=callRecords({month,property:property.id},defaultState()),agents=agentPerformance(calls),total=summarizeCalls(calls);
    assert.ok(agents.length>=2,'property should demonstrate several agents/services');
    assert.equal(agents.reduce((n,a)=>n+a.calls.length,0),calls.length);
    for(const key of ['inbound','outbound','handled','missed','abandoned','toursBooked'])assert.equal(agents.reduce((n,a)=>n+a[key],0),total[key]);
    assert.ok(agents.every(a=>a.calls.every(c=>c.property===property.id&&c.agentId===a.id)));
  }
});
test('unanswered calls are assigned attempts, not handled calls; unavailable durations stay missing',()=>{
  const calls=[{agentId:'A',owner:'Agent A',service:'Call Center',direction:'inbound',outcome:'Abandoned'},
    {agentId:'A',owner:'Agent A',service:'Call Center',direction:'inbound',outcome:'Missed'},
    {agentId:'B',owner:'Agent B',service:'Call Center',direction:'outbound',outcome:'Connected',duration:120}];
  const rows=agentPerformance(calls),a=rows.find(a=>a.id==='A'),b=rows.find(a=>a.id==='B');
  assert.equal(a.handled,0);assert.equal(a.averageTalk,null);assert.equal(a.abandoned,1);assert.equal(a.missed,1);
  assert.equal(b.handled,1);assert.equal(b.averageTalk,120);assert.equal(b.handleTime,null);
});
test('historical call assignment survives lead reassignment; legacy calls stay unassigned',()=>{
  const s=defaultState(),filters={month:10,property:'north'};
  const original=callRecords(filters,s).map(c=>[c.id,c.agentId]);
  const entry=addInteraction(s,{leadId:'L229',channel:'Phone',direction:'inbound',outcome:'Connected',body:'Sample manual call',duration:70});
  const assigned=entry.assignedAgentId;
  s.prospectOwners.L229=properties[1].owner;
  assert.deepEqual(callRecords(filters,s).filter(c=>c.id.startsWith('SEED')).map(c=>[c.id,c.agentId]),original);
  assert.equal(callRecords(filters,s).find(c=>c.id===entry.id).agentId,assigned);
  delete entry.assignedAgentId;delete entry.handledById;
  assert.equal(callRecords(filters,s).find(c=>c.id===entry.id).agentId,'unassigned');
});
function workspace(){
  const state=defaultState(),filters={month:10,property:'north'},noop=()=>{};
  const api={esc:String,icon:()=>'',btn:(text,action,attrs='')=>`<button data-action="${action}" ${attrs}>${text}</button>`,chip:String,panel:(title,sub,body,actions='')=>`<section><h2>${title}</h2><p>${sub}</p>${actions}${body}</section>`,heading:(title,sub)=>`<h1>${title}</h1><p>${sub}</p>`,filters,getState:()=>state,render:noop,refreshProperty:noop};
  return {ui:createCallCenter(api),filters,state};
}
test('call card/list views preserve selected calls, pagination and exact export rows',()=>{
  setDisplayMode('all','cards');const {ui}=workspace();
  const cards=ui.dashboard('all'),before=ui.exportRows('all');
  assert.match(cards,/class="cc-calls"/);assert.match(cards,/Agent & service performance/);
  ui.action({dataset:{action:'cc-page',delta:'1'}});
  const page2=ui.dashboard('all');
  const ids=[...page2.matchAll(/class="cc-id">([^<]+)/g)].map(x=>x[1]);assert.equal(ids.length,12);
  setDisplayMode('call-activity','list');setDisplayMode('call-agents','list');
  const list=ui.dashboard('all');assert.match(list,/Call activity list/);assert.match(list,/Avg\. talk/);
  for(const id of ids)assert.ok(list.includes(id));assert.deepEqual(ui.exportRows('all'),before);
  setDisplayMode('all','cards');
});
test('agent filter composes with outcome tabs and export, and property details isolate calls',()=>{
  const {ui,filters,state}=workspace();setDisplayMode('call-activity','list');
  const id=callRecords(filters,state)[0].agentId;
  ui.change({hasAttribute:()=>true,dataset:{},value:id});
  ui.resetPage();
  const rows=ui.exportRows('answered');assert.ok(rows.length>1);
  const agentColumn=rows[0].indexOf('Agent ID');assert.ok(rows.slice(1).every(r=>r[agentColumn]===id&&r[5]==='inbound'));
  const detail=ui.propertyDetails('river');assert.match(detail,/Call activity/);assert.match(detail,/Agent & service performance/);
  assert.match(detail,/Rivergate Residences/);assert.doesNotMatch(detail,/Northpoint Apartments/);
  setDisplayMode('all','cards');
});
test('global presentation resets section overrides without touching records',()=>{
  const s=defaultState(),before=JSON.stringify(s);
  setDisplayMode('all','list');assert.equal(displayMode('events'), 'list');
  setDisplayMode('call-activity','cards');assert.equal(displayMode('call-activity'),'cards');assert.equal(displayMode('properties'),'list');
  setDisplayMode('all','cards');assert.equal(displayMode('call-activity'),'cards');assert.equal(JSON.stringify(s),before);
});
