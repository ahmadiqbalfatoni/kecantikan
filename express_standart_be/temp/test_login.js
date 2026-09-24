import axios from 'axios';

async function testLogin() {
  try {
    const headers = {
      'x-timestamp': new Date().toISOString(),
    };

    const response = await axios.post('http://127.0.0.1:8000/api/v1/auth/login', {
      username: 'superadmin@admin.com',
      password: 'Superadmin321!',
      remember_me: '1'
    }, { headers });

    const userCode = response.data.data.user_info.user_code;
    const token = response.data.data.access_token;

    const navResponse = await axios.post('http://127.0.0.1:8000/api/v1/setup/nav/user-data', {
      user_code: userCode
    }, {
      headers: {
        'x-timestamp': new Date().toISOString(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Navigation Response Data Status:', navResponse.status);
    console.log('Total Root Navigation Items:', navResponse.data.data.length);
    console.log('Root Item Labels:', navResponse.data.data.map(i => i.label));
  } catch (error) {
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
