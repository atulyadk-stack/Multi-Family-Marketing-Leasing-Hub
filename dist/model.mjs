/** Deterministic fictional data. All displayed acquisition and review totals derive from these records. */
export const properties=[
 {id:'north',website:'/property-websites/north',demoWebsite:true,phone:'+1 416-555-0101',address:'100 Northpoint Way, Toronto, ON',code:'NP-001',name:'Northpoint Apartments',city:'Toronto',pmc:'Harbour Management',type:'Multifamily',homes:300,occupied:279,owner:'Maya Chen',stars:[4,10,9,12,25],answered:48,overdue:6,spend:[4200,1800,0,1200,0,0],sessions:5500,users:4500,engaged:3000,impressions:70000,clicks:1500,survey:[30,20,10]},
 {id:'river',website:'/property-websites/river',demoWebsite:true,phone:'+1 416-555-0102',address:'200 Rivergate Way, Mississauga, ON',code:'RG-002',name:'Rivergate Residences',city:'Mississauga',pmc:'Crest Management',type:'Multifamily',homes:250,occupied:242,owner:'Jordan Lee',stars:[2,3,4,9,52],answered:68,overdue:0,spend:[2400,1500,0,900,0,0],sessions:4200,users:3300,engaged:2600,impressions:45000,clicks:900,survey:[46,10,4]},
 {id:'cedar',website:'/property-websites/cedar',demoWebsite:true,phone:'+1 416-555-0103',address:'300 Cedar Court Way, Toronto, ON',code:'CC-003',name:'Cedar Court',city:'Toronto',pmc:'Harbour Management',type:'Multifamily',homes:300,occupied:288,owner:'Sam Patel',stars:[2,6,4,10,38],answered:55,overdue:2,spend:[1800,1500,0,900,0,0],sessions:3300,users:2600,engaged:2100,impressions:40000,clicks:800,survey:[44,12,4]},
 {id:'willow',website:'/property-websites/willow',demoWebsite:true,phone:'+1 416-555-0104',address:'400 Willow Commons Way, Oakville, ON',code:'WB-004',name:'Willow BTR',city:'Oakville',pmc:'Crest Management',type:'Build to rent',homes:150,occupied:138,owner:'Avery Wilson',stars:[4,1,7,13,25],answered:45,overdue:1,spend:[600,600,0,600,0,0],sessions:2000,users:1600,engaged:1300,impressions:25000,clicks:400,survey:[36,18,6]}
];
export const sources=[{id:'google',name:'Google Ads',paid:true,color:'#128d87'},{id:'ils',name:'ILS listings',paid:true,color:'#4978b5'},{id:'organic',name:'Organic search',paid:false,color:'#80b9a3'},{id:'meta',name:'Meta Ads',paid:true,color:'#9181bd'},{id:'direct',name:'Direct / referral',paid:false,color:'#bba079'},{id:'unknown',name:'Unknown source',paid:false,color:'#aab4bf'}];
const counts=[[40,20,15,10,4,1],[25,20,12,9,3,1],[15,14,12,6,2,1],[10,6,6,5,3,0]],scheduled=[[14,8,5,2,1,0],[13,9,5,4,1,0],[9,8,5,3,1,0],[4,3,3,1,1,0]],toured=[[10,4,3,1,0,0],[10,7,4,3,1,0],[7,7,3,2,1,0],[3,2,2,1,1,0]],applied=[[3,2,1,1,0,0],[5,3,2,1,1,0],[3,4,1,1,0,0],[1,1,1,0,1,0]],leased=[[2,1,1,0,0,0],[3,2,1,1,0,0],[1,3,1,0,0,0],[1,0,0,0,1,0]];
const durations=[5,8,10,12,14,15,16,18,19,20,21,22,23,24,24,27,31,34];
const first=['Alex','Taylor','Jamie','Morgan','Casey','Riley','Drew','Charlie','Cameron','Robin','Quinn','Skyler'],last=['Morgan','Park','Bennett','Reed','Clarke','Brooks','Rivera','Hayes','Ellis','Taylor','Shaw','Wells','James','Blake','Cole','Lane','Dean','Gray','Bell','Ross'];
const date=(month,day)=>`2026-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
export const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export const leads=[];
let serial=0;
for(const month of [9,10]){
 let leaseIndex=0;
 properties.forEach((p,pi)=>sources.forEach((source,si)=>{
  const count=counts[pi][si]-(month===9&&si<3?1:0);
  for(let i=0;i<count;i++){
   const isLease=i<leased[pi][si]-(month===9&&si===0?1:0),created=date(month,1+i%20),days=isLease?durations[leaseIndex++%durations.length]:null;
   serial++;leads.push({id:`L${serial}`,name:`${first[(serial-1)%first.length]} ${last[Math.floor((serial-1)/first.length)%last.length]}`,property:p.id,source:source.id,month,created,scheduled:i<scheduled[pi][si],toured:i<toured[pi][si],applied:i<applied[pi][si],leased:isLease,days,leaseDate:isLease?addDays(created,days):null});
  }
 }));
}
export const themes=['Maintenance','Leasing','Property team','Amenities','Community'];
const comments=[['The repair took longer than expected and I had to follow up twice. A clearer update would have helped.','The maintenance team arrived on time and explained the repair. Thank you for keeping us informed.'],['It was difficult to get a clear answer about tour availability. I would appreciate a call back.','The leasing team made our tour easy and answered all our questions. A welcoming first impression.'],['I am still waiting for an update from the office. Please make it easier to reach the right person.','The property team is friendly, thoughtful and quick to help. We feel at home here.'],['The shared space needs more attention. I hope the team can share a plan for improvements.','We enjoy the amenities and the common spaces are well cared for.'],['The noise in the evening has been frustrating. I would appreciate help resolving it.','We love the community atmosphere and getting to know our neighbours.']];
export const reviews=[];
for(const month of [9,10])properties.forEach((p,pi)=>{
 let n=0;const open=p.stars.reduce((a,b)=>a+b,0)-p.answered;
 p.stars.forEach((quantity,j)=>{for(let i=0;i<quantity;i++){
  const rating=j+1;reviews.push({id:`R${month}-${p.id}-${n+1}`,property:p.id,month,rating,topic:themes[n%5],platform:n%5===0?'ApartmentRatings':'Google',name:`${first[(n+pi)%12]} ${last[(n+pi)%20][0]}.`,date:date(month,1+n%28),text:comments[n%5][rating>=4?1:0],answered:n>=open,overdue:n<open&&n<p.overdue,owner:p.owner});n++;
 }});
});
export const defaultState=()=>({version:1,brand:'Summit Living',accent:'teal',responses:{},assignments:{},tasks:[],activity:[],listingFixes:[],tourBookings:[]});
export function restoreState(saved){const s=defaultState();if(saved?.version!==1)return s;for(const k of ['responses','assignments'])if(saved[k]&&typeof saved[k]==='object'&&!Array.isArray(saved[k]))s[k]=saved[k];for(const k of ['tasks','activity','listingFixes','tourBookings'])if(Array.isArray(saved[k]))s[k]=saved[k];if(typeof saved.brand==='string'&&saved.brand.trim())s.brand=saved.brand.slice(0,50);if(['teal','blue','purple'].includes(saved.accent))s.accent=saved.accent;return s;}
export const sum=(items,key)=>items.reduce((a,x)=>a+(Number(typeof key==='function'?key(x):key===undefined?x:x[key])||0),0);
export const ratio=(n,d)=>d?n/d:0;
export const selectedProperties=f=>properties.filter(p=>(!f.property||f.property==='all'||p.id===f.property)&&(!f.pmc||f.pmc==='all'||p.pmc===f.pmc)&&(!f.city||f.city==='all'||p.city===f.city));
export function records(f,s=defaultState()){const ps=selectedProperties(f),ids=new Set(ps.map(p=>p.id)),month=Number(f.month||10);return{properties:ps,leads:leads.filter(l=>ids.has(l.property)&&l.month===month).map(l=>({...l,scheduled:l.scheduled||s.tourBookings.includes(l.id)})),reviews:reviews.filter(r=>ids.has(r.property)&&r.month===month).map(r=>({...r,answered:r.answered||Boolean(s.responses[r.id]),response:s.responses[r.id]||null,owner:s.assignments[r.id]||r.owner}))};}
export const percentile=(xs,p)=>{const a=[...xs].sort((a,b)=>a-b);return a.length?a[Math.ceil(a.length*p)-1]:null;};
export function metrics(f,s=defaultState()){const d=records(f,s),ls=d.leads,rs=d.reviews,paid=ls.filter(l=>sources.find(src=>src.id===l.source).paid);return {...d,spend:sum(d.properties,p=>sum(p.spend))*(Number(f.month)===9?.92:1),homes:sum(d.properties,'homes'),occupied:sum(d.properties,'occupied'),leases:ls.filter(l=>l.leased).length,scheduled:ls.filter(l=>l.scheduled).length,toured:ls.filter(l=>l.toured).length,applied:ls.filter(l=>l.applied).length,paidLeads:paid.length,paidLeases:paid.filter(l=>l.leased).length,rating:ratio(sum(rs,'rating'),rs.length),answered:rs.filter(r=>r.answered).length,open:rs.filter(r=>!r.answered).length,overdue:rs.filter(r=>!r.answered&&r.overdue).length,p75:percentile(ls.filter(l=>l.leased).map(l=>l.days),.75)};}
export function sourceMetrics(f,s=defaultState()){const d=records(f,s);return sources.map((src,i)=>{const ls=d.leads.filter(l=>l.source===src.id);return {...src,leads:ls.length,scheduled:ls.filter(l=>l.scheduled).length,toured:ls.filter(l=>l.toured).length,applied:ls.filter(l=>l.applied).length,leases:ls.filter(l=>l.leased).length,spend:sum(d.properties,p=>p.spend[i])*(Number(f.month)===9?.92:1)};});}
export function respond(s,id,text){const r=reviews.find(r=>r.id===id);if(!r)throw new Error('Review not found.');if(!text.trim())throw new Error('Write a response first.');if(r.answered||s.responses[id])throw new Error('This review already has a response.');s.responses[id]=text.trim();s.activity.unshift({text:`Response completed for ${properties.find(p=>p.id===r.property).name}`,kind:'Review',time:new Date().toISOString()});}
export function createTask(s,{title,property='all',owner='Maya Chen',key}){const existing=s.tasks.find(t=>t.key===key&&t.status!=='Done');if(existing)return existing;const task={id:'T'+Date.now()+s.tasks.length,title,property,owner,key,status:'Open'};s.tasks.unshift(task);return task;}
export function bookTour(s,id){const l=leads.find(l=>l.id===id);if(!l)throw new Error('Prospect not found.');if(l.scheduled||s.tourBookings.includes(id))return false;s.tourBookings.push(id);s.activity.unshift({text:`Sample tour scheduled for ${l.name}`,kind:'Leasing',time:new Date().toISOString()});return true;}
export function csv(rows){return rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
