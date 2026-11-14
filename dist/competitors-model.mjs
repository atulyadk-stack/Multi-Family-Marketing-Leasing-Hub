const SAMPLE = {
  north: {rating:4.1, name:'Parkside Commons', competitorRating:4.4},
  river: {rating:4.6, name:'Oak Terrace', competitorRating:4.3},
  cedar: {rating:4.3, name:'Maple House', competitorRating:4.5},
  willow: {rating:4.2, name:'Brookfield Homes', competitorRating:4.4},
};
export const propertyLifetimeRating = id => SAMPLE[id]?.rating ?? null;
export function seedCompetitors(){return {version:1,properties:Object.fromEntries(Object.entries(SAMPLE).map(([id,p])=>[id,[{id:'sample-'+id,name:p.name,rating:p.competitorRating,reviews:null,url:'',sample:true}]]))};}
const optionalNumber = (value, label, min, max, integer=false) => {
  if(value===null || value===undefined || value==='')return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isSafeInteger(n)))throw Error(label);
  return n;
};
export function cleanCompetitor(input){
  const name=String(input.name??'').trim().replace(/\s+/g,' ');
  if(!name||name.length>120)throw Error('Enter a competitor name of 1–120 characters.');
  let url=String(input.url??'').trim();
  if(url){let parsed;try{parsed=new URL(url);}catch{throw Error('Enter a full website or review-page URL starting with https:// or http://.');}
    if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password||url.length>2048)throw Error('Use a public http:// or https:// link without login details.');url=parsed.href;}
  return {name,url,rating:optionalNumber(input.rating,'Rating must be between 1 and 5.',1,5),reviews:optionalNumber(input.reviews,'Review count must be a whole number of zero or more.',0,Number.MAX_SAFE_INTEGER,true)};
}
export function restoreCompetitors(saved){
  const data=seedCompetitors();
  if(saved?.version!==1||!saved.properties||typeof saved.properties!=='object')return data;
  for(const property of Object.keys(SAMPLE)){
    if(!Array.isArray(saved.properties[property]))continue;
    const ids=new Set(),names=new Set();
    data.properties[property]=saved.properties[property].flatMap(item=>{
      try{if(!item||typeof item.id!=='string'||!item.id||item.id.length>100||ids.has(item.id))return [];
        const value=cleanCompetitor(item),key=value.name.toLocaleLowerCase();if(names.has(key))return [];
        ids.add(item.id);names.add(key);return [{...value,id:item.id,sample:item.sample===true}];
      }catch{return [];}
    });
  }
  return data;
}
export function saveCompetitor(data,property,input,id){
  const list=data.properties[property];if(!Object.hasOwn(SAMPLE,property)||!Array.isArray(list))throw Error('Property not found.');
  const value=cleanCompetitor(input),index=id?list.findIndex(c=>c.id===id):-1;
  if(id&&index<0)throw Error('Competitor not found.');
  if(list.some(c=>c.id!==id&&c.name.toLocaleLowerCase()===value.name.toLocaleLowerCase()))throw Error('This competitor is already added to this property.');
  const item={...value,id:id||crypto.randomUUID(),sample:false};
  if(index<0)list.push(item);else list[index]=item;
  return item;
}
export function removeCompetitor(data,property,id){
  const list=data.properties[property];if(!Array.isArray(list))throw Error('Property not found.');
  const index=list.findIndex(c=>c.id===id);if(index<0)throw Error('Competitor not found.');list.splice(index,1);
}
export function competitorSummary(list){const rated=list.filter(c=>c.rating!==null);return {count:list.length,rated:rated.length,average:rated.length?rated.reduce((s,c)=>s+c.rating,0)/rated.length:null};}
