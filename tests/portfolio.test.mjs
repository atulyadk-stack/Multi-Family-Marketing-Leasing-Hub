import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState, metrics, properties, leads, bookTour} from '../dist/model.mjs';
import {stageConversions, conversionLabel, marketingLeaders} from '../dist/portfolio.mjs';

test('stage conversion uses adjacent milestones in each filtered cohort', () => {
  const state = defaultState();
  const displayed = stageConversions(metrics({month:10}, state)).map(t => conversionLabel(t.rate));
  assert.deepEqual(displayed, ['41.7%', '72.0%', '44.4%', '56.3%']);
  for (const month of [9, 10]) for (const property of ['all', ...properties.map(p => p.id)]) {
    const m = metrics({month, property}, state), values = [m.leads.length, m.scheduled, m.toured, m.applied, m.leases];
    stageConversions(m).forEach((t, i) => {
      assert.equal(t.from.count, values[i]); assert.equal(t.to.count, values[i + 1]);
      assert.equal(t.rate, values[i] ? values[i + 1] / values[i] * 100 : null);
    });
  }
  const empty = metrics({month:10,property:'north',city:'Oakville'}, state);
  assert.ok(stageConversions(empty).every(t => t.rate === null));
  assert.equal(conversionLabel(null), '—'); assert.equal(conversionLabel(0), '0.0%');
  const lead = leads.find(l => l.month === 10 && !l.scheduled), before = metrics({month:10}, state);
  bookTour(state, lead.id);
  const after = stageConversions(metrics({month:10}, state));
  assert.equal(after[0].rate, (before.scheduled + 1) / before.leads.length * 100);
  assert.equal(after[1].rate, before.toured / (before.scheduled + 1) * 100);
});

test('marketing highlights distinguish volume, paid efficiency and conversion', () => {
  const data = [
    {name:'Volume',leases:10,leads:100,paid:true,spend:10000},
    {name:'Efficient paid',leases:5,leads:50,paid:true,spend:1000},
    {name:'Organic',leases:2,leads:5,paid:false,spend:0},
    {name:'No outcomes',leases:0,leads:0,paid:true,spend:50}
  ];
  const best = marketingLeaders(data);
  assert.equal(best.volume.name,'Volume'); assert.equal(best.paid.name,'Efficient paid');
  assert.equal(best.conversion.name,'Organic');
  assert.deepEqual(marketingLeaders([]), {volume:null,paid:null,conversion:null});
});
