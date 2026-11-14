import {properties} from '../dist/model.mjs';

const images = [
  ['1694002406609-4bded712347b', 'Apartment building exterior'],
  ['1600210492486-724fe5c67fb0', 'Living room'],
  ['1556911220-bff31c812dba', 'Kitchen'],
];

export const demoListings = {
  north: {amenities: ['Fitness studio', 'Rooftop terrace', 'Parcel lockers'], suites: ['In-suite laundry', 'Quartz countertops', 'Private balconies']},
  river: {amenities: ['Resident lounge', 'Bike storage', 'Underground parking'], suites: ['Stainless steel appliances', 'In-suite laundry', 'Large windows']},
  cedar: {amenities: ['Landscaped courtyard', 'Fitness room', 'Visitor parking'], suites: ['Open-concept layouts', 'Private balconies', 'Dishwasher']},
  willow: {amenities: ['Playground', 'Community garden', 'Walking paths'], suites: ['Private entrances', 'In-suite laundry', 'Attached garages']},
};

export function demoListingHtml(property) {
  const listing = demoListings[property.id];
  if (!listing) return null;
  const photos = images.map(([id, alt]) => `<figure><img src="https://images.unsplash.com/photo-${id}?auto=format&amp;fit=crop&amp;w=1200&amp;q=75" alt="${alt}"><figcaption>${alt}</figcaption></figure>`).join('');
  const list = items => '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${property.name} | Sample listing</title><style>body{font:16px system-ui;color:#23364b;max-width:900px;margin:2rem auto;padding:0 1rem}figure{margin:1rem 0}img{width:100%;max-height:360px;object-fit:cover;border-radius:12px}figcaption{margin-top:.5rem}</style><main><a href="/">Back to MF Hub</a><h1>${property.name}</h1><p>Fictional demo listing with illustrative photography</p><p>${property.address}</p><p>Sample leasing number: ${property.phone}</p><section><h2>Photos</h2>${photos}</section><section><h2>Community amenities</h2>${list(listing.amenities)}</section><section><h2>Suite features</h2>${list(listing.suites)}</section></main></html>`;
}

export function findProperty(id) {
  return properties.find(property => property.id === id);
}
