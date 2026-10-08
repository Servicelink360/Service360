const STATE_ABBR: Record<string, string> = {
  'New South Wales': 'NSW',
  Victoria: 'VIC',
  Queensland: 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  Tasmania: 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
};

function streetLine(address: Record<string, string>) {
  return [address.house_number, address.road || address.pedestrian || address.footway]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function suburbLine(address: Record<string, string>) {
  const suburb =
    address.suburb ||
    address.neighbourhood ||
    address.village ||
    address.town ||
    address.city_district ||
    address.city ||
    '';
  const state = STATE_ABBR[address.state] || address.state || '';
  const region = [state, address.postcode].filter(Boolean).join(' ');
  return [suburb, region].filter(Boolean).join(' ').trim();
}

export function formatStreetAddress(address: Record<string, string> | null | undefined, displayName?: string) {
  if (!address) return String(displayName || '').trim();
  const line = [streetLine(address), suburbLine(address)].filter(Boolean).join(', ');
  return line || String(displayName || '').trim();
}

async function fromNominatim(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Service360 field reports (service360.com.au)',
    },
  });
  if (!res.ok) return '';
  const body = await res.json();
  return formatStreetAddress(body?.address, body?.display_name);
}

async function fromPhoton(lat: number, lng: number) {
  const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
  if (!res.ok) return '';
  const body = await res.json();
  const props = body?.features?.[0]?.properties || {};
  const address: Record<string, string> = {
    house_number: props.housenumber || '',
    road: props.street || props.name || '',
    suburb: props.district || props.city || props.locality || '',
    state: props.state || '',
    postcode: props.postcode || '',
  };
  return formatStreetAddress(address);
}

export async function lookupStreetAddress(lat: number, lng: number) {
  try {
    const nominatim = await fromNominatim(lat, lng);
    if (nominatim) return nominatim;
  } catch {
    /* try the fallback lookup */
  }
  try {
    return await fromPhoton(lat, lng);
  } catch {
    return '';
  }
}
