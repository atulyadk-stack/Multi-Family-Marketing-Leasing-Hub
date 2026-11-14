import {records, properties} from './model.mjs';
import {interactionHistory, callAgents} from './prospects.mjs';

const connected = call => ['Connected', 'Completed', 'Follow-up required'].includes(call.outcome);
const seconds = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const percentage = (n, d) => d ? n / d * 100 : null;
export const formatRate = value => value === null ? '—' : value.toFixed(1) + '%';
export function formatTime(value) {
  if (value === null || !seconds(value)) return '—';
  const rounded = Math.round(value);
  return rounded < 60 ? rounded + 's' : Math.floor(rounded / 60) + 'm ' + String(rounded % 60).padStart(2, '0') + 's';
}

// The same phone events power this dashboard and each Prospect 360 timeline.
// Cohort filters select enquiries, then include their full call history.
export function callRecords(filters, state) {
  return records(filters, state).leads.flatMap(lead => {
    const property = properties.find(p => p.id === lead.property);
    return interactionHistory(lead.id, state)
      .filter(event => event.channel === 'Phone' && event.status !== 'Draft' && ['inbound', 'outbound'].includes(event.direction))
      .map(event => {
        const agentId=event.assignedAgentId || event.handledById || event.agentId || 'unassigned';
        const assigned=callAgents.find(a=>a.id===agentId);
        return {...event, name:lead.name, propertyName:property.name, agentId:assigned?agentId:'unassigned',
          owner:assigned?.name || 'Unassigned', service:assigned?.service || 'Assignment not recorded'};
      });
  }).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
}

export function summarizeCalls(calls) {
  const inbound = calls.filter(c => c.direction === 'inbound');
  const answered = inbound.filter(connected);
  const abandoned = inbound.filter(c => c.outcome === 'Abandoned');
  const missed = inbound.filter(c => ['No answer', 'Voicemail', 'Missed'].includes(c.outcome));
  const waits = answered.filter(c => seconds(c.waitSeconds)).map(c => c.waitSeconds);
  const handled = calls.filter(connected);
  const handleTimes = handled.filter(c => [c.duration, c.holdSeconds, c.wrapSeconds].every(seconds))
    .map(c => c.duration + c.holdSeconds + c.wrapSeconds);
  const booked = answered.filter(c => c.tourBooked === true);
  return {calls, inbound: inbound.length, outbound: calls.length - inbound.length,
    answered: answered.length, abandoned: abandoned.length, missed: missed.length,
    unclassified: inbound.length - answered.length - abandoned.length - missed.length,
    answerRate: percentage(answered.length, inbound.length), abandonmentRate: percentage(abandoned.length, inbound.length),
    speedToAnswer: average(waits), waitSamples: waits.length,
    handleTime: average(handleTimes), handleSamples: handleTimes.length, handled: handled.length,
    toursBooked: booked.length, tourRate: percentage(booked.length, answered.length),
    uniqueCallers: new Set(inbound.map(c => c.contactId)).size};
}

export function callExportRows(calls) {
  return [['Call ID', 'Prospect ID', 'Prospect', 'Property', 'Date UTC', 'Direction', 'Outcome', 'Agent', 'Agent ID', 'Service', 'Talk seconds', 'Wait seconds', 'Hold seconds', 'Wrap-up seconds', 'Tour booked on call'],
    ...calls.map(c => [c.id, c.leadId, c.name, c.propertyName, c.at, c.direction, c.outcome || 'Not recorded', c.owner, c.agentId, c.service,
      c.duration, c.waitSeconds, c.holdSeconds, c.wrapSeconds, c.tourBooked === true ? 'Yes' : c.tourBooked === false ? 'No' : 'Not recorded'])];
}

const definitions = [
  ['Incoming calls', 'All inbound phone attempts for the selected enquiry cohort, including repeat calls. Outbound calls are shown separately.'],
  ['Answer rate', 'Answered inbound calls ÷ all inbound calls. Voicemail and abandoned calls are not answered calls.'],
  ['Abandonment rate', 'Calls where the caller left before an agent answered ÷ all inbound calls. No short-call exclusion is applied.'],
  ['Average speed to answer', 'Average queue wait for answered inbound calls with a recorded wait time. Abandoned calls are excluded.'],
  ['Average handle time', 'Talk + hold + wrap-up time, averaged across connected inbound and outbound calls with all three durations recorded.'],
  ['Call-to-tour conversion', 'Answered inbound calls explicitly marked as booking a tour ÷ answered inbound calls. A later tour alone does not attribute a booking to the call.']
];
const callViews = [['all', 'All calls'], ['inbound', 'Incoming'], ['outbound', 'Outgoing'], ['answered', 'Answered inbound'], ['abandoned', 'Abandoned'], ['missed', 'Missed / voicemail'], ['booked', 'Tour booked']];
export function selectCalls(calls, view) {
  return calls.filter(c => view === 'inbound' ? c.direction === 'inbound' : view === 'outbound' ? c.direction === 'outbound'
    : view === 'answered' ? c.direction === 'inbound' && connected(c)
    : view === 'abandoned' ? c.direction === 'inbound' && c.outcome === 'Abandoned'
    : view === 'missed' ? c.direction === 'inbound' && ['No answer', 'Voicemail', 'Missed'].includes(c.outcome)
    : view === 'booked' ? c.direction === 'inbound' && connected(c) && c.tourBooked === true
    : view === 'handled' ? connected(c) : true);
}

export function agentPerformance(calls) {
  const groups=new Map();
  for(const call of calls){const id=call.agentId||'unassigned';if(!groups.has(id))groups.set(id,{id,name:call.owner||'Unassigned',service:call.service||'Not recorded',calls:[]});groups.get(id).calls.push(call);}
  return [...groups.values()].map(group=>{const m=summarizeCalls(group.calls),talk=group.calls.filter(connected).filter(c=>seconds(c.duration)).map(c=>c.duration);return {...group,...m,averageTalk:average(talk)};}).sort((a,b)=>b.handled-a.handled||a.name.localeCompare(b.name));
}
export {createCallCenter} from './call-center-ui.mjs';
