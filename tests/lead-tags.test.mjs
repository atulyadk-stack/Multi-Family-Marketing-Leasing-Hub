import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,restoreState,metrics,leads,properties,sources} from '../dist/model.mjs';
import {leadTags,setLeadTag,prospect,pipelineRecords} from '../dist/prospects.mjs';
import {createLeasingWorkspace} from '../dist/leasing.mjs';

test('every lead has a valid tag and edits survive reload without changing milestones or another lead',()=>{
 const s=defaultState(),before=metrics({month:10},s);
 assert.ok(leads.every(l=>leadTags.some(([tag])=>tag===prospect(l.id,s).tag)));
 const other=prospect('L230',s).tag;
 setLeadTag(s,'L229','disqualified');s.leadView='list';
 const restored=restoreState(JSON.parse(JSON.stringify(s)));
 assert.equal(prospect('L229',restored).tag,'disqualified');
 assert.equal(prospect('L230',restored).tag,other);
 assert.equal(restored.leadView,'list');
 assert.equal(metrics({month:10},restored).leases,before.leases);
 assert.equal(metrics({month:10},restored).leads.length,before.leads.length);
 assert.ok(pipelineRecords({month:10},restored,{stage:'leased',tag:'disqualified'}).some(l=>l.id==='L229'));
});

test('old and malformed saved state migrate safely; invalid tag writes cannot alter a lead',()=>{
 const old=restoreState({version:1,tourBookings:[],leadTags:[],leadView:'unknown'});
 assert.deepEqual(old.leadTags,{});assert.equal(old.leadView,'cards');
 const tag=prospect('L229',old).tag;
 assert.throws(()=>setLeadTag(old,'missing','hot'));
 assert.throws(()=>setLeadTag(old,'L229','unknown'));
 assert.equal(prospect('L229',old).tag,tag);
 old.leadTags.L229='<script>';
 assert.equal(prospect('L229',old).tag,tag);
});

test('tag filters compose with stage, property, cohort, source and search',()=>{
 const s=defaultState(),f={month:10,property:'north'};
 setLeadTag(s,'L229','cold');setLeadTag(s,'L230','cold');
 const rows=pipelineRecords(f,s,{stage:'leased',source:'google',tag:'cold',search:'P-L229'});
 assert.deepEqual(rows.map(l=>l.id),['L229']);
 assert.equal(pipelineRecords({...f,month:9},s,{tag:'cold'}).length,0);
 assert.equal(pipelineRecords({...f,city:'Oakville'},s,{tag:'cold'}).length,0);
});

function workspace(t){
 const state=defaultState(),filters={month:10,property:'north'};let saved=null,exported=null;
 t.mock.method(URL,'createObjectURL',blob=>{exported=blob;return 'blob:test';});
 t.mock.method(URL,'revokeObjectURL',()=>{});
 const previous=globalThis.document;
 globalThis.document={querySelector:()=>null,getElementById:()=>null,createElement:()=>({click(){}})};
 t.after(()=>{globalThis.document=previous;});
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const api={esc,btn:(label,action,attrs='',kind='')=>`<button class="${kind}" data-action="${action}" ${attrs}>${label}</button>`,chip:text=>`<span>${text}</span>`,heading:(title,sub,actions)=>`<h1>${title}</h1><p>${sub}</p>${actions}`,panel:(title,sub,body)=>`<section><h2>${title}</h2><p>${sub}</p>${body}</section>`,metric:()=>'',icon:()=>'',money:n=>'$'+n,pName:id=>properties.find(p=>p.id===id).name,sName:id=>sources.find(s=>s.id===id).name,filters,getState:()=>state,render:()=>{},navigate:()=>{},persist:()=>{saved=JSON.parse(JSON.stringify(state));},toast:()=>{}};
 return {state,ui:createLeasingWorkspace(api),saved:()=>saved,exported:()=>exported};
}

test('card and list views preserve the cohort; expanding a lead exposes its own contact details',t=>{
 const {ui,state,saved}=workspace(t);
 const cards=ui.list('all');assert.match(cards,/<h1>Lead to Lease<\/h1>/);assert.match(cards,/class="prospect-grid"/);
 const count=cards.match(/Enquiries · (\d+) leads/)[1];
 ui.action({dataset:{action:'pipeline-view',view:'list'}});
 const list=ui.list('all');assert.match(list,/class="lead-list"/);assert.match(list,new RegExp('Enquiries · '+count+' leads'));
 assert.equal(state.leadView,'list');assert.equal(restoreState(saved()).leadView,'list');
 ui.action({dataset:{action:'pipeline-expand',id:'L229'}});
 assert.match(ui.list('all'),/l229@example.invalid/);assert.match(ui.list('all'),/aria-expanded="true"/);
 ui.action({dataset:{action:'pipeline-expand',id:'L229'}});
 assert.doesNotMatch(ui.list('all'),/l229@example.invalid/);
});

test('editing and filtering tags produces a matching CSV with the tag column and an honest empty state',async t=>{
 const {ui,state,exported}=workspace(t);
 ui.change({id:'lead-tag-L229',value:'disqualified',dataset:{leadTag:'',id:'L229'}});
 assert.equal(state.leadTags.L229,'disqualified');
 ui.change({id:'pipeline-tag',value:'disqualified',dataset:{}});
 assert.match(ui.list('all'),/Enquiries · 1 leads/);
 ui.exportList('all');
 const csv=await exported().text();assert.match(csv,/"Stage","Lead tag","Owner"/);assert.match(csv,/"Lease signed","Disqualified"/);assert.match(csv,/P-L229/);assert.doesNotMatch(csv,/P-L230/);
 ui.change({id:'pipeline-tag',value:'cold',dataset:{}});
 assert.match(ui.list('all'),/No matching leads/);assert.match(ui.list('all'),/0–0 of 0/);
 ui.action({dataset:{action:'pipeline-reset'}});
 assert.doesNotMatch(ui.list('all'),/No matching leads/);
});
