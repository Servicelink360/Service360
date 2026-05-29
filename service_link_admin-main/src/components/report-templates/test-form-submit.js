// test-form-submit.js
// Script to test form submission to the backend API for report templates
// Run with: node test-form-submit.js

const axios = require('axios');

const API_URL = 'http://localhost:5301/v1/report-templates';
const LOGIN_URL = 'http://localhost:5301/v1/auth/signIn';

// To use: set ID_TOKEN env variable or paste your token below
const ID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoxNDIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJmdWxsTmFtZSI6IkFkbWluIFVzZXIiLCJ0eXBlIjozLCJyb2xlSWRzIjpbXSwiaWF0IjoxNzY4NTI1ODM5LCJleHAiOjE3NzExMTc4Mzl9.GHWjpVb8Xf40yKNz7gGaDqYDCvSJKy8s2qNMOeH1B0E';

async function testFormSubmission() {
    const payload = {
        name: 'Test Template',
        category: 'GENERAL',
        description: 'Test description',
        order: 1,
        status: 1,
        settings: {},
        items: [
            {
                name: 'Test Item',
                type: 'TEXT',
                order: 0,
                value: '',
                config: {}
            }
        ]
    };

    // Prevent sending empty name or category
    if (!payload.name || !payload.category) {
        console.error('Error: name and category must not be empty.');
        return;
    }

    try {
        // Remove login step, use provided token
        if (!ID_TOKEN) {
            throw new Error('No ID_TOKEN provided. Set the ID_TOKEN environment variable or paste your token.');
        }
        const response = await axios.post(API_URL, payload, {
            headers: {
                Authorization: `Bearer ${ID_TOKEN}`,
            },
        });
        console.log('Success:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testFormSubmission();
