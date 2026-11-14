import {createCompetitorWorkspace} from '../dist/competitors.mjs';
import {createDigitalWorkspace} from '../dist/digital.mjs';
import * as display from '../dist/display-views.mjs';
import {renderPortfolio} from '../dist/portfolio.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from '../dist/model.mjs';
import {prepareCRM} from '../dist/prospects.mjs';
import {createCallCenter} from '../dist/call-center.mjs';
import {createLeasingWorkspace} from '../dist/leasing.mjs';
import {createEventsWorkspace} from '../dist/events.mjs';

function app(){
 const elements=new Map(),handlers={};
 const element=id=>{if(!elements.has(id))elements.set(id,{dataset:{},querySelectorAll(){return [];},innerHTML:'',open:false,addEventListener(type,fn){handlers[id+':'+type]=fn;},focus(){},classList:{add(){},remove(){}},close(){this.open=false;},showModal(){this.open=true;},querySelector(){return {focus(){},isConnected:false};}});return elements.get(id);};
 let hash='#events';const context=vm.createContext({createCompetitorWorkspace,createDigitalWorkspace,...model,...display,renderPortfolio,prepareCRM,createCallCenter,createLeasingWorkspace,createEventsWorkspace,location:{get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;},origin:'https://demo.example'},fetch:async()=>({ok:false}),Intl,Date,URL,URLSearchParams,Blob,AbortSignal,setTimeout(){},clearTimeout(){},localStorage:{getItem(){return null;},setItem(){}},document:{getElementById:element,querySelector:element,documentElement:{style:{setProperty(){}}},addEventListener(){}},window:{scrollTo(){},addEventListener(type,fn){handlers['window:'+type]=fn;}}});
 vm.runInContext(readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8').replace(/^import .+;\n/gm,''),context);
 return {run:s=>vm.runInContext(s,context),html:()=>element('app').innerHTML,dialog:()=>element('dialog').innerHTML,change:(key,value)=>handlers['app:change']({target:{id:'event-scope-'+key,dataset:{eventScope:key},value}})};
}
test('events render all views and property filters without cohort controls',()=>{const a=app();assert.match(a.html(),/Events/);assert.match(a.html(),/Event calendar/);assert.doesNotMatch(a.html(),/id="filter-month"/);for(const tab of ['calendar','planned','past','photos']){a.run(`location.hash='#events/${tab}';render()`);assert.doesNotMatch(a.html(),/NaN|undefined/);}a.run("location.hash='#events/planned';render()");a.change('property','north');assert.match(a.html(),/Meet your neighbours/);assert.match(a.html(),/Portfolio winter celebration/);assert.doesNotMatch(a.html(),/Saturday stretch &amp; reset/);a.change('city','Oakville');assert.match(a.html(),/No matching events/);});
test('property directory and detail include linked event overview beside existing features',()=>{const a=app();a.run("location.hash='#properties';render()");assert.equal((a.html().match(/<h3>Events<\/h3>/g)||[]).length,4);a.run("propertyDialog('north')");assert.match(a.dialog(),/<h3>Events<\/h3>/);assert.match(a.dialog(),/Next event/);assert.match(a.dialog(),/Autumn neighbours night/);assert.match(a.dialog(),/Open reputation workspace/);assert.match(a.dialog(),/From the property website/);});
test('event detail exposes RSVPs, guests, attendance and picture carousel',async()=>{const a=app();await a.run("onAction({target:{closest:()=>({dataset:{action:'event-open',id:'north-past'}})}})");assert.match(a.dialog(),/Confirmed RSVPs/);await a.run("onAction({target:{closest:()=>({dataset:{action:'event-detail-tab',id:'north-past',tab:'attendees'}})}})");assert.match(a.dialog(),/Alex Morgan/);assert.match(a.dialog(),/Undo check-in/);await a.run("onAction({target:{closest:()=>({dataset:{action:'event-photo',id:'north-past',index:'0'}})}})");assert.match(a.dialog(),/Picture 1 of 2/);assert.match(a.dialog(),/Next →/);});
