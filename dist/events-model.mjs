import {properties, selectedProperties} from './model.mjs';

export const EVENT_TYPES=['Resident social','Wellness','Family','Community','Open house'];
export const EVENT_ZONE='America/Toronto';
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:EVENT_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const eventStatus=(event,day=today())=>event.cancelled?'Cancelled':event.date<day?'Past':'Planned';
export const eventCounts=event=>({rsvps:event.attendees.filter(a=>a.response==='Going').reduce((n,a)=>n+1+a.guests,0),attended:event.attendees.filter(a=>a.checkedIn).reduce((n,a)=>n+1+a.guests,0),waitlist:event.attendees.filter(a=>a.response==='Waitlist').reduce((n,a)=>n+1+a.guests,0)});
const uid=prefix=>prefix+'-'+crypto.randomUUID();
const photo=(id,caption)=>({id:'photo-'+id,url:'https://images.unsplash.com/photo-'+id+'?auto=format&fit=crop&w=1000&q=75',caption,illustrative:true});
export function seedEvents(){
 const rows=[
  ['north-social','Meet your neighbours','north','2026-11-21','18:00','20:00','Resident social','Resident lounge','A relaxed evening of board games, light refreshments and getting to know the community.',60],
  ['river-wellness','Saturday stretch & reset','river','2026-11-28','10:00','11:00','Wellness','Fitness studio','A beginner-friendly stretch session. Bring a mat and a water bottle.',30],
  ['cedar-family','Winter craft afternoon','cedar','2026-12-05','14:00','16:00','Family','Community room','Make seasonal decorations together. Children attend with a parent or caregiver.',40],
  ['willow-garden','Community garden planning','willow','2026-11-22','11:00','12:00','Community','Clubhouse','Share ideas for next season and meet your gardening neighbours.',35],
  ['portfolio-winter','Portfolio winter celebration','all','2026-12-12','17:00','20:00','Resident social','Rivergate resident lounge','Residents from all four communities are invited for music, refreshments and a year-end celebration.',150],
  ['north-past','Autumn neighbours night','north','2026-10-23','18:00','20:00','Resident social','Resident lounge','A casual autumn gathering with games and community conversation.',50],
  ['river-past','Resident welcome breakfast','river','2026-11-07','09:00','11:00','Resident social','Resident lounge','A welcome breakfast to introduce new neighbours and the property team.',45],
  ['cedar-past','Family games afternoon','cedar','2026-10-25','14:00','16:00','Family','Community room','An afternoon of family games and refreshments.',40],
  ['willow-past','Community open house','willow','2026-11-01','12:00','15:00','Open house','Clubhouse','Meet the property team and explore the community.',60]
 ];
 return {version:1,events:rows.map(([id,title,property,date,start,end,type,location,description,capacity],i)=>({id,title,propertyIds:property==='all'?properties.map(p=>p.id):[property],date,start,end,type,location,description,capacity,owner:properties.find(p=>p.id===property)?.owner||'Maya Chen',cancelled:false,attendees:Array.from({length:6+i%4},(_,j)=>({id:id+'-resident-'+j,name:['Alex Morgan','Taylor Park','Jamie Bennett','Morgan Reed','Casey Clarke','Riley Brooks','Drew Rivera','Charlie Hayes','Cameron Ellis'][j],unit:String(201+j),property:property==='all'?properties[j%4].id:property,response:j===5?'Maybe':'Going',guests:j%3===0?1:0,checkedIn:i>=5&&j!==5})),photos:i>=5?[photo('1600210492486-724fe5c67fb0','Illustrative resident lounge / event venue'),photo('1556911220-bff31c812dba','Illustrative refreshments area')]:[]}))};
}
export function restoreEvents(saved){
 if(saved?.version!==1||!Array.isArray(saved.events))return seedEvents();
 return {version:1,events:saved.events.filter(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&Array.isArray(e.propertyIds)&&Array.isArray(e.attendees)&&Array.isArray(e.photos)&&/^\d{4}-\d{2}-\d{2}$/.test(e.date))};
}
export function selectEvents(events,scope={},filter={}){
 const ids=new Set(selectedProperties(scope).map(p=>p.id));
 return events.filter(e=>e.propertyIds.some(id=>ids.has(id))&&(!filter.type||filter.type==='all'||e.type===filter.type)&&(!filter.status||filter.status==='all'||eventStatus(e,filter.today)===filter.status)&&(!filter.from||e.date>=filter.from)&&(!filter.to||e.date<=filter.to)&&(!filter.search||`${e.title} ${e.location} ${e.owner}`.toLowerCase().includes(filter.search.toLowerCase()))).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
}
export function summarizeEvents(events,day=today()){
 const active=events.filter(e=>!e.cancelled),planned=active.filter(e=>eventStatus(e,day)==='Planned'),past=active.filter(e=>eventStatus(e,day)==='Past');
 return {total:events.length,planned:planned.length,past:past.length,rsvps:planned.reduce((n,e)=>n+eventCounts(e).rsvps,0),attended:past.reduce((n,e)=>n+eventCounts(e).attended,0),photos:events.reduce((n,e)=>n+e.photos.length,0)};
}
export function saveEvent(data,input,id){
 const old=id?data.events.find(e=>e.id===id):null;
 if(id&&!old)throw Error('Event not found.');
 const item={...input,title:String(input.title||'').trim().slice(0,100),owner:String(input.owner||'').trim().slice(0,80),location:String(input.location||'').trim().slice(0,150),description:String(input.description||'').trim().slice(0,1500),capacity:Number(input.capacity),propertyIds:[...new Set(input.propertyIds||[])]};
 if(!item.title||!item.owner||!item.location)throw Error('Add an event name, location and organizer.');
 if(!item.propertyIds.length||item.propertyIds.some(id=>!properties.some(p=>p.id===id)))throw Error('Select a valid property or the whole portfolio.');
 if(!EVENT_TYPES.includes(item.type))throw Error('Select an event type.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||new Date(item.date+'T12:00:00Z').toISOString().slice(0,10)!==item.date)throw Error('Enter a valid date.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.end)||item.end<=item.start)throw Error('End time must be after the start time on the same day.');
 if(!Number.isInteger(item.capacity)||item.capacity<1||item.capacity>10000)throw Error('Capacity must be between 1 and 10,000.');
 if(old&&old.attendees.some(a=>!item.propertyIds.includes(a.property)))throw Error('Keep the properties of registered attendees in this event.');
 if(old&&eventCounts(old).rsvps>item.capacity)throw Error('Capacity cannot be below confirmed RSVPs.');
 const event={...item,id:old?.id||uid('event'),cancelled:old?.cancelled||false,attendees:old?.attendees||[],photos:old?.photos||[]};
 if(old)data.events[data.events.indexOf(old)]=event;else data.events.push(event);
 return event;
}
export function saveAttendee(event,input,id){
 if(event.cancelled)throw Error('Restore the event before updating registrations.');
 const old=id?event.attendees.find(a=>a.id===id):null;
 if(id&&!old)throw Error('Attendee not found.');
 const attendee={id:old?.id||uid('resident'),name:String(input.name||'').trim().slice(0,80),unit:String(input.unit||'').trim().slice(0,20),property:input.property,response:input.response,guests:Number(input.guests),checkedIn:old?.checkedIn||false};
 if(!attendee.name||!event.propertyIds.includes(attendee.property))throw Error('Enter a name and participating property.');
 if(!['Going','Maybe','Declined','Waitlist'].includes(attendee.response)||!Number.isInteger(attendee.guests)||attendee.guests<0||attendee.guests>10)throw Error('Select an RSVP and between 0 and 10 guests.');
 if(attendee.response!=='Going')attendee.checkedIn=false;
 const confirmed=eventCounts(event).rsvps-(old?.response==='Going'?1+old.guests:0)+(attendee.response==='Going'?1+attendee.guests:0);
 if(confirmed>event.capacity)throw Error('This event is full. Choose Waitlist or increase capacity.');
 if(old)event.attendees[event.attendees.indexOf(old)]=attendee;else event.attendees.push(attendee);
 return attendee;
}
export function checkIn(event,id,day=today()){
 if(event.cancelled||event.date>day)throw Error('Attendance can be recorded on or after the event date.');
 const a=event.attendees.find(a=>a.id===id);if(!a||a.response!=='Going')throw Error('Only confirmed attendees can check in.');
 a.checkedIn=!a.checkedIn;return a;
}
export function safePhotoUrl(value){
 if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
