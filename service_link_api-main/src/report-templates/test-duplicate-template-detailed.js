// test-duplicate-template-detailed.js
// This script will call the duplicate endpoint via HTTP and print detailed errors.
// Requires axios: npm install axios

const axios = require('axios');

// CONFIGURE THESE VALUES:
const API_URL = 'http://localhost:5301/v1/report-templates'; // Changed port to 5301
const TEMPLATE_ID = '1'; // Set to a real template ID to duplicate
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoxNDIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJmdWxsTmFtZSI6IkFkbWluIFVzZXIiLCJ0eXBlIjozLCJyb2xlSWRzIjpbXSwiaWF0IjoxNzY4NTUzMDM2LCJleHAiOjE3NzExNDUwMzZ9.X6xTx7d-OrYPP0Ft94o7QxKvtMGPNnhW_Y3CK6JfBpQ'; // Provided JWT token

async function testDuplicateTemplate() {
  try {
    const response = await axios.post(
      `${API_URL}/${TEMPLATE_ID}/duplicate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${JWT_TOKEN}`,
        },
        validateStatus: () => true, // Always resolve, even for errors
      }
    );
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    if (response.status !== 200) {
      console.error('Duplicate failed:', response.data);
    } else {
      console.log('Duplicate succeeded:', response.data);
    }
  } catch (error) {
    console.error('Exception during duplicate:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
  }
}

testDuplicateTemplate();
