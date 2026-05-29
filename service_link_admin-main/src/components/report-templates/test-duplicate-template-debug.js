// test-duplicate-template-debug.js
// Script to test and debug the duplicate template API
// Run with: node test-duplicate-template-debug.js

const axios = require('axios');

const API_URL = 'http://localhost:5301/v1/report-templates';
const TEMPLATE_ID = '44'; // Change to the template ID you want to duplicate
const ID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoxNDIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJmdWxsTmFtZSI6IkFkbWluIFVzZXIiLCJ0eXBlIjozLCJyb2xlSWRzIjpbXSwiaWF0IjoxNzY4NTM2MjA5LCJleHAiOjE3NzExMjgyMDl9.xCygILx44riBz6DZ7-w4UFRT0EINZ-eB5R9dGohOppY'; // Use a valid JWT token

async function testDuplicateTemplate() {
    if (!ID_TOKEN) {
        console.error('Error: No ID_TOKEN provided. Set the ID_TOKEN variable.');
        return;
    }
    try {
        const response = await axios.post(`${API_URL}/${TEMPLATE_ID}/duplicate`, {}, {
            headers: {
                Authorization: `Bearer ${ID_TOKEN}`,
            },
        });
        console.log('Success:', response.data);
    } catch (error) {
        console.error('--- Detailed Error Info ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
            console.error('Config:', error.config);
            if (error.response.data && error.response.data.message) {
                console.error('Backend message:', error.response.data.message);
            }
        } else {
            console.error('Error:', error.message);
        }
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        console.error('--- End Detailed Error Info ---');
    }
}

testDuplicateTemplate();
