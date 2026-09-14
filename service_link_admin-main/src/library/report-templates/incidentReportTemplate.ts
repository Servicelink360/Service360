/**
 * Incident Report template - WHS-style site incident / injury / near-miss report.
 * Category: INCIDENT (Report templates).
 */
export const INCIDENT_REPORT_TEMPLATE = {
  name: 'Incident Report',
  description:
    'Site incident, injury, near-miss and property-damage report - details, people involved, treatment, causes, notifications and sign-off.',
  category: 'INCIDENT',
  assignedStaffId: 0,
  items: [
    // Header / context
    { name: 'Report date & time', type: '[REPORT_DATETIME]', required: true, order: 1 },
    { name: 'Site', type: '[SITE_NAME]', required: true, order: 3 },
    { name: 'Site address', type: '[SITE_ADDRESS]', required: false, order: 4 },
    { name: 'Reported by', type: '[REPORT_BY]', required: true, order: 5 },

    // Incident details
    {
      name: 'Incident type',
      type: 'SELECT',
      required: true,
      order: 10,
      options: [
        'Injury / illness',
        'Near miss',
        'Property damage',
        'Environmental',
        'Security / theft',
        'Vehicle incident',
        'Public complaint',
        'Other',
      ],
      config: { section: 'Incident details' },
    },
    {
      name: 'Severity',
      type: 'SELECT',
      required: true,
      order: 11,
      options: ['Low', 'Medium', 'High', 'Critical'],
      config: { section: 'Incident details' },
    },
    {
      name: 'Date & time of incident',
      type: 'DATETIME',
      required: true,
      order: 12,
      config: { section: 'Incident details' },
    },
    {
      name: 'Exact location on site',
      type: 'TEXT',
      required: true,
      order: 14,
      config: {
        section: 'Incident details',
        placeholder: 'e.g. Level 2 male amenities, loading dock, car park bay 12',
      },
    },
    {
      name: 'GPS location (if captured)',
      type: 'GPS',
      required: false,
      order: 15,
      config: { section: 'Incident details' },
    },
    {
      name: 'What happened (description)',
      type: 'TEXTAREA',
      required: true,
      order: 16,
      config: {
        section: 'Incident details',
        placeholder: 'Describe the sequence of events in order. Include what was being done at the time.',
      },
    },
    {
      name: 'Weather / environmental conditions',
      type: 'TEXT',
      required: false,
      order: 17,
      config: {
        section: 'Incident details',
        placeholder: 'e.g. wet floor, poor lighting, outdoor heat, wind',
      },
    },

    // People involved
    {
      name: 'Was anyone injured or ill?',
      type: 'YES_NO',
      required: true,
      order: 20,
      config: { section: 'People involved' },
    },
    {
      name: 'Injured / affected person name',
      type: 'TEXT',
      required: false,
      order: 21,
      config: { section: 'People involved' },
    },
    {
      name: 'Injured / affected person role',
      type: 'SELECT',
      required: false,
      order: 22,
      options: ['Staff', 'Contractor', 'Customer / client', 'Member of public', 'Other'],
      config: { section: 'People involved' },
    },
    {
      name: 'Contact phone / email',
      type: 'TEXT',
      required: false,
      order: 23,
      config: { section: 'People involved', placeholder: 'Phone or email for follow-up' },
    },
    {
      name: 'Witnesses (names & contacts)',
      type: 'TEXTAREA',
      required: false,
      order: 24,
      config: {
        section: 'People involved',
        placeholder: 'List witness names and how to contact them',
      },
    },

    // Injury / treatment
    {
      name: 'Nature of injury / illness',
      type: 'SELECT',
      required: false,
      order: 30,
      options: [
        'Cut / laceration',
        'Bruise / contusion',
        'Sprain / strain',
        'Fracture',
        'Burn',
        'Eye injury',
        'Needlestick / sharps',
        'Chemical exposure',
        'Allergic reaction',
        'Illness (non-injury)',
        'Psychological',
        'Other / none',
      ],
      config: { section: 'Injury & treatment' },
    },
    {
      name: 'Body part(s) affected',
      type: 'TEXT',
      required: false,
      order: 31,
      config: { section: 'Injury & treatment', placeholder: 'e.g. left hand, lower back, right eye' },
    },
    {
      name: 'First aid given?',
      type: 'YES_NO',
      required: false,
      order: 32,
      config: { section: 'Injury & treatment' },
    },
    {
      name: 'First aider name',
      type: 'TEXT',
      required: false,
      order: 33,
      config: { section: 'Injury & treatment' },
    },
    {
      name: 'Treatment / first aid details',
      type: 'TEXTAREA',
      required: false,
      order: 34,
      config: { section: 'Injury & treatment', placeholder: 'What treatment was provided on site?' },
    },
    {
      name: 'Medical / hospital treatment required?',
      type: 'YES_NO',
      required: false,
      order: 35,
      config: { section: 'Injury & treatment' },
    },
    {
      name: 'Medical facility / doctor details',
      type: 'TEXT',
      required: false,
      order: 36,
      config: { section: 'Injury & treatment' },
    },
    {
      name: 'Worker ceased work / time lost?',
      type: 'YES_NO',
      required: false,
      order: 37,
      config: { section: 'Injury & treatment' },
    },

    // Damage
    {
      name: 'Property or equipment damaged?',
      type: 'YES_NO',
      required: true,
      order: 40,
      config: { section: 'Damage' },
    },
    {
      name: 'Damage description',
      type: 'TEXTAREA',
      required: false,
      order: 41,
      config: { section: 'Damage', placeholder: 'Describe damaged assets, estimated impact' },
    },
    {
      name: 'Environmental impact?',
      type: 'YES_NO',
      required: false,
      order: 42,
      config: { section: 'Damage' },
    },
    {
      name: 'Environmental impact details',
      type: 'TEXTAREA',
      required: false,
      order: 43,
      config: { section: 'Damage' },
    },

    // Immediate response
    {
      name: 'Immediate actions taken to make safe',
      type: 'TEXTAREA',
      required: true,
      order: 50,
      config: {
        section: 'Immediate response',
        placeholder: 'e.g. area cordoned, spill cleaned, equipment isolated, first aid',
      },
    },
    {
      name: 'Supervisor / manager notified?',
      type: 'YES_NO',
      required: true,
      order: 51,
      config: { section: 'Immediate response' },
    },
    {
      name: 'Who was notified and when',
      type: 'TEXTAREA',
      required: false,
      order: 52,
      config: { section: 'Immediate response', placeholder: 'Name, role, date/time notified' },
    },
    {
      name: 'Emergency services contacted?',
      type: 'YES_NO',
      required: false,
      order: 53,
      config: { section: 'Immediate response' },
    },
    {
      name: 'Regulator / insurer notification required?',
      type: 'YES_NO',
      required: false,
      order: 54,
      config: { section: 'Immediate response' },
    },
    {
      name: 'Notification reference numbers',
      type: 'TEXT',
      required: false,
      order: 55,
      config: {
        section: 'Immediate response',
        placeholder: 'e.g. SafeWork ref, insurer claim number',
      },
    },

    // Causes & follow-up
    {
      name: 'Likely cause / contributing factors',
      type: 'TEXTAREA',
      required: true,
      order: 60,
      config: {
        section: 'Causes & follow-up',
        placeholder: 'Human factors, equipment, process, environment, PPE, training gaps, etc.',
      },
    },
    {
      name: 'Was a risk assessment / SWMS in place?',
      type: 'YES_NO',
      required: false,
      order: 61,
      config: { section: 'Causes & follow-up' },
    },
    {
      name: 'Corrective / preventive actions required',
      type: 'TEXTAREA',
      required: true,
      order: 62,
      config: {
        section: 'Causes & follow-up',
        placeholder: 'Actions, owner, and target date',
      },
    },
    {
      name: 'Further investigation required?',
      type: 'YES_NO',
      required: true,
      order: 63,
      config: { section: 'Causes & follow-up' },
    },
    {
      name: 'Investigation / follow-up notes',
      type: 'TEXTAREA',
      required: false,
      order: 64,
      config: { section: 'Causes & follow-up' },
    },

    // Evidence & sign-off
    {
      name: 'Incident photos / evidence',
      type: 'IMAGES',
      required: false,
      order: 70,
      config: { section: 'Evidence & sign-off' },
    },
    {
      name: 'Video evidence (optional)',
      type: 'VIDEOS',
      required: false,
      order: 71,
      config: { section: 'Evidence & sign-off' },
    },
    {
      name: 'Additional comments',
      type: 'TEXTAREA',
      required: false,
      order: 72,
      config: { section: 'Evidence & sign-off' },
    },
    {
      name: 'Reporter signature',
      type: 'SIGNATURE',
      required: true,
      order: 73,
      config: { section: 'Evidence & sign-off' },
    },
    {
      name: 'Sign-off date',
      type: 'DATE',
      required: true,
      order: 74,
      config: { section: 'Evidence & sign-off' },
    },
  ],
};
