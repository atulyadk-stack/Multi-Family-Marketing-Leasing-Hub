// A single preference shared by every card collection. Existing actions stay on
// the same DOM records; changing presentation never changes record selection.
const KEY = 'mf-hub-display-v1';
let preferences = {default: 'cards', sections: {}};
try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && ['cards','list'].includes(saved.default)) preferences = {default:saved.default, sections:saved.sections || {}}; } catch {}
export const displayMode = key => preferences.sections[key] || preferences.default;
export function setDisplayMode(key, mode) {
  if (!['cards','list'].includes(mode)) return;
  if (key === 'all') preferences = {default:mode, sections:{}};
  else preferences.sections[key] = mode;
  try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch {}
}
export function displaySwitch(key, label = 'Display', mode = displayMode(key)) {
  return `<div class="display-control" role="group" aria-label="${label} format"><span>${label}</span>${['cards','list'].map(v=>`<button type="button" data-action="display-view" data-display="${key}" data-view="${v}" aria-pressed="${mode===v}" class="display-button ${mode===v?'active':''}">${v==='cards'?'Cards':'List'}</button>`).join('')}</div>`;
}
const selectors = '.review-collection,.conversation-timeline,.touchpoint-timeline,.connection-grid,.channel-highlights,.leasing-flow,.metrics,.cc-kpis,.stage-grid,.dialog-metrics,.grid,.cards-3,.event-card-grid,.event-photos,.event-summary-stats,.touchpoint-summary-stats,.touchpoint-channel-grid,.portfolio-kpis,.portfolio-highlight-grid,.portfolio-marketing-highlights';
export function enhanceCollections(container, scope = 'page') {
  let index = 0;
  for (const group of container.querySelectorAll(selectors)) {
    if (group.dataset.displayReady || !group.children.length) continue;
    group.dataset.displayReady = 'true';
    const key = `${scope}-${index++}`;
    group.dataset.collection = key;
    const bar = document.createElement('div');
    bar.className = 'collection-toolbar';
    bar.innerHTML = displaySwitch(key, group.matches('.metrics,.cc-kpis,.stage-grid,.dialog-metrics,.event-summary-stats,.touchpoint-summary-stats') ? 'Summary view' : 'Section view');
    group.before(bar);
    group.classList.toggle('collection-list', displayMode(key) === 'list');
  }
}
