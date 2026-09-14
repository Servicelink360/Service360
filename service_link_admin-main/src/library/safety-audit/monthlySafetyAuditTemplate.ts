/**
 * Monthly Safety Audit & Inspection Checklist
 * Sourced from DOCs/Monthly Safety Audit.doc (SACL REPORT structure).
 * Used to seed a report template in category SAFETY_AUDIT.
 */
export const MONTHLY_SAFETY_AUDIT_TEMPLATE = {
  name: 'Monthly Safety Audit & Inspection Checklist',
  description:
    'SACL monthly site safety audit � risk management, PPE, electrical, chemicals, first aid, walkways, plant, waste, outdoor work. Admin-managed template (Safety Audit category).',
  category: 'SAFETY_AUDIT',
  assignedStaffId: 0,
  items: [
    { name: 'Date of Inspection', type: 'DATE', required: true, order: 1 },
    { name: 'Area/site Inspected', type: '[SITE_NAME]', required: true, order: 2 },
    { name: 'Site address', type: '[SITE_ADDRESS]', required: false, order: 3 },
    { name: 'Customer', type: '[CUSTOMER_NAME]', required: false, order: 4 },
    { name: 'Inspected by', type: '[REPORT_BY]', required: true, order: 5 },

    // Risk Management
    {
      name: 'Risk assessments undertaken for all plant, equipment, chemicals & processes on site',
      type: 'YES_NO',
      required: true,
      order: 10,
      config: { section: 'Risk Management' },
    },
    {
      name: 'Hazard Register has been used in the past month',
      type: 'YES_NO',
      required: true,
      order: 11,
      config: { section: 'Risk Management' },
    },
    {
      name: 'Hazard register notes (regular use / reviews)',
      type: 'TEXTAREA',
      required: false,
      order: 12,
      config: {
        section: 'Risk Management',
        placeholder: 'e.g. hazard register is used on regular basis; risk reviews being progressively undertaken',
      },
    },
    {
      name: 'New risk assessments for hazards, accidents or new processes',
      type: 'YES_NO',
      required: true,
      order: 13,
      config: { section: 'Risk Management' },
    },
    {
      name: 'Risk assessment update notes',
      type: 'TEXTAREA',
      required: false,
      order: 14,
      config: {
        section: 'Risk Management',
        placeholder: 'State what has been done over the past month',
      },
    },

    // Communication & Consultation
    {
      name: 'Evidence of communication of safety issues (OHS minutes, hazard notifications) on site',
      type: 'YES_NO',
      required: true,
      order: 20,
      config: { section: 'Communication & Consultation' },
    },
    {
      name: 'Toolbox talks / safety communication notes',
      type: 'TEXTAREA',
      required: false,
      order: 21,
      config: {
        section: 'Communication & Consultation',
        placeholder: 'e.g. TBT held weekly; monthly site meetings resumed',
      },
    },
    {
      name: 'Monthly site meetings undertaken (consultation & communication)',
      type: 'YES_NO',
      required: true,
      order: 22,
      config: { section: 'Communication & Consultation' },
    },
    {
      name: 'Fire training held within the past 12 months (or suitable period)',
      type: 'YES_NO',
      required: true,
      order: 23,
      config: { section: 'Communication & Consultation' },
    },
    {
      name: 'Fire doors clear of rubbish and stored goods',
      type: 'YES_NO',
      required: true,
      order: 24,
      config: { section: 'Communication & Consultation' },
    },

    // Safety Equipment
    {
      name: 'Availability of personal protective equipment',
      type: 'YES_NO',
      required: true,
      order: 30,
      config: { section: 'Safety Equipment' },
    },
    {
      name: 'Employees trained & competent in using PPE',
      type: 'YES_NO',
      required: true,
      order: 31,
      config: { section: 'Safety Equipment' },
    },
    {
      name: 'Competency record available',
      type: 'YES_NO',
      required: true,
      order: 32,
      config: { section: 'Safety Equipment' },
    },
    {
      name: 'Employees observed using PPE',
      type: 'YES_NO',
      required: true,
      order: 33,
      config: { section: 'Safety Equipment' },
    },

    // Electrical
    {
      name: 'No broken plugs, sockets or switches',
      type: 'YES_NO',
      required: true,
      order: 40,
      config: { section: 'Electrical' },
    },
    {
      name: 'No frayed or damaged leads',
      type: 'YES_NO',
      required: true,
      order: 41,
      config: { section: 'Electrical' },
    },
    {
      name: 'Portable electrical equipment in good condition and tagged (current)',
      type: 'YES_NO',
      required: true,
      order: 42,
      config: { section: 'Electrical' },
    },
    {
      name: 'Current testing and tagging',
      type: 'YES_NO',
      required: true,
      order: 43,
      config: { section: 'Electrical' },
    },

    // Chemicals
    {
      name: 'SDS for all chemicals / Register of Chemicals (no SDS over 5 years old)',
      type: 'YES_NO',
      required: true,
      order: 50,
      config: { section: 'Chemicals on Site' },
    },
    {
      name: 'SDS updated on an ongoing basis',
      type: 'YES_NO',
      required: true,
      order: 51,
      config: { section: 'Chemicals on Site' },
    },
    {
      name: 'Spray bottles clearly labelled',
      type: 'YES_NO',
      required: true,
      order: 52,
      config: { section: 'Chemicals on Site' },
    },
    {
      name: 'Spray bottles locked in trolley cabinet when not in use',
      type: 'YES_NO',
      required: true,
      order: 53,
      config: { section: 'Chemicals on Site' },
    },
    {
      name: 'No out of date or unused chemicals still stored on site',
      type: 'YES_NO',
      required: true,
      order: 54,
      config: { section: 'Chemicals on Site' },
    },
    {
      name: 'Employees competent to use chemicals and PPE',
      type: 'YES_NO',
      required: true,
      order: 55,
      config: { section: 'Chemicals on Site' },
    },

    // First Aid
    {
      name: 'First aid cabinets and contents clean and orderly; contents replenished',
      type: 'YES_NO',
      required: true,
      order: 60,
      config: { section: 'First Aid' },
    },
    {
      name: 'Employees aware of location of first aid cabinet',
      type: 'YES_NO',
      required: true,
      order: 61,
      config: { section: 'First Aid' },
    },
    {
      name: 'First aid cabinet clearly labelled',
      type: 'YES_NO',
      required: true,
      order: 62,
      config: { section: 'First Aid' },
    },
    {
      name: 'Emergency numbers and names displayed for easy viewing',
      type: 'YES_NO',
      required: true,
      order: 63,
      config: { section: 'First Aid' },
    },

    // Public Walkways
    {
      name: 'No obstacles in walkways where avoidable',
      type: 'YES_NO',
      required: true,
      order: 70,
      config: { section: 'Public Walkways' },
    },

    // Plant & Equipment
    {
      name: 'Plant & equipment adequately maintained',
      type: 'YES_NO',
      required: true,
      order: 80,
      config: { section: 'Plant & Equipment (Machines)' },
    },
    {
      name: 'Storage of equipment in convenient access',
      type: 'YES_NO',
      required: true,
      order: 81,
      config: { section: 'Plant & Equipment (Machines)' },
    },
    {
      name: 'Sufficient labelling / instructions / tagging for out of order',
      type: 'YES_NO',
      required: true,
      order: 82,
      config: { section: 'Plant & Equipment (Machines)' },
    },
    {
      name: 'Battery charging areas safe and well ventilated',
      type: 'YES_NO',
      required: true,
      order: 83,
      config: { section: 'Plant & Equipment (Machines)' },
    },

    // Waste
    {
      name: 'Waste equipment fit for purpose',
      type: 'YES_NO',
      required: true,
      order: 90,
      config: { section: 'Waste/Rubbish Disposal/Compactor' },
    },
    {
      name: 'Bins emptied regularly to prevent over filling',
      type: 'YES_NO',
      required: true,
      order: 91,
      config: { section: 'Waste/Rubbish Disposal/Compactor' },
    },
    {
      name: 'Syringes/needles/broken glass contained appropriately; PPE & SWI known',
      type: 'YES_NO',
      required: true,
      order: 92,
      config: { section: 'Waste/Rubbish Disposal/Compactor' },
    },

    // Outdoor
    {
      name: 'Protective clothing and sun screen available according to need',
      type: 'YES_NO',
      required: true,
      order: 100,
      config: { section: 'Outdoor Work' },
    },
    {
      name: 'Reflector vests worn outdoors in traffic areas',
      type: 'YES_NO',
      required: true,
      order: 101,
      config: { section: 'Outdoor Work' },
    },

    // Actions / sign-off
    {
      name: 'Identify action required (Who / When) � including need for risk assessment',
      type: 'TEXTAREA',
      required: false,
      order: 110,
      config: { section: 'Actions', placeholder: 'Identify action required. Who/When?' },
    },
    {
      name: 'URGENT ACTIONS REQUIRED',
      type: 'TEXTAREA',
      required: false,
      order: 111,
      config: {
        section: 'Actions',
        placeholder: 'These items must be followed up and signed off as completed.',
      },
    },
    {
      name: 'Inspection photos',
      type: 'IMAGES',
      required: false,
      order: 112,
      config: { section: 'Actions' },
    },
    {
      name: 'Inspector signature',
      type: 'SIGNATURE',
      required: true,
      order: 113,
      config: { section: 'Sign-off' },
    },
    {
      name: 'Sign-off date',
      type: 'DATE',
      required: true,
      order: 114,
      config: { section: 'Sign-off' },
    },
  ],
};
