import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,restoreState,metrics,leads,properties} from '../dist/model.mjs';
import {stages,pipelineRecords,prospect,contactStats,interactionHistory,addInteraction,scheduleTour} from '../dist/prospects.mjs';

test('every stage drill-down reconciles to the dashboard for every property and cohort',()=>{
 const s=defaultState();for(const month of [9,10])for(const property of ['all',...properties.map(p=>p.id)]){const f={month,property},m=metrics(f,s);for(const [stage] of stages){const list=pipelineRecords(f,s,{stage});assert.equal(list.length,stage==='all'?m.leads.length:stage==='leased'?m.leases:m[stage]);assert.equal(new Set(list.map(x=>x.id)).size,list.length);for(const l of list){assert.ok(l.contactId);assert.ok(l.email.endsWith('@example.invalid'));if(stage==='leased')assert.ok(l.lease&&l.application&&l.tour);}}}
});
test('repeat contacts stay on one identity; inbound and outbound reconcile to touchpoints',()=>{
 const s=defaultState(),l=leads.find(x=>x.month===10&&Number(x.id.slice(1))%3===2),before=contactStats(l.id,s),count=metrics({month:10},s).leads.length;assert.ok(before.inbound>1);assert.equal(before.total,before.inbound+before.outbound);addInteraction(s,{leadId:l.id,channel:'SMS',direction:'inbound',body:'Can I tour this week?',key:'provider-123'});addInteraction(s,{leadId:l.id,channel:'SMS',direction:'inbound',body:'Duplicate event',key:'provider-123'});const after=contactStats(l.id,s);assert.equal(after.inbound,before.inbound+1);assert.equal(after.total,before.total+1);assert.equal(metrics({month:10},s).leads.length,count);assert.equal(interactionHistory(l.id,s)[0].contactId,prospect(l.id,s).contactId);
});
test('notes and drafts are retained but do not inflate contact counts',()=>{
 const s=defaultState(),id='L229',before=contactStats(id,s).total;addInteraction(s,{leadId:id,channel:'Note',direction:'internal',body:'Follow up tomorrow.'});addInteraction(s,{leadId:id,channel:'Email',direction:'outbound',draft:true,body:'Draft reply.'});assert.equal(contactStats(id,s).total,before);assert.equal(interactionHistory(id,s).filter(x=>x.status==='Draft'||x.channel==='Note').length,2);
});
test('interaction validation prevents invalid records and preserves the original state',()=>{
 const s=defaultState();for(const input of [{leadId:'bad',body:'x',channel:'SMS',direction:'inbound'},{leadId:'L229',body:' ',channel:'Email',direction:'outbound'},{leadId:'L229',body:'x',channel:'Note',direction:'outbound'},{leadId:'L229',body:'x',channel:'SMS',direction:'inbound',at:'invalid'},{leadId:'L229',body:'x',channel:'Phone',direction:'outbound',duration:-1}])assert.throws(()=>addInteraction(s,input));assert.equal(s.interactions.length,0);
});
test('booking a tour updates the filtered milestone and appends exactly one confirmation',()=>{
 const s=defaultState(),l=leads.find(x=>x.month===10&&!x.scheduled),m=metrics({month:10},s),c=contactStats(l.id,s),date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);assert.throws(()=>scheduleTour(s,l.id,{date:'2020-01-01',time:'14:00',type:'In person'}));assert.equal(metrics({month:10},s).scheduled,m.scheduled);scheduleTour(s,l.id,{date,time:'14:00',type:'In person',notes:'Meet at the leasing office'});assert.equal(metrics({month:10},s).scheduled,m.scheduled+1);assert.equal(metrics({month:10},s).applied,m.applied);assert.equal(contactStats(l.id,s).outbound,c.outbound+1);assert.equal(prospect(l.id,s).tour.date,date);assert.throws(()=>scheduleTour(s,l.id,{date,time:'15:00',type:'Virtual'}));assert.equal(s.interactions.length,1);
});
test('communication state survives reload and stays isolated between people',()=>{
 const s=defaultState();addInteraction(s,{leadId:'L229',channel:'Email',direction:'outbound',body:'Saved reply'});s.prospectOwners.L229='Sam Patel';const saved=restoreState(JSON.parse(JSON.stringify(s)));assert.equal(prospect('L229',saved).owner,'Sam Patel');assert.equal(interactionHistory('L229',saved)[0].body,'Saved reply');assert.equal(interactionHistory('L230',saved).some(x=>x.body==='Saved reply'),false);assert.deepEqual(restoreState({version:1,interactions:'bad',tourDetails:[]}).interactions,[]);
});
test('search and source filters constrain the detail export dataset',()=>{
 const s=defaultState(),f={month:10,property:'north'};const all=pipelineRecords(f,s),one=all[0];assert.equal(pipelineRecords(f,s,{search:one.contactId}).length,1);assert.ok(pipelineRecords(f,s,{source:'google'}).every(l=>l.source==='google'));assert.equal(pipelineRecords({...f,city:'Oakville'},s).length,0);
});
