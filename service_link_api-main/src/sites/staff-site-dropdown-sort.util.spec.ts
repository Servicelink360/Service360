import {
  sortStaffDropdownSites,
  BAYSIDE_PUBLIC_AMENITIES_SITE,
  MASCOT_PUBLIC_AMENITIES_SITE,
} from './staff-site-dropdown-sort.util';

describe('sortStaffDropdownSites', () => {
  const bayside = new Set([37, 45, 214, 220]);

  it('orders Bayside Public Amenities first, Mascot Public Amenities second, other Bayside A-Z', () => {
    const input = [
      { id: 220, name: 'Arncliffe Park' },
      { id: 214, name: 'Tonbridge Reserve' },
      { id: 45, name: MASCOT_PUBLIC_AMENITIES_SITE },
      { id: 37, name: BAYSIDE_PUBLIC_AMENITIES_SITE },
      { id: 99, name: 'Zeta Site' },
    ];
    const sorted = sortStaffDropdownSites(input, bayside);
    expect(sorted.map((s) => s.name)).toEqual([
      BAYSIDE_PUBLIC_AMENITIES_SITE,
      MASCOT_PUBLIC_AMENITIES_SITE,
      'Arncliffe Park',
      'Tonbridge Reserve',
      'Zeta Site',
    ]);
  });
});
