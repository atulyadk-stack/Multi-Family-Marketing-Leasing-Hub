import test from 'node:test';
import assert from 'node:assert/strict';
import {seedCompetitors,restoreCompetitors,saveCompetitor,removeCompetitor,competitorSummary} from '../dist/competitors-model.mjs';
import {createCompetitorWorkspace} from '../dist/competitors.mjs';
import {properties} from '../dist/model.mjs';
import worker from '../dist/server/index.js';

test('deployed worker serves the competitor manager, model and stylesheet',async()=>{
  for(const name of ['competitors.mjs','competitors-model.mjs','competitors.css']){
    const response=await worker.fetch(new Request('https://demo.example/'+name));
    assert.equal(response.status,200);assert.match(response.headers.get('content-type'),name.endsWith('.css')?/text\/css/:/javascript/);
  }
  const page=await worker.fetch(new Request('https://demo.example/'));assert.match(await page.text(),/href="competitors.css"/);
});

test('six custom competitors persist independently for every property',()=>{
  const data=seedCompetitors();
  for(const p of properties)for(let i=1;i<=6;i++)saveCompetitor(data,p.id,{name:'Custom '+i,rating:i===6?'':4,reviews:i===6?'':i*10});
  const restored=restoreCompetitors(JSON.parse(JSON.stringify(data)));
  for(const p of properties){assert.equal(restored.properties[p.id].length,7);assert.equal(restored.properties[p.id].filter(c=>!c.sample).length,6);}
  const north=restored.properties.north[1],river=restored.properties.river[1];
  assert.notEqual(north.id,river.id);
  saveCompetitor(restored,'north',{name:'Renamed competitor',rating:3.5,reviews:0,url:'https://example.com/reviews'},north.id);
  assert.equal(restored.properties.north[1].id,north.id);assert.equal(restored.properties.river[1].name,'Custom 1');
  removeCompetitor(restored,'north',north.id);assert.equal(restored.properties.north.length,6);assert.equal(restored.properties.river.length,7);
});
test('removed last competitor stays removed on reload; old and malformed data recover safely',()=>{
  const data=seedCompetitors();removeCompetitor(data,'north','sample-north');
  assert.deepEqual(restoreCompetitors(JSON.parse(JSON.stringify(data))).properties.north,[]);
  assert.equal(restoreCompetitors(null).properties.north.length,1);
  const bad={version:1,properties:{north:[null,{id:'a',name:'Bad link',url:'javascript:alert(1)'},{id:'b',name:'Valid',rating:4},{id:'b',name:'Duplicate ID',rating:4}]}};
  assert.deepEqual(restoreCompetitors(bad).properties.north.map(c=>c.name),['Valid']);
});
test('validation rejects duplicates, unsafe links and invalid metrics without changing saved entries',()=>{
  const data=seedCompetitors(),before=JSON.stringify(data);
  for(const input of [{name:'   '},{name:' parkside   commons '},{name:'Test',rating:5.1},{name:'Test',rating:'NaN'},{name:'Test',reviews:-1},{name:'Test',reviews:1.5},{name:'Test',url:'javascript:alert(1)'},{name:'Test',url:'https://user:password@example.com'}])assert.throws(()=>saveCompetitor(data,'north',input));
  assert.throws(()=>saveCompetitor(data,'north',{name:'New'},'missing'));
  assert.throws(()=>saveCompetitor(data,'missing',{name:'New'}));
  assert.equal(JSON.stringify(data),before);
  const item=saveCompetitor(data,'north',{name:'Name only'});assert.equal(item.rating,null);assert.equal(item.reviews,null);
});
test('comparison excludes unrated competitors and uses an unweighted rating average',()=>{
  assert.deepEqual(competitorSummary([{rating:4,reviews:10},{rating:2,reviews:1000},{rating:null,reviews:null}]),{count:3,rated:2,average:3});
  assert.equal(competitorSummary([]).average,null);assert.equal(competitorSummary([{rating:null}]).average,null);
});
test('manager supports adding six, reloading, editing, confirmation, and storage failures',()=>{
  const previous={localStorage:globalThis.localStorage,document:globalThis.document,FormData:globalThis.FormData};
  const values=new Map();let body='',failing=false,renders=0;
  const error={textContent:'',focus(){}};
  globalThis.localStorage={getItem:k=>values.get(k)||null,setItem(k,v){if(failing)throw Error('Quota exceeded');values.set(k,v);}};
  globalThis.document={getElementById:()=>error};globalThis.FormData=class extends Map{constructor(form){super(Object.entries(form.values));}};
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const api={esc,btn:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,panel:(title,sub,html)=>title+sub+html,table:(headers,rows)=>headers.join('|')+rows.join(''),td:v=>`<td>${v}</td>`,propertyLink:p=>p.name,openDialog:(title,sub,html)=>{body=title+sub+html;},render:()=>{renders++;},toast(){}};
  const submit=(workspace,property,id,name)=>workspace.submit({target:{id:'competitor-form',dataset:{property,id},values:{name,rating:'4.2',reviews:'25',url:''}},preventDefault(){}});
  try{
    let workspace=createCompetitorWorkspace(api);
    workspace.action({dataset:{action:'competitor-manage',property:'north'}});assert.match(body,/Add a custom competitor/);
    for(let i=0;i<6;i++)submit(workspace,'north','',i===0?'<Custom 0>':'Custom '+i);
    assert.equal(JSON.parse(values.values().next().value).properties.north.length,7);
    assert.match(body,/&lt;Custom 0>/);assert.doesNotMatch(body,/<Custom 0>/);
    workspace=createCompetitorWorkspace(api);assert.match(workspace.view([properties[0]]),/7 competitors/);
    const saved=JSON.parse(values.values().next().value),id=saved.properties.north[1].id;
    workspace.action({dataset:{action:'competitor-edit',property:'north',id}});assert.match(body,/Save changes/);
    submit(workspace,'north',id,'Updated competitor');assert.match(body,/Updated competitor/);
    workspace.action({dataset:{action:'competitor-remove',property:'north',id}});assert.match(body,/Remove competitor\?/);
    assert.equal(JSON.parse(values.values().next().value).properties.north.length,7);
    workspace.action({dataset:{action:'competitor-confirm-remove',property:'north',id}});assert.equal(JSON.parse(values.values().next().value).properties.north.length,6);
    assert.match(workspace.view([properties[1]]),/1 competitor/);assert.doesNotMatch(workspace.view([properties[1]]),/Custom 1/);
    failing=true;submit(workspace,'north','','Unsaved competitor');assert.match(error.textContent,/Could not save/);assert.doesNotMatch(workspace.view([properties[0]]),/Unsaved competitor/);
    assert.ok(renders>=8);
  }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
