// Debug script to test backend login and catch errors
const axios = require('axios');

const API_URL = 'http://localhost:5301/v1/auth/signIn';
const testPayload = {
  username: 'admin',
  password: 'admin123',
  type: 0,
  version: '1.0.1'
};

async function testLogin() {
  try {
    console.log('Sending login request:', testPayload);
    const response = await axios.post(API_URL, testPayload);
    console.log('Login response:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Login failed:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
