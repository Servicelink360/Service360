
// Minimal mock for testing
const { ReportTemplatesService } = require('./report-templates.service');

const defaultUser = {
  userId: 1,
  username: 'testuser',
};

async function testDuplicateTemplate(service, templateId) {
  try {
    const result = await service.duplicate(defaultUser, templateId);
    console.log('Duplicate result:', result);
    if (result && result.code && result.code !== 1) {
      console.error('Duplicate failed:', result);
    } else {
      console.log('Duplicate succeeded:', result);
    }
  } catch (error) {
    console.error('Exception during duplicate:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// You must provide actual dependencies for ReportTemplatesService here.
// This is just a placeholder and will not work unless you set up the service properly.
// Example usage (uncomment and set up dependencies):
// const service = new ReportTemplatesService(...);
// testDuplicateTemplate(service, '1');
