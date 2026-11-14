import {properties, records, csv} from './model.mjs';
import {callRecords, summarizeCalls, selectCalls, callExportRows, formatRate, formatTime, agentPerformance} from './call-center.mjs';
import {displayMode, displaySwitch} from './display-views.mjs';

const views = [['all','All calls'],['inbound','Incoming'],['outbound','Outgoing'],['answered','Answered inbound'],['abandoned','Abandoned'],['missed','Missed / voicemail'],['booked','Tour booked']];
const connected = c => ['Connected','Completed','Follow-up required'].includes(c.outcome);
export function createCallCenter({esc,icon,btn,chip,panel,heading,filters,getState,render,refreshProperty}) {
  let page = 0, propertyPage = 0, agent = 'all', propertyAgent = 'all', propertyView = 'all', activeProperty = null;
  const date = at => new Date(at).toLocaleString('en-CA',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  const callsFor = property => callRecords(property ? {...filters,property,pmc:'all',city:'all'} : filters,getState());
  const scoped = (calls, selectedAgent) => selectedAgent === 'all' ? calls : calls.filter(c=>c.agentId === selectedAgent);
  const selected = (property, view) => selectCalls(scoped(callsFor(property),property?propertyAgent:agent),view);
  const download = (rows, name) => {const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8;'}));link.href=url;link.download=name+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  function kpis(m, property) {
    const items = [
      ['Incoming calls',m.inbound,`${m.uniqueCallers} callers · ${m.outbound} outgoing`,'headset','inbound'],
      ['Answer rate',formatRate(m.answerRate),`${m.answered} / ${m.inbound} incoming answered`,'check','answered'],
      ['Abandonment rate',formatRate(m.abandonmentRate),`${m.abandoned} left before an answer`,'phone-off','abandoned'],
      ['Avg. speed to answer',formatTime(m.speedToAnswer),`${m.waitSamples} calls with queue timing`,'clock','answered'],
      ['Avg. handle time',formatTime(m.handleTime),`Talk + hold + wrap · ${m.handleSamples} calls`,'clock','handled'],
      ['Call-to-tour conversion',formatRate(m.tourRate),`${m.toursBooked} / ${m.answered} answered inbound`,'target','booked']
    ];
    return `<div class="cc-kpis">${items.map(([label,value,detail,symbol,view])=>`<button type="button" class="metric cc-kpi" data-action="${property?'cc-property-view':'navigate'}" ${property?`data-property="${property}" data-view="${view}"`:`data-route="call-center/${view}"`}><span class="metric-title">${label}${icon(symbol)}</span><span class="metric-value">${value}</span><span class="metric-detail">${detail}</span><span class="cc-card-link">View calls ${icon('arrow',12)}</span></button>`).join('')}</div>`;
  }
  function summary({embedded=false}={}) {
    const body=kpis(summarizeCalls(callsFor()))+'<p class="footnote">Fictional calls · Full phone history of the selected enquiry cohort.</p>';
    return embedded?body:panel('Call Center performance','Caller experience and tour bookings.',body,btn('Open Call Center →','navigate','data-route="call-center"','ghost'),'full cc-summary');
  }
  function table(headers,rows,label) {
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="${label}"><table class="cc-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function agents(calls,property) {
    const rows=agentPerformance(calls), known=rows.filter(a=>a.id!=='unassigned'), handledAgents=known.filter(a=>a.handled>0).length;
    const key='call-agents', mode=displayMode(key), data=property?`data-property="${property}"`:'';
    const open=a=>btn('View calls →','cc-agent',`${data} data-agent="${esc(a.id)}"`,'secondary small');
    const headingHtml=`<div class="cc-agent-summary"><span><strong>${handledAgents}</strong> agents handled calls</span><span><strong>${summarizeCalls(calls).handled}</strong> connected calls</span><span><strong>${rows.find(a=>a.id==='unassigned')?.calls.length||0}</strong> without an assigned agent</span></div>`;
    const list=table(['Agent / service','Total calls','Incoming','Outgoing','Handled','Missed / voicemail','Abandoned','Answer rate','Avg. talk','Avg. handle','Tours booked','Action'],rows.map(a=>`<tr><td><strong>${esc(a.name)}</strong><small>${esc(a.service)}</small></td><td>${a.calls.length}</td><td>${a.inbound}</td><td>${a.outbound}</td><td>${a.handled}</td><td>${a.missed}</td><td>${a.abandoned}</td><td>${formatRate(a.answerRate)}</td><td>${formatTime(a.averageTalk)}</td><td>${formatTime(a.handleTime)}</td><td>${a.toursBooked}</td><td>${open(a)}</td></tr>`),'Agent performance');
    const cards=`<div class="cc-agent-grid">${rows.map(a=>`<article class="cc-agent-card"><h3>${esc(a.name)}</h3><small>${esc(a.service)}</small><div class="cc-agent-facts">${[['Total calls',a.calls.length],['Incoming / outgoing',a.inbound+' / '+a.outbound],['Handled',a.handled],['Missed / voicemail',a.missed],['Abandoned',a.abandoned],['Answer rate',formatRate(a.answerRate)],['Avg. talk',formatTime(a.averageTalk)],['Avg. handle',formatTime(a.handleTime)],['Tours booked',a.toursBooked]].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div>${open(a)}</article>`).join('')}</div>`;
    return panel('Agent & service performance','See who handled calls and each agent’s results for this property or portfolio.',headingHtml+(rows.length?(mode==='list'?list:cards):'<p class="empty">No call activity in this cohort.</p>')+'<p class="footnote">Handled = connected incoming + outgoing calls. Missed and abandoned calls count against the recorded assignment, not as handled calls. Tours booked and answer rate use incoming calls. Missing historical assignments stay unassigned.</p>',displaySwitch(key,'Agent view')+btn('Export agents','cc-export-agents',data,'secondary small'),'full');
  }
  function activity(calls,view,property) {
    const currentAgent=property?propertyAgent:agent;
    const chosen=selectCalls(scoped(calls,currentAgent),view),size=12;
    let currentPage=Math.min(property?propertyPage:page,Math.max(0,Math.ceil(chosen.length/size)-1));
    if(property)propertyPage=currentPage;else page=currentPage;
    const visible=chosen.slice(currentPage*size,(currentPage+1)*size),data=property?`data-property="${property}"`:'';
    const key='call-activity',mode=displayMode(key);
    const history=c=>btn('Open history →','open-prospect',`data-id="${c.leadId}"`,'secondary small');
    const booked=c=>c.tourBooked===true?'Yes':c.tourBooked===false?'No':'Not recorded';
    const list=table(['Prospect / call','Property','Date & time','Direction','Outcome','Agent / service','Talk time','Queue wait','Tour booked','History'],visible.map(c=>`<tr><td>${btn(esc(c.name),'open-prospect',`data-id="${c.leadId}"`,'ghost')}<small>${esc(c.leadId)} · ${esc(c.id)}</small></td><td>${esc(c.propertyName)}</td><td>${date(c.at)}</td><td>${c.direction==='inbound'?'Incoming':'Outgoing'}</td><td>${chip(c.outcome||'Not recorded',connected(c)?'good':'warn')}</td><td>${esc(c.owner)}<small>${esc(c.service)}</small></td><td>${formatTime(c.duration)}</td><td>${formatTime(c.waitSeconds)}</td><td>${booked(c)}</td><td>${history(c)}</td></tr>`),'Call activity list');
    const cards=`<div class="cc-calls">${visible.map(c=>`<article class="cc-call"><div class="cc-call-head"><div>${btn(esc(c.name),'open-prospect',`data-id="${c.leadId}"`,'ghost')}<small>${esc(c.propertyName)} · ${c.leadId}</small></div>${chip(c.outcome||'Not recorded',connected(c)?'good':'warn')}</div><div class="cc-call-facts">${[['Direction',c.direction==='inbound'?'Incoming':'Outgoing'],['Talk time',formatTime(c.duration)],['Queue wait',formatTime(c.waitSeconds)],['Tour booked',booked(c)]].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><div class="cc-call-footer"><span>${esc(c.owner)}<small>${esc(c.service)} · ${date(c.at)}</small></span>${history(c)}</div><small class="cc-id">${esc(c.id)}</small></article>`).join('')}</div>`;
    const tabs=`<nav class="tabs cc-tabs" aria-label="Call activity filters">${views.map(([id,label])=>btn(label,property?'cc-property-view':'navigate',`${property?`${data} data-view="${id}"`:`data-route="call-center/${id}"`} ${view===id?'aria-current="page"':''}`,`tab ${view===id?'active':''}`)).join('')}${view==='handled'?'<span class="tab active">Connected calls</span>':''}</nav>`;
    const picker=`<label class="cc-agent-filter">Agent / service<select data-cc-agent ${data}><option value="all">All agents & services</option>${agentPerformance(calls).map(a=>`<option value="${esc(a.id)}" ${currentAgent===a.id?'selected':''}>${esc(a.name)} · ${esc(a.service)}</option>`).join('')}</select></label>`;
    const controls=`<div class="cc-activity-toolbar">${picker}${displaySwitch(key,'Call view')}${btn('Export calls','cc-export',`${data} data-view="${view}"`,'secondary small')}</div>`;
    return panel('Call activity',`${chosen.length} calls · Times shown in your local timezone. Export CSV includes this selection.`,tabs+controls+(visible.length?(mode==='list'?list:cards):'<div class="empty"><h3>No calls in this selection</h3><p>Choose another agent, call filter or reporting cohort.</p></div>')+`<div class="pagination"><span>${chosen.length?currentPage*size+1:0}–${Math.min(chosen.length,(currentPage+1)*size)} of ${chosen.length}</span><div>${btn('Previous','cc-page',`${data} data-delta="-1" ${currentPage===0?'disabled':''}`,'secondary small')}${btn('Next','cc-page',`${data} data-delta="1" ${(currentPage+1)*size>=chosen.length?'disabled':''}`,'secondary small')}</div></div>`,'','full');
  }
  function propertyDetails(id) {
    if(activeProperty!==id){activeProperty=id;propertyPage=0;propertyAgent='all';propertyView='all';}
    const calls=callsFor(id);
    return `<section class="cc-property-section" aria-label="Property Call Center"><h2>Call Center</h2><p class="footnote">This property · ${Number(filters.month)===9?'September':'October'} enquiry cohort · Fictional call records.</p>${kpis(summarizeCalls(calls),id)}${agents(calls,id)}${activity(calls,propertyView,id)}<div class="cc-detail-actions">${btn('Open property Call Center →','scope',`data-id="${id}" data-route="call-center"`,'secondary')}</div></section>`;
  }
  function dashboard(view='all') {
    if(![...views.map(v=>v[0]),'handled'].includes(view))view='all';
    const calls=callsFor(),m=summarizeCalls(calls);if(agent!=='all'&&!calls.some(c=>c.agentId===agent))agent='all';
    const propertyRows=records(filters,getState()).properties.map(p=>{const c=calls.filter(c=>c.property===p.id),a=summarizeCalls(c),n=agentPerformance(c).filter(x=>x.id!=='unassigned'&&x.handled>0).length;return `<tr><td>${btn(esc(p.name),'scope',`data-id="${p.id}" data-route="call-center"`,'ghost')}</td><td>${n}</td><td>${a.inbound}</td><td>${formatRate(a.answerRate)}</td><td>${a.toursBooked}</td><td>${btn('Property details','property',`data-id="${p.id}"`,'secondary small')}</td></tr>`;});
    return heading(filters.property==='all'?'Every call. A leasing opportunity.':properties.find(p=>p.id===filters.property)?.name+' · Call Center','Inspect property service, compare agents and open the full history behind every call.',btn('Portfolio overview','navigate','data-route="portfolio"','secondary'),'Call Center')
      +'<div class="insight">'+icon('headset')+'<span>Demo call analytics for the selected enquiry cohort, including its full call history. Live telephony is not connected. Agent and service assignments are fictional.</span></div>'
      +kpis(m)+panel('Property performance','Select a property to focus agent performance and call activity.',table(['Property','Agents handling calls','Incoming','Answer rate','Tours booked','Details'],propertyRows,'Property call performance'),'','full')
      +agents(calls)+activity(calls,view)
      +'<details class="panel cc-definitions"><summary>How these KPIs are calculated</summary><dl><dt>Incoming calls</dt><dd>Every inbound phone attempt in the selected enquiry cohort. Repeated calls remain separate calls.</dd><dt>Answer rate</dt><dd>Connected inbound calls divided by all inbound attempts.</dd><dt>Abandonment rate</dt><dd>Calls abandoned before an answer divided by inbound attempts.</dd><dt>Average speed to answer</dt><dd>Recorded queue wait averaged across answered inbound calls.</dd><dt>Average handle time</dt><dd>Talk + hold + wrap-up, using connected calls with all three durations recorded.</dd><dt>Call-to-tour conversion</dt><dd>Answered inbound calls explicitly booking a tour divided by answered inbound calls.</dd></dl><p class="footnote">Missing timing is excluded from averages and shown as —. A later tour alone does not attribute a booking to a call.</p></details>';
  }
  function refresh(property){if(property)refreshProperty(property);else render();}
  return {summary,dashboard,propertyDetails,resetPage(resetAgent=false){page=0;if(resetAgent)agent='all';},exportRows(view){return callExportRows(selected(null,view));},
    change(el){if(!el.hasAttribute('data-cc-agent'))return false;const property=el.dataset.property;if(property){propertyAgent=el.value;propertyPage=0;}else{agent=el.value;page=0;}refresh(property);return true;},
    action(b){const {action,property}=b.dataset;
      if(action==='cc-page'){if(property)propertyPage=Math.max(0,propertyPage+Number(b.dataset.delta));else page=Math.max(0,page+Number(b.dataset.delta));refresh(property);}
      else if(action==='cc-property-view'){propertyView=b.dataset.view;propertyPage=0;refresh(property);}
      else if(action==='cc-agent'){if(property){propertyAgent=b.dataset.agent;propertyPage=0;propertyView='all';}else{agent=b.dataset.agent;page=0;}refresh(property);document.querySelector(`${property?'#dialog':'#main'} [data-cc-agent]`)?.focus();}
      else if(action==='cc-export')download(callExportRows(selected(property,b.dataset.view)),'MF-Hub-call-activity');
      else if(action==='cc-export-agents')download([['Agent ID','Agent','Service','Total calls','Incoming','Outgoing','Handled','Missed / voicemail','Abandoned','Answer rate %','Average talk seconds','Average handle seconds','Inbound tours booked'],...agentPerformance(callsFor(property)).map(a=>[a.id,a.name,a.service,a.calls.length,a.inbound,a.outbound,a.handled,a.missed,a.abandoned,a.answerRate,a.averageTalk,a.handleTime,a.toursBooked])],'MF-Hub-agent-performance');
      else return false;return true;
    }
  };
}
