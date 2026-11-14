import {leads,properties,addDays} from './model.mjs';

// Separate acquisition events from calls, messages and leasing milestones.
// Demonstration data only: no browser tracking or provider collection is enabled.
export const marketingSnapshot='2026-11-13';
export const marketingChannels=[
 {id:'google',name:'Google',group:'Search',color:'#3765a3'},
 {id:'apartments',name:'Apartments.com',group:'ILS',color:'#367348'},
 {id:'facebook',name:'Facebook',group:'Social',color:'#435aa5'},
 {id:'instagram',name:'Instagram',group:'Social',color:'#965f88'},
 {id:'direct',name:'Direct / referral',group:'Direct',color:'#6c608d'},
 {id:'unknown',name:'Unknown source',group:'Unknown',color:'#677785'}
];
export const marketingChannel=id=>marketingChannels.find(c=>c.id===id);
const originalChannel=source=>({google:'google',organic:'google',ils:'apartments',meta:'facebook',direct:'direct',unknown:'unknown'})[source]||'unknown';
const mediumFor=channel=>({google:'paid_search',apartments:'listing_referral',facebook:'paid_social',instagram:'organic_social',direct:'direct_or_referral',unknown:'unknown'})[channel];

export function seededMarketingTouches(id){
 const lead=leads.find(l=>l.id===id);if(!lead)return [];
 const primary=originalChannel(lead.source),property=properties.find(p=>p.id===lead.property);
 // Six distinct sample events spanning roughly seven months (eight calendar months).
 // Charlie Ross (L236): Google 2, Apartments.com 3, Facebook 1.
 const path=[primary,'apartments','facebook','apartments','apartments',primary];
 return [-210,-168,-126,-84,-42,0].map((offset,i)=>{
  const channel=path[i],day=addDays(lead.created,offset),eventType=i===5?'Enquiry submitted':channel==='apartments'?'Website referral':'Website visit';
  return {id:`MKT-${id}-${i+1}`,provider:'demo',externalId:`${id}-touch-${i+1}`,contactId:'P-'+id,leadId:id,property:lead.property,channel,at:day+'T15:00:00.000Z',eventType,medium:channel==='google'&&lead.source==='organic'?'organic_search':mediumFor(channel),campaign:`${Number(day.slice(5,7))<6?'Spring discovery':Number(day.slice(5,7))<9?'Summer availability':'Fall leasing'} · ${property.code}`,landingPage:'/property-websites/'+lead.property,capture:i===5?'Demo lead form':channel==='apartments'?'Demo tagged listing referral':'Demo website session',linkMethod:'Sample contact ID link',linked:true,demo:true};
 });
}

export function validMarketingRange({from='',to=''}={}){
 const valid=d=>!d||/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 return valid(from)&&valid(to)&&(!from||!to||from<=to);
}

export function selectMarketingTouches(events,{contactId,property,channel='all',from='',to=''}={}){
 if(!contactId||!property||!validMarketingRange({from,to}))return [];
 const seen=new Set();
 return events.filter(event=>{
  if(!event||event.linked!==true||event.contactId!==contactId||event.property!==property||!marketingChannel(event.channel)||!event.id||!Number.isFinite(Date.parse(event.at)))return false;
  const date=new Date(event.at).toISOString().slice(0,10);
  if(channel!=='all'&&event.channel!==channel||from&&date<from||to&&date>to)return false;
  const key=event.provider&&event.externalId?`${event.provider}:${event.externalId}`:event.id;
  if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
}

export function marketingHistory(id,options={}){
 const lead=leads.find(l=>l.id===id);if(!lead)return [];
 return selectMarketingTouches(seededMarketingTouches(id),{...options,contactId:'P-'+id,property:lead.property});
}

export function summarizeMarketingTouches(events){
 const ordered=[...events].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
 const channels=marketingChannels.map(channel=>{
  const touches=ordered.filter(e=>e.channel===channel.id);
  return {...channel,count:touches.length,first:touches[0]||null,last:touches.at(-1)||null,repeats:Math.max(0,touches.length-1)};
 }).filter(c=>c.count).sort((a,b)=>b.count-a.count||a.first.at.localeCompare(b.first.at)||a.name.localeCompare(b.name));
 return {total:ordered.length,channels,channelCount:channels.length,repeats:ordered.length-channels.length,first:ordered[0]||null,last:ordered.at(-1)||null};
}

export function marketingExportRows(events){
 return [['Touchpoint ID','Contact ID','Enquiry ID','Property ID','Marketing channel','Date UTC','Activity','Medium','Campaign','Landing page','Captured via','Identity link','Data status'],...events.map(e=>[e.id,e.contactId,e.leadId,e.property,marketingChannel(e.channel)?.name||'Unknown source',e.at,e.eventType,e.medium,e.campaign,e.landingPage,e.capture,e.linkMethod,e.demo?'Fictional demo':'Recorded'])];
}
