import {properties,reportingRange} from './model.mjs';

// Synthetic, deterministic analytics. These are separate from CRM enquiry cohorts.
export const channels=['Organic Search','Paid Search','Direct','Organic Social','Paid Social','Referral','Email','Unassigned'];
export const platforms=['Instagram','Facebook','Facebook Marketplace'];
const unique=values=>new Set(values).size;
const hash=text=>[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,2166136261);
const pick=(values,key)=>values[hash(key)%values.length];
const days=(from,to)=>{from=from<'2026-09-01'?'2026-09-01':from;to=to>'2026-10-31'?'2026-10-31':to;const out=[];for(let t=Date.parse(from+'T12:00:00Z');t<=Date.parse(to+'T12:00:00Z');t+=86400000)out.push(new Date(t).toISOString().slice(0,10));return out;};
export const websiteSessions=[];
for(const [pi,p] of properties.entries())for(let u=0;u<180-pi*24;u++){
 const user=p.id+'-visitor-'+u,firstMonth=u%3===0?10:9;
 const age=pick(['18–24','25–34','25–34','35–44','45–54','55–64','65+','Unknown'],user+'age');
 const gender=pick(['Female','Female','Male','Male','Unknown'],user+'gender');
 const language=pick(['English','English','English','French','Hindi','Mandarin','Spanish','Other / unknown'],user+'language');
 const city=pick([p.city,p.city,'Toronto','Mississauga','Brampton','Ottawa','Vancouver','Unknown'],user+'city');
 const country=pick(['Canada','Canada','Canada','Canada','United States','India','Other / unknown'],user+'country');
 const interests=[pick(['Home & garden','Travel enthusiasts','Technology','Food & dining','Health & fitness','Unknown'],user+'interest'),pick(['Pet lovers','Shoppers','Sports fans','Arts & entertainment'],user+'interest2')];
 const firstChannel=pick(channels,user+'first');
 let visit=0;
 for(const month of [9,10]){
  if(month<firstMonth)continue;
  const count=1+hash(user+month)%5;
  const dates=Array.from({length:count},(_,i)=>`2026-${month===9?'09':'10'}-${String(1+hash(user+month+'day'+i)%(month===9?30:31)).padStart(2,'0')}`).sort();
  for(const [i,date] of dates.entries()){
   const key=user+date+i,device=pick(['Mobile','Mobile','Mobile','Desktop','Desktop','Tablet'],key+'device');
   const os=device==='Desktop'?pick(['Windows','macOS','Chrome OS'],key+'os'):pick(['iOS','Android'],key+'os');
   const model=device==='Desktop'?'Not available / desktop':device==='Tablet'?(os==='iOS'?'iPad':'Samsung Galaxy Tab'):(os==='iOS'?pick(['iPhone 14','iPhone 15','iPhone 16','iPhone (model unavailable)'],key):pick(['Samsung Galaxy S24','Google Pixel 9','Samsung Galaxy A55','Android (model unavailable)'],key));
   websiteSessions.push({id:key,user,property:p.id,date,age,gender,language,city,country,interests,device,os,model,browser:os==='iOS'?pick(['Safari','Safari','Chrome'],key):pick(['Chrome','Chrome','Edge','Firefox','Safari'],key),resolution:device==='Mobile'?pick(['390 × 844','393 × 852','412 × 915'],key):device==='Tablet'?'820 × 1180':pick(['1920 × 1080','1440 × 900','1366 × 768'],key),channel:visit===0?firstChannel:pick(channels,key+'channel'),firstChannel,newUser:visit++===0,engaged:hash(key+'engaged')%10<7,seconds:15+hash(key+'time')%220,views:1+hash(key+'views')%5,keyEvents:hash(key+'event')%11===0?1:0,page:pick(['/','/floor-plans','/amenities','/gallery','/contact','/neighbourhood'],key+'page')});
  }
 }
}
export function scopedProperties(f){return properties.filter(p=>(!f.property||f.property==='all'||p.id===f.property)&&(!f.pmc||f.pmc==='all'||p.pmc===f.pmc)&&(!f.city||f.city==='all'||p.city===f.city));}
export function selectWebsite(f){const {start,end}=reportingRange(f),ids=new Set(scopedProperties(f).map(p=>p.id));return websiteSessions.filter(r=>ids.has(r.property)&&r.date>=start&&r.date<=end&&(!f.channel||f.channel==='all'||r.channel===f.channel));}
export function websiteSummary(rows){return {sessions:rows.length,activeUsers:unique(rows.map(r=>r.user)),newUsers:unique(rows.filter(r=>r.newUser).map(r=>r.user)),returningUsers:unique(rows.filter(r=>!r.newUser).map(r=>r.user)),views:rows.reduce((s,r)=>s+r.views,0),engaged:rows.filter(r=>r.engaged).length,seconds:rows.reduce((s,r)=>s+r.seconds,0),keyEvents:rows.reduce((s,r)=>s+r.keyEvents,0)};}
export function websiteBreakdown(rows,key){const groups=new Map();for(const r of rows){for(const value of Array.isArray(r[key])?r[key]:[r[key]]){if(!groups.has(value))groups.set(value,[]);groups.get(value).push(r);}}return [...groups].map(([label,records])=>({label,...websiteSummary(records)})).sort((a,b)=>b.activeUsers-a.activeUsers);}
export function websiteTrend(rows,f){const {start,end}=reportingRange(f);return days(start,end).filter(d=>d>='2026-09-01'&&d<='2026-10-31').map(date=>({label:date.slice(5),date,value:rows.filter(r=>r.date===date).length}));}
export function websiteExportRows(filters){
 const rows=selectWebsite(filters);
 return [['Report','Dimension','Value','Sessions','Active users','New users','Returning users','Engaged sessions','Views','Key events'],...['channel','firstChannel','age','gender','interests','language','city','country','device','os','browser','model','resolution','page'].flatMap(key=>websiteBreakdown(key==='firstChannel'?rows.filter(r=>r.newUser):rows,key).map(r=>['Fictional website sample',key,r.label,r.sessions,r.activeUsers,r.newUsers,r.returningUsers,r.engaged,r.views,r.keyEvents]))];
}
export function seedAccounts(){return properties.flatMap(p=>platforms.map((platform,i)=>({id:p.id+'-'+i,platform,label:p.name+' '+platform,handle:(p.id+'living'),ownerType:'property',ownerId:p.id,propertyIds:[p.id],url:'',sample:true}))).concat([{id:'harbour-manager',platform:'Instagram',label:'Harbour Management',handle:'harbourmanagement.demo',ownerType:'manager',ownerId:'Harbour Management',propertyIds:properties.filter(p=>p.pmc==='Harbour Management').map(p=>p.id),url:'',sample:true}]);}
export function safeSocialUrl(value,platform){if(!value)return '';let url;try{url=new URL(value);}catch{throw Error('Enter a complete https:// profile or listing URL.');}const host=url.hostname.toLowerCase(),allowed=platform==='Instagram'?['instagram.com','www.instagram.com']:['facebook.com','www.facebook.com','m.facebook.com'];if(url.protocol!=='https:'||!allowed.includes(host)||url.username||url.password)throw Error('Use an HTTPS URL on '+(platform==='Instagram'?'instagram.com':'facebook.com')+'.');return url.href;}
export function validateAccount(input,accounts=[],id){if(!platforms.includes(input.platform))throw Error('Choose a supported platform.');const label=String(input.label||'').trim().slice(0,100),handle=String(input.handle||'').trim().replace(/^@/,'').slice(0,100);if(!label||!handle)throw Error('Enter an account name and handle.');if(!/^[a-zA-Z0-9._-]+$/.test(handle))throw Error('Use letters, numbers, dots, underscores or hyphens in the handle.');const ownerType=['manager','person'].includes(input.ownerType)?input.ownerType:'property',ownerId=String(input.ownerId||'');const propertyIds=ownerType==='manager'?properties.filter(p=>p.pmc===ownerId).map(p=>p.id):properties.filter(p=>p.id===ownerId).map(p=>p.id);if(!propertyIds.length)throw Error('Choose a valid property or management company.');if(accounts.some(a=>a.id!==id&&a.platform===input.platform&&a.handle.toLowerCase()===handle.toLowerCase()))throw Error('That handle is already mapped. Edit its existing mapping.');return {id:id||crypto.randomUUID(),platform:input.platform,label,handle,ownerType,ownerId,propertyIds,url:safeSocialUrl(String(input.url||'').trim(),input.platform),sample:false};}
export function restoreAccounts(value){if(!Array.isArray(value))return seedAccounts();const out=[];for(const a of value){try{if(!a.id)continue;const clean=validateAccount(a,out,a.id);const seeded=seedAccounts().find(s=>s.id===a.id);clean.sample=Boolean(a.sample&&seeded&&seeded.handle===a.handle&&seeded.ownerId===a.ownerId&&seeded.platform===a.platform);out.push(clean);}catch{}}return out;}
export function selectAccounts(accounts,f){const ids=new Set(scopedProperties(f).map(p=>p.id));return accounts.filter(a=>a.propertyIds.some(id=>ids.has(id))&&(!f.platform||f.platform==='all'||a.platform===f.platform)&&(!f.account||f.account==='all'||a.id===f.account));}
export function socialRows(accounts,f){const {start,end}=reportingRange(f);return selectAccounts(accounts,f).filter(a=>a.sample).flatMap(a=>days(start,end).filter(date=>date>='2026-09-01'&&date<='2026-10-31').map(date=>{const n=hash(a.id+date),market=a.platform==='Facebook Marketplace';return {account:a.id,date,platform:a.platform,views:80+n%320,interactions:5+n%35,clicks:2+n%22,enquiries:n%6,followers:market?null:800+hash(a.id)%4000+Math.floor((Date.parse(date)-Date.parse('2026-09-01'))/86400000)*3};}));}
export function socialSummary(rows){const latest=new Map();rows.forEach(r=>{if(!latest.has(r.account)||r.date>latest.get(r.account).date)latest.set(r.account,r);});return {views:rows.reduce((s,r)=>s+r.views,0),interactions:rows.reduce((s,r)=>s+r.interactions,0),clicks:rows.reduce((s,r)=>s+r.clicks,0),enquiries:rows.reduce((s,r)=>s+r.enquiries,0),followers:[...latest.values()].filter(r=>r.followers!==null).reduce((s,r)=>s+r.followers,0),accounts:latest.size};}
export function socialPosts(accounts,f){const {start,end}=reportingRange(f);return selectAccounts(accounts,f).filter(a=>a.sample).flatMap(a=>[9,10].flatMap(m=>[5,13,21,28].map((day,i)=>{const date=`2026-${String(m).padStart(2,'0')}-${day.toString().padStart(2,'0')}`,n=hash(a.id+date+'post');return {id:a.id+'-'+date,account:a.id,date,title:a.platform==='Facebook Marketplace'?['Bright one-bedroom available','Explore our two-bedroom homes','Book a community tour','New rental availability'][i]:['A little more room to live','Your weekend, closer to home','Meet the neighbourhood','A space for your everyday'][i],format:a.platform==='Facebook Marketplace'?'Listing':i%2?'Photo':'Video',views:300+n%1700,interactions:12+n%80,clicks:3+n%22};}))).filter(p=>p.date>=start&&p.date<=end).sort((a,b)=>b.date.localeCompare(a.date));}

export function socialFeedSelection(accounts,filters,search='',format='all'){
 const q=String(search).trim().toLowerCase();
 return socialPosts(accounts,filters).filter(post=>{
  if(format!=='all'&&post.format!==format)return false;
  const a=accounts.find(a=>a.id===post.account);
  const owners=a.propertyIds.map(id=>{const p=properties.find(p=>p.id===id);return `${p?.name||''} ${p?.pmc||''} ${p?.owner||''}`;}).join(' ');
  return !q||`${post.title} ${a.handle} ${a.label} ${a.platform} ${owners}`.toLowerCase().includes(q);
 });
}
export function accountCoverage(account){return account.ownerType==='manager'?`${account.ownerId} · company-wide (${account.propertyIds.length} properties)`:account.ownerType==='person'?`${properties.find(p=>p.id===account.ownerId)?.owner||'Property manager'} · ${properties.find(p=>p.id===account.ownerId)?.name||account.ownerId}`:properties.find(p=>p.id===account.ownerId)?.name||account.ownerId;}
export function socialExportRows(accounts,filters,view='overview',search='',format='all'){
 if(view==='accounts')return [['Account ID','Account','Handle','Platform','Owner / coverage','Profile URL','Status'],...selectAccounts(accounts,filters).map(a=>[a.id,a.label,a.handle,a.platform,accountCoverage(a),a.url,a.sample?'Sample account':'Not connected'])];
 if(view==='feed')return [['Report','Post ID','Account','Handle','Platform','Owner / coverage','Date','Post','Format','Views','Interactions','Clicks'],...socialFeedSelection(accounts,filters,search,format).map(p=>{const a=accounts.find(a=>a.id===p.account);return ['Fictional social post sample',p.id,a.label,a.handle,a.platform,accountCoverage(a),p.date,p.title,p.format,p.views,p.interactions,p.clicks];})];
 return [['Report','Account','Handle','Platform','Owner / coverage','Date','Views','Interactions','Clicks','Sample enquiries','Followers'],...socialRows(accounts,filters).map(r=>{const a=accounts.find(a=>a.id===r.account);return ['Fictional social activity sample',a.label,a.handle,a.platform,accountCoverage(a),r.date,r.views,r.interactions,r.clicks,r.enquiries,r.followers??'N/A'];})];
}
