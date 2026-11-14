import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState, properties, leads} from '../dist/model.mjs';
import {addInteraction, interactionHistory} from '../dist/prospects.mjs';
import {callRecords, summarizeCalls, selectCalls, callExportRows, formatTime, formatRate} from '../dist/call-center.mjs';

test('call KPI denominators, duration components and booking attribution reconcile', () => {
  const calls = [
    {direction:'inbound',outcome:'Connected',contactId:'A',duration:60,holdSeconds:10,wrapSeconds:20,waitSeconds:10,tourBooked:true},
    {direction:'inbound',outcome:'Connected',contactId:'A',duration:120,holdSeconds:20,wrapSeconds:40,waitSeconds:30,tourBooked:false},
    {direction:'inbound',outcome:'Abandoned',contactId:'B',duration:0,waitSeconds:90},
    {direction:'inbound',outcome:'No answer',contactId:'C',duration:0},
    {direction:'outbound',outcome:'Connected',contactId:'C',duration:30,holdSeconds:0,wrapSeconds:0,tourBooked:true}
  ];
  const m = summarizeCalls(calls);
  assert.equal(m.inbound,4); assert.equal(m.outbound,1); assert.equal(m.uniqueCallers,3);
  assert.equal(m.answerRate,50); assert.equal(m.abandonmentRate,25);
  assert.equal(m.speedToAnswer,20); assert.equal(m.handleTime,100);
  assert.equal(m.tourRate,50); assert.equal(m.toursBooked,1);
  assert.equal(m.inbound,m.answered+m.abandoned+m.missed+m.unclassified);
  assert.equal(selectCalls(calls,'booked').length,1);
  assert.equal(formatTime(100),'1m 40s'); assert.equal(formatTime(0),'0s');
  for (const value of [summarizeCalls([]).answerRate, summarizeCalls([]).speedToAnswer]) assert.equal(value,null);
  assert.equal(formatRate(null),'—'); assert.equal(formatTime(undefined),'—');
});

test('call dashboard scope and export use the same events as prospect timelines', () => {
  const state=defaultState();
  for (const month of [9,10]) {
    const all=callRecords({month},state);
    assert.ok(all.length>0);
    assert.equal(properties.flatMap(p=>callRecords({month,property:p.id},state)).length,all.length);
    for (const call of all) {
      assert.ok(interactionHistory(call.leadId,state).some(event=>event.id===call.id));
      assert.equal(leads.find(l=>l.id===call.leadId).month,month);
    }
    const abandoned=selectCalls(all,'abandoned');
    assert.ok(abandoned.length>0);
    assert.equal(callExportRows(abandoned).length,abandoned.length+1);
    assert.ok(abandoned.every(c=>c.direction==='inbound'&&c.outcome==='Abandoned'&&c.duration===0));
  }
  assert.equal(callRecords({month:10,property:'north',city:'Oakville'},state).length,0);
  assert.ok(callRecords({month:10,pmc:'Crest Management'},state).every(c=>['river','willow'].includes(c.property)));
});

test('manual call logs update volume without inventing timing or tour attribution', () => {
  const state=defaultState(),filters={month:10},before=summarizeCalls(callRecords(filters,state));
  addInteraction(state,{leadId:'L229',channel:'Phone',direction:'inbound',outcome:'Connected',body:'Manual call',duration:360});
  addInteraction(state,{leadId:'L229',channel:'Phone',direction:'inbound',outcome:'Connected',body:'Draft call',duration:120,draft:true});
  addInteraction(state,{leadId:'L229',channel:'SMS',direction:'inbound',body:'Message'});
  const after=summarizeCalls(callRecords(filters,state));
  assert.equal(after.inbound,before.inbound+1); assert.equal(after.answered,before.answered+1);
  assert.equal(after.waitSamples,before.waitSamples); assert.equal(after.handleSamples,before.handleSamples);
  assert.equal(after.speedToAnswer,before.speedToAnswer); assert.equal(after.handleTime,before.handleTime);
  assert.equal(after.toursBooked,before.toursBooked);
});
