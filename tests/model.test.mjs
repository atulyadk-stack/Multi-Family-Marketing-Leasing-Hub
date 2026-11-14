import test from 'node:test';
import assert from 'node:assert/strict';
import {properties,leads,reviews,defaultState,restoreState,metrics,sourceMetrics,respond,bookTour,createTask,csv,percentile} from '../dist/model.mjs';

test('October portfolio and source reports reconcile to the agreed design data',()=>{
 const m=metrics({month:10});
 assert.equal(m.homes,1000);assert.equal(m.occupied,947);assert.equal(m.leads.length,240);assert.equal(m.scheduled,100);assert.equal(m.toured,72);assert.equal(m.applied,32);assert.equal(m.leases,18);assert.equal(m.spend,18000);assert.equal(m.paidLeads,180);assert.equal(m.paidLeases,14);assert.equal(m.p75,24);
 assert.equal(m.reviews.length,240);assert.equal(m.rating,1000/240);assert.equal(m.answered,216);assert.equal(m.open,24);assert.equal(m.overdue,9);
 const ss=sourceMetrics({month:10});for(const [metric,expected] of [['leads',240],['scheduled',100],['toured',72],['applied',32],['leases',18],['spend',18000]])assert.equal(ss.reduce((n,s)=>n+s[metric],0),expected);
});
test('every prospect follows cumulative milestones, with outcomes inside the as-of date',()=>{
 for(const l of leads){assert.ok(!l.leased||l.applied);assert.ok(!l.applied||l.toured);assert.ok(!l.toured||l.scheduled);if(l.leased){assert.ok(l.leaseDate>l.created);assert.ok(l.leaseDate<='2026-11-13');}}
});
test('property, company and city scopes reconcile, including empty intersections',()=>{
 const total=properties.map(p=>metrics({property:p.id,month:10}));assert.equal(total.reduce((n,m)=>n+m.leases,0),18);assert.equal(total.reduce((n,m)=>n+m.spend,0),18000);
 assert.equal(metrics({pmc:'Harbour Management',month:10}).leads.length,140);assert.equal(metrics({city:'Toronto',month:10}).leases,9);
 const empty=metrics({property:'north',city:'Oakville',month:10});assert.equal(empty.leads.length,0);assert.equal(empty.rating,0);assert.equal(empty.p75,null);
 assert.equal(metrics({month:9}).leads.length,228);assert.equal(metrics({month:9}).leases,14);
});
test('a review response updates the matching period and property exactly once',()=>{
 const s=defaultState(),id=reviews.find(r=>r.month===10&&r.property==='north'&&!r.answered).id;
 respond(s,id,'Thank you. Our team will follow up.');assert.equal(metrics({month:10},s).open,23);assert.equal(metrics({month:10},s).answered,217);assert.equal(metrics({month:10,property:'north'},s).overdue,5);assert.equal(metrics({month:9},s).open,24);
 assert.throws(()=>respond(s,id,'Duplicate'));assert.equal(metrics({month:10},s).answered,217);assert.throws(()=>respond(s,'missing','text'));assert.equal(s.activity.length,1);
});
test('booking a sample tour changes only the scheduled milestone and is idempotent',()=>{
 const s=defaultState(),l=leads.find(l=>l.month===10&&!l.scheduled);assert.equal(bookTour(s,l.id),true);assert.equal(metrics({month:10},s).scheduled,101);assert.equal(metrics({month:10},s).toured,72);assert.equal(metrics({month:10},s).leases,18);assert.equal(bookTour(s,l.id),false);assert.equal(metrics({month:10},s).scheduled,101);
});
test('open tasks deduplicate while completed tasks permit a new follow-up',()=>{
 const s=defaultState(),input={key:'follow-up',title:'Review response backlog',property:'north'};const a=createTask(s,input),b=createTask(s,input);assert.equal(a.id,b.id);assert.equal(s.tasks.length,1);a.status='Done';createTask(s,input);assert.equal(s.tasks.length,2);
});
test('safe state defaults, percentile edge cases and CSV escaping',()=>{
 assert.equal(restoreState({version:1,tasks:'invalid',brand:7}).brand,'Summit Living');assert.deepEqual(restoreState({version:1,tasks:'invalid'}).tasks,[]);assert.equal(percentile([], .75),null);assert.equal(percentile([5,8,10,12],.75),10);
 assert.equal(csv([['=1+1','a"b','line\nbreak']]),'"\'=1+1","a""b","line\nbreak"');
});
