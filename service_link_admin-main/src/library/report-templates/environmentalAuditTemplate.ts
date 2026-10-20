/**
 * Environmental Audit - ServiceLink Environmental Inspection (field record).
 * Category: SAFETY_AUDIT (Audit Templates page).
 */
/** Short codes only — PDF legend explains: C Compliant, NC Non-compliant, NA Not applicable. */
const RESULT = ['C', 'NC', 'NA'];

function question(name: string, section: string, order: number) {
  return {
    name,
    type: 'SELECT',
    required: true,
    order,
    options: RESULT,
    config: { section },
  };
}

export const ENVIRONMENTAL_AUDIT_TEMPLATE = {
  name: 'Environmental Audit',
  description:
    'Site environmental compliance field inspection: chemicals, water, fire, waste, air, grounds, monthly reporting, corrective actions and sign-off.',
  category: 'SAFETY_AUDIT',
  assignedStaffId: 0,
  items: [
    { name: 'Site / facility', type: '[SITE_NAME]', required: true, order: 1, config: { section: 'Site details' } },
    { name: 'Address / location', type: '[SITE_ADDRESS]', required: true, order: 2, config: { section: 'Site details' } },
    { name: 'Client / contract', type: '[CUSTOMER_NAME]', required: true, order: 3, config: { section: 'Site details' } },
    { name: 'Audit date / time', type: 'DATETIME', required: true, order: 4, config: { section: 'Site details' } },
    { name: 'Site representative', type: 'TEXT', required: true, order: 5, config: { section: 'Site details' } },
    {
      name: 'Weather / conditions',
      type: 'TEXT',
      required: false,
      order: 6,
      config: { section: 'Site details', placeholder: 'e.g. dry, rain, wind, heat' },
    },

    question('Chemicals are labelled and stored securely with suitable segregation.', '1. Chemicals, fuels, oils and paints', 10),
    question('Safety Data Sheets are available for hazardous products.', '1. Chemicals, fuels, oils and paints', 11),
    question('Spill kits are accessible and staff know the response procedure.', '1. Chemicals, fuels, oils and paints', 12),
    question('No visible leaks, spills or uncontrolled discharge.', '1. Chemicals, fuels, oils and paints', 13),

    question('Stormwater drains are protected from sediment and contaminants.', '2. Water management', 20),
    question('Wash water and wastewater are contained and disposed of appropriately.', '2. Water management', 21),
    question('No chemicals, detergents or waste enter drains or waterways.', '2. Water management', 22),
    question('Water use and leaks are monitored and addressed.', '2. Water management', 23),

    question('Combustible materials and green waste are stored safely.', '3. Fire management', 30),
    question('Fire access routes and emergency equipment remain unobstructed.', '3. Fire management', 31),
    question('Hot works and ignition sources are controlled where applicable.', '3. Fire management', 32),

    question('General, recyclable and hazardous wastes are separated.', '4. Waste management', 40),
    question('Bins are labelled, covered where necessary and not overflowing.', '4. Waste management', 41),
    question('Waste transfer and disposal records are retained where required.', '4. Waste management', 42),
    question('No litter, illegal dumping or uncontrolled waste storage.', '4. Waste management', 43),

    question('Dust generation is minimised during site activities.', '5. Air quality, dust and noise', 50),
    question('Equipment emissions and idling are controlled.', '5. Air quality, dust and noise', 51),
    question('Noise and vibration impacts are managed appropriately.', '5. Air quality, dust and noise', 52),
    question('Odours or airborne contaminants are investigated and controlled.', '5. Air quality, dust and noise', 53),

    question('Trees, vegetation and habitat protection areas are identified.', '6. Flora, fauna and grounds', 60),
    question('Vegetation work follows approvals and site requirements.', '6. Flora, fauna and grounds', 61),
    question('Wildlife, nests and sensitive habitats are protected.', '6. Flora, fauna and grounds', 62),
    question('Weed, soil and biosecurity controls are applied where relevant.', '6. Flora, fauna and grounds', 63),

    question('Required inspections and monitoring records are up to date.', '7. Monthly environmental reporting', 70),
    question('Environmental incidents and complaints are logged and reviewed.', '7. Monthly environmental reporting', 71),
    question('Previous corrective actions are closed or escalated.', '7. Monthly environmental reporting', 72),
    question('Environmental report has been completed and submitted if required.', '7. Monthly environmental reporting', 73),

    {
      name: 'Finding / evidence',
      type: 'TEXTAREA',
      required: false,
      order: 80,
      config: { section: '8. Corrective action register', placeholder: 'What was found' },
    },
    {
      name: 'Risk',
      type: 'SELECT',
      required: false,
      order: 81,
      options: ['Low', 'Medium', 'High', 'Critical'],
      config: { section: '8. Corrective action register' },
    },
    {
      name: 'Action / owner / due date',
      type: 'TEXTAREA',
      required: false,
      order: 82,
      config: { section: '8. Corrective action register', placeholder: 'Action, who owns it, and when it is due' },
    },
    {
      name: 'Status',
      type: 'SELECT',
      required: false,
      order: 83,
      options: ['Open', 'In progress', 'Closed', 'Escalated'],
      config: { section: '8. Corrective action register' },
    },

    { name: 'Total compliant', type: 'NUMBER', required: false, order: 90, config: { section: '9. Audit summary and sign-off' } },
    { name: 'Total non-compliant', type: 'NUMBER', required: false, order: 91, config: { section: '9. Audit summary and sign-off' } },
    { name: 'Total not applicable', type: 'NUMBER', required: false, order: 92, config: { section: '9. Audit summary and sign-off' } },
    {
      name: 'Overall assessment',
      type: 'SELECT',
      required: true,
      order: 93,
      options: ['Satisfactory', 'Action required', 'Critical escalation'],
      config: { section: '9. Audit summary and sign-off' },
    },
    {
      name: 'Comments / environmental incidents',
      type: 'TEXTAREA',
      required: false,
      order: 94,
      config: { section: '9. Audit summary and sign-off' },
    },
    { name: 'Auditor signature', type: 'SIGNATURE', required: true, order: 95, config: { section: '9. Audit summary and sign-off' } },
    { name: 'Auditor date', type: 'DATE', required: true, order: 96, config: { section: '9. Audit summary and sign-off' } },
    { name: 'Manager / site representative signature', type: 'SIGNATURE', required: false, order: 97, config: { section: '9. Audit summary and sign-off' } },
    { name: 'Manager / site representative date', type: 'DATE', required: false, order: 98, config: { section: '9. Audit summary and sign-off' } },
  ],
};
