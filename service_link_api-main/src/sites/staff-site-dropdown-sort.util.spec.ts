import { sortStaffDropdownSites } from './staff-site-dropdown-sort.util';

describe('sortStaffDropdownSites', () => {
  it('orders by dropdownSortOrder then name; nulls last A–Z', () => {
    const input = [
      { id: 220, name: 'Arncliffe Park', dropdownSortOrder: 500 },
      { id: 214, name: 'Tonbridge Reserve', dropdownSortOrder: 500 },
      { id: 45, name: 'Mascot Public Amenities', dropdownSortOrder: 20 },
      { id: 37, name: 'Bayside Public Amenities', dropdownSortOrder: 10 },
      { id: 99, name: 'Zeta Site', dropdownSortOrder: null },
      { id: 100, name: 'Alpha Site' },
    ];
    const sorted = sortStaffDropdownSites(input);
    expect(sorted.map((s) => s.name)).toEqual([
      'Bayside Public Amenities',
      'Mascot Public Amenities',
      'Arncliffe Park',
      'Tonbridge Reserve',
      'Alpha Site',
      'Zeta Site',
    ]);
  });
});
