import {properties} from './model.mjs';
import {seedCompetitors,restoreCompetitors,saveCompetitor,removeCompetitor,competitorSummary,propertyLifetimeRating} from './competitors-model.mjs';

export function createCompetitorWorkspace({esc,btn,panel,table,td,propertyLink,openDialog,render,toast}){
  const KEY='mf-hub-competitors-v1';let data=seedCompetitors(),storage=true;
  try{data=restoreCompetitors(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{storage=false;}
  const rating=n=>n===null?'Not entered':n.toFixed(1)+' / 5';
  function commit(change){const before=structuredClone(data);try{change();localStorage.setItem(KEY,JSON.stringify(data));storage=true;}catch(error){data=before;storage=false;throw Error('Could not save competitors. Check browser storage and try again. '+error.message);}}
  function view(selected){
    const rows=selected.map(p=>{const list=data.properties[p.id]||[],s=competitorSummary(list),own=propertyLifetimeRating(p.id),gap=s.average===null?null:own-s.average;
      return `<tr>${td(propertyLink(p))}${td(rating(own),true)}${td(`<strong>${s.count} competitor${s.count===1?'':'s'}</strong><small>${s.count?esc(list.slice(0,2).map(c=>c.name).join(', '))+(s.count>2?` + ${s.count-2} more`:''):'Build your local comparison set'}</small>`)}${td(s.average===null?'—':s.average.toFixed(2)+' / 5'+`<small>${s.rated} of ${s.count} rated</small>`,true)}${td(gap===null?'—':`${gap>0?'+':''}${gap.toFixed(2)}`,true)}${td(`<div class="competitor-table-actions">${btn('Manage competitors','competitor-manage',`data-property="${p.id}" aria-label="Manage competitors for ${esc(p.name)}"`,'secondary small')}${btn('Create task','task',`data-key="benchmark-${p.id}" data-property="${p.id}" data-title="Review local reputation benchmark for ${esc(p.name)}"`,'ghost small')}</div>`)}</tr>`;
    });
    return `<div class="insight"><span>Add five or more custom competitors to each property. Ratings are manually entered snapshots; existing sample entries are labelled in the manager. Comparisons are independent of the reporting period.</span></div>${panel('Local reputation benchmark','Your own competitor set for every property. The average gives equal weight to each competitor with a rating.',rows.length?table(['Your property','#Lifetime rating','Competitors','#Competitor average','#Your rating − average','Action'],rows):'<div class="empty"><h3>No properties match your filters</h3><p>Clear a property, city or management-company filter to manage competitors.</p></div>')}<p class="footnote">Your property lifetime ratings are fictional demo snapshots. Custom competitors are saved in this browser.${!storage?' Browser storage is unavailable; saving may fail.':''}</p>`;
  }
  function manage(property,editId=''){
    const p=properties.find(p=>p.id===property);if(!p)throw Error('Property not found.');
    const list=data.properties[property],current=editId?list.find(c=>c.id===editId):null;
    if(editId&&!current)throw Error('Competitor not found.');
    const c=current||{name:'',url:'',rating:null,reviews:null};
    openDialog('Manage competitors',esc(p.name)+' · '+list.length+' competitors',`<div class="competitor-manager"><p class="small">Add five or more competitors for this property. Optional ratings and review counts are entered manually; links do not fetch live data.</p><div class="competitor-list">${list.length?list.map(item=>`<div class="competitor-row"><div class="competitor-description"><strong>${esc(item.name)}</strong><small>${item.sample?'Fictional sample':'Manual entry'} · ${rating(item.rating)} · ${item.reviews===null?'Review count not entered':item.reviews.toLocaleString('en-CA')+' reviews'}</small>${item.url?`<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open website / review page ↗</a>`:''}</div><div class="competitor-actions">${btn('Edit','competitor-edit',`data-property="${property}" data-id="${esc(item.id)}" aria-label="Edit ${esc(item.name)}"`,'secondary small')}${btn('Remove','competitor-remove',`data-property="${property}" data-id="${esc(item.id)}" aria-label="Remove ${esc(item.name)}"`,'secondary small')}</div></div>`).join(''):'<p class="competitor-empty">No competitors yet. Add your first one below.</p>'}</div><form id="competitor-form" data-property="${property}" data-id="${esc(editId)}"><h3>${current?'Edit competitor':'Add a custom competitor'}</h3><div class="competitor-fields"><div class="field competitor-wide"><label for="competitor-name">Competitor name *</label><input id="competitor-name" name="name" maxlength="120" required value="${esc(c.name)}" placeholder="e.g. Lakeview Apartments"></div><div class="field"><label for="competitor-rating">Lifetime rating (optional)</label><input id="competitor-rating" name="rating" type="number" min="1" max="5" step="any" inputmode="decimal" value="${c.rating??''}" placeholder="1–5"></div><div class="field"><label for="competitor-reviews">Review count (optional)</label><input id="competitor-reviews" name="reviews" type="number" min="0" step="1" inputmode="numeric" value="${c.reviews??''}" placeholder="e.g. 125"></div><div class="field competitor-wide"><label for="competitor-url">Website or review page (optional)</label><input id="competitor-url" name="url" type="url" maxlength="2048" value="${esc(c.url)}" placeholder="https://…"></div></div><p id="competitor-error" class="competitor-error" role="alert" tabindex="-1"></p><div class="dialog-actions">${current?btn('Cancel edit','competitor-manage',`data-property="${property}"`,'secondary'):''}<button class="btn" type="submit">${current?'Save changes':'Add competitor'}</button></div></form><p class="footnote">Saved for this property in this browser. No five-competitor limit.</p></div>`);
    if(current)document.getElementById('competitor-name')?.focus();
  }
  function action(b){
    const {action,property,id}=b.dataset;if(!action.startsWith('competitor-'))return false;
    if(action==='competitor-manage')manage(property);
    else if(action==='competitor-edit')manage(property,id);
    else if(action==='competitor-remove'){
      const c=data.properties[property]?.find(c=>c.id===id);if(!c)throw Error('Competitor not found.');
      openDialog('Remove competitor?',esc(properties.find(p=>p.id===property)?.name||''),`<p class="small">Remove <strong>${esc(c.name)}</strong> from this property’s comparison set?</p><div class="dialog-actions">${btn('Keep competitor','competitor-manage',`data-property="${property}"`,'secondary')}${btn('Remove competitor','competitor-confirm-remove',`data-property="${property}" data-id="${esc(id)}"`,'danger')}</div>`);
    }else if(action==='competitor-confirm-remove'){commit(()=>removeCompetitor(data,property,id));render();manage(property);toast('Competitor removed from this property.');}
    return true;
  }
  function submit(e){
    if(e.target.id!=='competitor-form')return false;e.preventDefault();
    const {property,id}=e.target.dataset;
    try{const input=Object.fromEntries(new FormData(e.target));cleanAndSave(property,input,id);render();manage(property);toast(id?'Competitor updated.':'Competitor added. You can add another below.');document.getElementById('competitor-name')?.focus();}
    catch(error){const el=document.getElementById('competitor-error');el.textContent=error.message;el.focus();}
    return true;
  }
  function cleanAndSave(property,input,id){
    // Validate before attempting storage so form errors remain specific.
    const draft=structuredClone(data);saveCompetitor(draft,property,input,id);commit(()=>{data=draft;});
  }
  function reset(){commit(()=>{data=seedCompetitors();});}
  return {view,action,submit,reset};
}
