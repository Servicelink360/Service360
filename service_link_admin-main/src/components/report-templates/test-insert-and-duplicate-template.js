// Test script: Insert a new report template and then duplicate it
const axios = require('axios');

const API_URL = 'http://localhost:5301/v1/report-templates';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoxNDIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJmdWxsTmFtZSI6IkFkbWluIFVzZXIiLCJ0eXBlIjozLCJyb2xlSWRzIjpbXSwiaWF0IjoxNzY4NTM4MDM0LCJleHAiOjE3NzExMzAwMzR9.k1KjxQZS8g_9qa0t3lW_JH5j3jMfj11yk6mqt_3JZxg';

async function insertTemplate() {
  try {
    const res = await axios.post(
      API_URL,
      {
        name: 'Test Template ' + Date.now(),
        description: 'Inserted for duplication test',
        category: 'GENERAL',
        settings: {},
        status: 1
      },
      {
        headers: { Authorization: `Bearer ${JWT_TOKEN}` }
      }
    );
    console.log('Inserted template response:', res.data);
    // Try to extract the ID from different possible response shapes
    if (res.data && res.data.id) {
      return res.data.id;
    }
    if (res.data && res.data.data && res.data.data.id) {
      return res.data.data.id;
    }
    console.error('Could not find template ID in response:', res.data);
    throw new Error('No template ID returned from insert');
  } catch (err) {
    console.error('Insert error:', err.response ? err.response.data : err);
    throw err;
  }
}

async function duplicateTemplate(templateId) {
  try {
    const res = await axios.post(
      `${API_URL}/${templateId}/duplicate`,
      {},
      {
        headers: { Authorization: `Bearer ${JWT_TOKEN}` }
      }
    );
    console.log('Duplicated template:', res.data);
    return res.data;
  } catch (err) {
    console.error('Duplicate error:', err.response ? err.response.data : err);
    throw err;
  }
}

(async () => {
  try {
    const templateId = await insertTemplate();
    await duplicateTemplate(templateId);
  } catch (err) {
    console.error('Test failed:', err);
  }
})();
