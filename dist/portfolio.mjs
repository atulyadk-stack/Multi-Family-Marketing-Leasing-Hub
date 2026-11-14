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
  const reviewLink = (label, status, property, owner) => btn(label, 'review-drill', `data-status="${status}" ${property ? `data-property="${property}"` : ''} ${owner ? `data-owner="${esc(owner)}"` : ''}`, 'ghost touch-link');
  const sourceLink = (label, source, view = 'sources', stage = 'all') => btn(label, 'source-drill', `data-source="${source}" data-view="${view}" data-stage="${stage}"`, 'ghost touch-link');
  const conversions = stageConversions(m);
  const flow = `<div class="leasing-flow" aria-label="Leasing stages and conversion rates">${leasingStages(m).map((stage, i) => {
    const transition = conversions[i];
    return `<button type="button" class="stage-card flow-stage" data-action="drill-stage" data-stage="${stage.id}" aria-label="${stage.label}: ${stage.count}. View records"><span>${stage.label}</span><strong>${num(stage.count)}</strong><small>View records ${icon('arrow', 13)}</small></button>`
      + (transition ? `<button type="button" class="stage-transition" data-action="conversion-drill" data-stage="${transition.to.id}" aria-label="${transition.from.label} to ${transition.to.label}: ${conversionLabel(transition.rate)}. Open conversion details"><span class="transition-line" aria-hidden="true">${icon('arrow', 15)}</span><strong class="conversion-rate">${conversionLabel(transition.rate)}</strong><small class="conversion-count">${num(transition.to.count)} / ${num(transition.from.count)}</small><span class="conversion-caption">${transition.from.label} → ${transition.to.label}</span></button>` : '');
  }).join('')}</div>`;
  const snapshot = `<div class="metrics">${metric('Properties', num(m.properties.length), 'In the selected portfolio', 'building', 'navigate', 'data-route="properties"')}${metric('Total homes', num(m.homes), `${num(m.occupied)} currently occupied`, 'people', 'inventory-drill', 'data-measure="homes"')}${metric('Portfolio occupancy', m.homes ? pct(m.occupied, m.homes) : '—', 'Current property snapshot', 'building', 'inventory-drill', 'data-measure="occupancy"')}${metric('Vacant homes', num(m.homes - m.occupied), 'Total homes minus occupied homes', 'target', 'inventory-drill', 'data-measure="vacant"')}</div>`
    + panel('Property performance', 'Compare communities and drill into the records behind each result.', propertyTable(m), open('View properties', 'properties'), 'full');
  const leasing = `<div class="leasing-flow-context"><span>${chip(month + ' enquiry cohort', 'info')}</span><span>Stage-to-stage conversion</span></div>` + flow
    + `<button type="button" class="leasing-flow-summary" data-action="conversion-drill" data-stage="overall" aria-label="Open overall enquiry-to-lease conversion details"><span class="leasing-summary-main"><span class="summary-symbol">${icon('target', 19)}</span><span><strong>${conversionLabel(m.leads.length ? m.leases / m.leads.length * 100 : null)}</strong> overall enquiry-to-lease conversion<small>${num(m.leases)} signed leases from ${num(m.leads.length)} enquiries</small></span></span><span class="leasing-summary-note">Each connector shows the next stage ÷ the previous stage.<br>Same enquiry cohort · outcomes through Nov 13, 2026.</span></button>`;
  const winner = (label, source, value, detail, symbol) => `<button type="button" class="channel-highlight" data-action="source-drill" data-source="${source?.id || 'all'}" data-view="${symbol === 'check' ? 'journeys' : 'sources'}" data-stage="${symbol === 'check' ? 'leased' : 'all'}" aria-label="${label}: ${source ? esc(source.name) : 'No qualifying source'}. Open source details"><span class="metric-title">${label}${icon(symbol)}</span><strong class="channel-value">${source ? value : '—'}</strong><span class="channel-name">${source ? esc(source.name) : 'No qualifying source'}</span><span class="channel-detail">${source ? detail : 'No signed leases in the current selection.'}</span><span class="touch-hint">Explore source ${icon('arrow', 12)}</span></button>`;
  const highlights = `<div class="channel-highlights">${winner('Most signed leases', leaders.volume, leaders.volume?.leases, `${leaders.volume?.leads || 0} enquiries · ${m.leases ? pct(leaders.volume?.leases || 0, m.leases) : '—'} of leases`, 'check')}${winner('Lowest paid cost per lease', leaders.paid, leaders.paid ? money(leaders.paid.spend / leaders.paid.leases) : '—', `${leaders.paid?.leases || 0} leases · ${money(leaders.paid?.spend || 0)} ad spend`, 'chart')}${winner('Highest lead-to-lease rate', leaders.conversion, leaders.conversion ? pct(leaders.conversion.leases, leaders.conversion.leads) : '—', `${leaders.conversion?.leases || 0} leases / ${leaders.conversion?.leads || 0} enquiries · consider sample size`, 'target')}</div>`;
  const rankedSources = [...sources].sort((a, b) => b.leases - a.leases || b.leads - a.leads);
  const channelRows = rankedSources.map(s => `<tr>${td(sourceLink(`<span class="dot" style="background:${s.color}"></span>${esc(s.name)}`, s.id) + `<small>${s.paid ? 'Paid media' : 'No ad spend allocated'}</small>`)}${td(sourceLink(num(s.leads), s.id, 'journeys', 'all'), true)}${td(sourceLink(num(s.leases), s.id, 'journeys', 'leased'), true)}${td(sourceLink(s.leads ? pct(s.leases, s.leads) : '—', s.id), true)}${td(sourceLink(s.paid && s.leases ? money(s.spend / s.leases) : '—', s.id), true)}</tr>`);
  const marketing = highlights + `<div class="grid equal">${panel('Sources delivering leases', 'Original source credit for the selected enquiry cohort.', sourceBars(rankedSources))}${panel('Channel performance', `${money(m.spend)} advertising spend · CAD · paid costs only`, table(['Source', '#Enquiries', '#Leases', '#Conversion', '#Ad spend / lease'], channelRows), open('Compare sources', 'attribution/sources'))}</div>`;
  const reputation = `<div class="metrics">${metric('Average rating', m.reviews.length ? m.rating.toFixed(2) + ' / 5' : '—', `${num(m.reviews.length)} reviews in this period`, 'star', 'review-drill', 'data-status="all"')}${metric('Response rate', m.reviews.length ? pct(m.answered, m.reviews.length) : '—', `${num(m.answered)} reviews answered`, 'check', 'review-drill', 'data-status="answered"')}${metric('Awaiting response', num(m.open), 'Open resident reviews', 'message', 'review-drill', 'data-status="open"')}${metric('Overdue reviews', num(m.overdue), 'Unanswered · over 48 hours', 'clock', 'review-drill', 'data-status="overdue"')}</div>`
    + `<div class="grid equal">${panel('Resident experience priorities', 'Close the loop with residents and give each response an owner.', `<div class="attention"><div class="eyebrow">Response queue</div><h3>${reviewLink(num(m.overdue) + ' reviews need a timely response', 'overdue')}</h3><p>${reviewLink(num(m.open) + ' reviews are open across the selected properties.', 'open')}</p>${reviewLink('Open review inbox ' + icon('arrow', 13), 'open')}</div><button type="button" class="row touch-row" data-action="review-drill" data-status="answered"><span>Reviews answered</span><strong>${num(m.answered)} / ${num(m.reviews.length)} ${icon('arrow', 12)}</strong></button>`)}${panel('Property response ownership', 'Open a property, owner or review queue.', m.properties.map(p => {const a = metrics({...filters, property: p.id}, state);return `<div class="row"><div>${btn(esc(p.name), 'property', `data-id="${p.id}"`, 'ghost touch-link')}<div class="owner-touchpoints">${reviewLink(esc(p.owner), 'all', p.id, p.owner)}<span aria-hidden="true">·</span>${reviewLink(a.overdue + ' overdue', 'overdue', p.id)}</div></div>${btn(a.open + ' open ' + icon('arrow', 12), 'review-drill', `data-status="open" data-property="${p.id}"`, 'secondary small')}</div>`;}).join(''))}</div>`;
  return heading('One portfolio. A clearer picture.', 'From portfolio health to every leasing conversation.', btn(icon('play', 14) + ' Guided demo', 'demo', '', 'secondary'), 'Portfolio intelligence')
    + section('portfolio', '01', 'Portfolio Overview', 'Your communities, homes and occupancy at a glance.', snapshot, open('Action centre', 'actions'))
    + section('leasing', '02', 'Leasing Overview', 'Follow every enquiry through to a signed lease.', leasing, open('Open Lead to Lease', 'pipeline'))
    + section('marketing', '03', 'Marketing Overview', 'See which channels drive volume, conversion and paid efficiency.', marketing, open('Marketing Intelligence', 'attribution'))
    + section('call-center', '04', 'Call Center Overview', 'Answer demand and turn conversations into tours.', callCenter.summary({embedded: true}), open('Open Call Center', 'call-center'))
    + section('reputation', '05', 'Online Reputation Overview', 'Understand resident feedback and focus your response efforts.', reputation, open('Online reputation', 'reputation'));
}
