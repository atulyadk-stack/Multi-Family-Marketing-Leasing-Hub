import {records, properties} from './model.mjs';
import {interactionHistory} from './prospects.mjs';

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
      .map(event => ({...event, name: lead.name, propertyName: property.name,
        owner: event.direction === 'outbound' ? event.agent : (event.handledBy || state.prospectOwners?.[lead.id] || property.owner)}));
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
  return [['Call ID', 'Prospect ID', 'Prospect', 'Property', 'Date UTC', 'Direction', 'Outcome', 'Owner', 'Talk seconds', 'Wait seconds', 'Hold seconds', 'Wrap-up seconds', 'Tour booked on call'],
    ...calls.map(c => [c.id, c.leadId, c.name, c.propertyName, c.at, c.direction, c.outcome || 'Not recorded', c.owner,
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

export function createCallCenter({esc, icon, btn, chip, panel, heading, filters, getState, render}) {
  let page = 0;
  const getCalls = () => callRecords(filters, getState());
  const kpis = m => [
    ['Incoming calls', m.inbound.toLocaleString('en-CA'), `${m.uniqueCallers} callers · ${m.outbound} outbound calls`, 'headset', 'inbound'],
    ['Answer rate', formatRate(m.answerRate), `${m.answered} of ${m.inbound} incoming calls answered`, 'check', 'answered'],
    ['Abandonment rate', formatRate(m.abandonmentRate), `${m.abandoned} callers left before an answer`, 'phone-off', 'abandoned'],
    ['Avg. speed to answer', formatTime(m.speedToAnswer), `Queue wait · ${m.waitSamples} of ${m.answered} answered calls`, 'clock', 'answered'],
    ['Avg. handle time', formatTime(m.handleTime), `Talk + hold + wrap · ${m.handleSamples} of ${m.handled} connected calls`, 'clock', 'handled'],
    ['Call-to-tour conversion', formatRate(m.tourRate), `${m.toursBooked} bookings / ${m.answered} answered inbound calls`, 'target', 'booked']
  ];
  function cards(m) {
    return `<div class="cc-kpis">${kpis(m).map(([label, value, detail, symbol, view]) => `<button type="button" class="metric cc-kpi" data-action="navigate" data-route="call-center/${view}" aria-label="${esc(label)}: ${esc(value)}. View calls"><span class="metric-title">${label}${icon(symbol)}</span><span class="metric-value">${value}</span><span class="metric-detail">${detail}</span><span class="cc-card-link">View calls ${icon('arrow', 12)}</span></button>`).join('')}</div>`;
  }
  function summary() {
    return panel('Call Center performance', 'Answer demand, protect the caller experience and turn conversations into tours.', cards(summarizeCalls(getCalls()))
      + '<p class="footnote">Fictional call data · Same enquiry cohort and property filters · Full contact history, not calls received in a calendar month.</p>',
      btn('Open Call Center ' + icon('arrow', 13), 'navigate', 'data-route="call-center"', 'ghost'), 'full cc-summary');
  }
  function dashboard(view = 'all') {
    if (![...callViews.map(v => v[0]), 'handled'].includes(view)) view = 'all';
    const all = getCalls(), m = summarizeCalls(all), selected = selectCalls(all, view), pageSize = 12;
    page = Math.min(page, Math.max(0, Math.ceil(selected.length / pageSize) - 1));
    const visible = selected.slice(page * pageSize, (page + 1) * pageSize);
    const date = at => new Date(at).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
    const list = visible.map(c => `<article class="cc-call"><div class="cc-call-head"><div>${btn(esc(c.name), 'open-prospect', `data-id="${c.leadId}"`, 'ghost')}<small>${esc(c.propertyName)} · ${esc(c.leadId)}</small></div>${chip(c.outcome || 'Not recorded', connected(c) ? 'good' : 'warn')}</div><div class="cc-call-facts"><div><small>Direction</small><strong>${c.direction === 'inbound' ? 'Incoming' : 'Outgoing'}</strong></div><div><small>Talk time</small><strong>${formatTime(c.duration)}</strong></div><div><small>Queue wait</small><strong>${formatTime(c.waitSeconds)}</strong></div><div><small>Tour booked</small><strong>${c.tourBooked === true ? 'Yes' : c.tourBooked === false ? 'No' : 'Not recorded'}</strong></div></div><div class="cc-call-footer"><span>${esc(c.owner)}<small>${date(c.at)}</small></span>${btn('Open history ' + icon('arrow', 12), 'open-prospect', `data-id="${c.leadId}"`, 'secondary small')}</div><small class="cc-id">${esc(c.id)}</small></article>`).join('');
    const outcomes = [['Answered', m.answered, 'answered'], ['Abandoned', m.abandoned, 'abandoned'], ['Missed / voicemail', m.missed, 'missed']];
    const breakdown = `<div class="cc-outcomes">${outcomes.map(([label, n, route]) => `<button type="button" data-action="navigate" data-route="call-center/${route}" class="cc-outcome"><span>${label}</span><span class="bar-track"><span class="bar" style="width:${m.inbound ? n / m.inbound * 100 : 0}%"></span></span><strong>${n}</strong></button>`).join('')}</div><p class="footnote">${m.unclassified} inbound calls without a classified outcome. ${m.outbound} outgoing follow-ups.</p>`;
    const propertyRows = records(filters, getState()).properties.map(p => {
      const a = summarizeCalls(all.filter(c => c.property === p.id));
      return `<tr><td>${btn(esc(p.name), 'scope', `data-id="${p.id}" data-route="call-center"`, 'ghost')}</td><td class="numeric">${a.inbound}</td><td class="numeric">${formatRate(a.answerRate)}</td><td class="numeric">${a.toursBooked}</td></tr>`;
    }).join('');
    const propertyTable = `<div class="table-scroll" tabindex="0" aria-label="Call Center property performance"><table><thead><tr><th>Property</th><th class="numeric">Incoming</th><th class="numeric">Answered</th><th class="numeric">Tours booked</th></tr></thead><tbody>${propertyRows}</tbody></table></div>`;
    return heading('Every call. A leasing opportunity.', 'Monitor service and tour bookings, then open the prospect behind each conversation.', btn('Portfolio overview', 'navigate', 'data-route="portfolio"', 'secondary'), 'Call Center')
      + '<div class="insight">' + icon('headset') + '<span>Demo call analytics for the selected enquiry cohort and properties. Includes the full phone history and browser-saved call logs. Queue timing and booking attribution are sample fields; live telephony is not connected.</span></div>'
      + cards(m)
      + `<div class="grid equal">${panel('Incoming call outcomes', 'Each inbound attempt is counted once.', breakdown)}${panel('Property performance', 'Select a property to focus this dashboard.', propertyTable)}</div>`
      + panel('Call activity', `${selected.length} calls · Times shown in your local timezone. Export CSV includes this selection.`,
        `<nav class="tabs cc-tabs" aria-label="Call activity filters">${callViews.map(([id, label]) => `<button type="button" class="tab ${view === id ? 'active' : ''}" data-action="navigate" data-route="call-center/${id}" ${view === id ? 'aria-current="page"' : ''}>${label}</button>`).join('')}${view === 'handled' ? '<span class="tab active">Connected calls</span>' : ''}</nav>`
        + (list ? `<div class="cc-calls">${list}</div>` : '<div class="empty"><h3>No calls in this selection</h3><p>Choose another call filter or property.</p></div>')
        + `<div class="pagination"><span>${selected.length ? page * pageSize + 1 : 0}–${Math.min(selected.length, (page + 1) * pageSize)} of ${selected.length}</span><div>${btn('Previous', 'cc-page', `data-delta="-1" ${page === 0 ? 'disabled' : ''}`, 'secondary small')}${btn('Next', 'cc-page', `data-delta="1" ${(page + 1) * pageSize >= selected.length ? 'disabled' : ''}`, 'secondary small')}</div></div>`, '', 'full')
      + `<details class="panel cc-definitions"><summary>How these KPIs are calculated</summary><dl>${definitions.map(([term, text]) => `<dt>${term}</dt><dd>${text}</dd>`).join('')}</dl><p class="footnote">Missing timing data is excluded from averages and shown as —. Manual calls without booking attribution do not count as tour bookings. All figures are demonstrations, not industry benchmarks.</p></details>`;
  }
  return {summary, dashboard, resetPage(){page = 0;}, exportRows(view){return callExportRows(selectCalls(getCalls(), view));},
    action(button){if (button.dataset.action !== 'cc-page') return false;page = Math.max(0, page + Number(button.dataset.delta));render();return true;}};
}
