import {metrics, sourceMetrics} from './model.mjs';

const stageLabels = [['all', 'Enquiries'], ['scheduled', 'Tours scheduled'], ['toured', 'Tours completed'], ['applied', 'Applications'], ['leased', 'Leases signed']];

export function leasingStages(m) {
  return stageLabels.map(([id, label]) => ({id, label, count: id === 'all' ? m.leads.length : id === 'leased' ? m.leases : m[id]}));
}

export function stageConversions(m) {
  const stages = leasingStages(m);
  return stages.slice(1).map((next, index) => ({from: stages[index], to: next,
    rate: stages[index].count ? next.count / stages[index].count * 100 : null}));
}

export const conversionLabel = rate => rate === null ? '—' : rate.toFixed(1) + '%';

export function marketingLeaders(data) {
  const volume = data.filter(s => s.leases > 0).sort((a, b) => b.leases - a.leases || a.name.localeCompare(b.name));
  const paid = data.filter(s => s.paid && s.leases > 0 && s.spend > 0).sort((a, b) => a.spend / a.leases - b.spend / b.leases || b.leases - a.leases);
  const conversion = data.filter(s => s.leads > 0 && s.leases > 0).sort((a, b) => b.leases / b.leads - a.leases / a.leads || b.leads - a.leads);
  return {volume: volume[0] || null, paid: paid[0] || null, conversion: conversion[0] || null};
}

export function renderPortfolio({m, filters, state, callCenter, ui}) {
  const {esc, icon, btn, chip, heading, metric, panel, table, td, row, pct, num, money, propertyTable, sourceBars} = ui;
  const sources = sourceMetrics(filters, state), leaders = marketingLeaders(sources);
  const month = Number(filters.month) === 10 ? 'October' : 'September';
  const section = (id, index, title, description, content, action) => `<section class="overview-section" aria-labelledby="overview-${id}"><header class="overview-section-head"><span class="overview-index" aria-hidden="true">${index}</span><div><h2 id="overview-${id}">${title}</h2><p>${description}</p></div>${action || ''}</header>${content}</section>`;
  const open = (label, route) => btn(label + ' ' + icon('arrow', 13), 'navigate', `data-route="${route}"`, 'ghost');
  const conversions = stageConversions(m);
  const flow = `<div class="leasing-flow" aria-label="Leasing stages and conversion rates">${leasingStages(m).map((stage, i) => {
    const transition = conversions[i];
    return `<button type="button" class="stage-card flow-stage" data-action="drill-stage" data-stage="${stage.id}" aria-label="${stage.label}: ${stage.count}. View records"><span>${stage.label}</span><strong>${num(stage.count)}</strong><small>View records ${icon('arrow', 13)}</small></button>`
      + (transition ? `<div class="stage-transition" role="group" aria-label="${transition.from.label} to ${transition.to.label}: ${conversionLabel(transition.rate)}${transition.rate === null ? ', no records in the previous stage' : ''}"><span class="transition-line" aria-hidden="true">${icon('arrow', 15)}</span><strong class="conversion-rate">${conversionLabel(transition.rate)}</strong><small class="conversion-count">${num(transition.to.count)} / ${num(transition.from.count)}</small><span class="conversion-caption">${transition.from.label} → ${transition.to.label}</span></div>` : '');
  }).join('')}</div>`;
  const snapshot = `<div class="metrics">${metric('Properties', num(m.properties.length), 'In the selected portfolio', 'building')}${metric('Total homes', num(m.homes), `${num(m.occupied)} currently occupied`, 'people')}${metric('Portfolio occupancy', m.homes ? pct(m.occupied, m.homes) : '—', 'Current property snapshot', 'building')}${metric('Vacant homes', num(m.homes - m.occupied), 'Total homes minus occupied homes', 'target')}</div>`
    + panel('Property performance', 'Compare communities and drill into the records behind each result.', propertyTable(m), open('View properties', 'properties'), 'full');
  const leasing = `<div class="leasing-flow-context"><span>${chip(month + ' enquiry cohort', 'info')}</span><span>Stage-to-stage conversion</span></div>` + flow
    + `<div class="leasing-flow-summary"><div><span class="summary-symbol">${icon('target', 19)}</span><span><strong>${conversionLabel(m.leads.length ? m.leases / m.leads.length * 100 : null)}</strong> overall enquiry-to-lease conversion<small>${num(m.leases)} signed leases from ${num(m.leads.length)} enquiries</small></span></div><p>Each connector shows the next stage ÷ the previous stage.<br>Same enquiry cohort · outcomes through Nov 13, 2026.</p></div>`;
  const winner = (label, source, value, detail, symbol) => `<article class="channel-highlight"><div class="metric-title">${label}${icon(symbol)}</div><strong class="channel-value">${source ? value : '—'}</strong><h3>${source ? esc(source.name) : 'No qualifying source'}</h3><p>${source ? detail : 'No signed leases in the current selection.'}</p></article>`;
  const highlights = `<div class="channel-highlights">${winner('Most signed leases', leaders.volume, leaders.volume?.leases, `${leaders.volume?.leads || 0} enquiries · ${m.leases ? pct(leaders.volume?.leases || 0, m.leases) : '—'} of leases`, 'check')}${winner('Lowest paid cost per lease', leaders.paid, leaders.paid ? money(leaders.paid.spend / leaders.paid.leases) : '—', `${leaders.paid?.leases || 0} leases · ${money(leaders.paid?.spend || 0)} ad spend`, 'chart')}${winner('Highest lead-to-lease rate', leaders.conversion, leaders.conversion ? pct(leaders.conversion.leases, leaders.conversion.leads) : '—', `${leaders.conversion?.leases || 0} leases / ${leaders.conversion?.leads || 0} enquiries · consider sample size`, 'target')}</div>`;
  const rankedSources = [...sources].sort((a, b) => b.leases - a.leases || b.leads - a.leads);
  const channelRows = rankedSources.map(s => `<tr>${td(`<span class="dot" style="background:${s.color}"></span><strong>${esc(s.name)}</strong><small>${s.paid ? 'Paid media' : 'No ad spend allocated'}</small>`)}${td(num(s.leads), true)}${td(num(s.leases), true)}${td(s.leads ? pct(s.leases, s.leads) : '—', true)}${td(s.paid && s.leases ? money(s.spend / s.leases) : '—', true)}</tr>`);
  const marketing = highlights + `<div class="grid equal">${panel('Sources delivering leases', 'Original source credit for the selected enquiry cohort.', sourceBars(rankedSources))}${panel('Channel performance', `${money(m.spend)} advertising spend · CAD · paid costs only`, table(['Source', '#Enquiries', '#Leases', '#Conversion', '#Ad spend / lease'], channelRows), open('Compare sources', 'attribution/sources'))}</div>`;
  const reputation = `<div class="metrics">${metric('Average rating', m.reviews.length ? m.rating.toFixed(2) + ' / 5' : '—', `${num(m.reviews.length)} reviews in this period`, 'star')}${metric('Response rate', m.reviews.length ? pct(m.answered, m.reviews.length) : '—', `${num(m.answered)} reviews answered`, 'check')}${metric('Awaiting response', num(m.open), 'Open resident reviews', 'message')}${metric('Overdue reviews', num(m.overdue), 'Unanswered · over 48 hours', 'clock')}</div>`
    + `<div class="grid equal">${panel('Resident experience priorities', 'Close the loop with residents and give each response an owner.', `<div class="attention"><div class="eyebrow">Response queue</div><h3>${num(m.overdue)} reviews need a timely response</h3><p>${num(m.open)} reviews are open across the selected properties.</p>${open('Open review inbox', 'reputation/inbox')}</div>${row('Reviews answered', `${num(m.answered)} / ${num(m.reviews.length)}`)}`)}${panel('Property response ownership', 'Open a property’s review queue.', m.properties.map(p => {const a = metrics({...filters, property: p.id}, state);return `<div class="row"><div><strong>${esc(p.name)}</strong><small>${esc(p.owner)} · ${a.overdue} overdue</small></div>${btn(a.open + ' open ' + icon('arrow', 12), 'scope', `data-id="${p.id}" data-route="reputation/inbox"`, 'secondary small')}</div>`;}).join(''))}</div>`;
  return heading('One portfolio. A clearer picture.', 'From portfolio health to every leasing conversation.', btn(icon('play', 14) + ' Guided demo', 'demo', '', 'secondary'), 'Portfolio intelligence')
    + section('portfolio', '01', 'Portfolio Overview', 'Your communities, homes and occupancy at a glance.', snapshot, open('Action centre', 'actions'))
    + section('leasing', '02', 'Leasing Overview', 'Follow every enquiry through to a signed lease.', leasing, open('Open Lead to Lease', 'pipeline'))
    + section('marketing', '03', 'Marketing Overview', 'See which channels drive volume, conversion and paid efficiency.', marketing, open('Marketing Intelligence', 'attribution'))
    + section('call-center', '04', 'Call Center Overview', 'Answer demand and turn conversations into tours.', callCenter.summary({embedded: true}), open('Open Call Center', 'call-center'))
    + section('reputation', '05', 'Online Reputation Overview', 'Understand resident feedback and focus your response efforts.', reputation, open('Online reputation', 'reputation'));
}
