import axios from 'axios';
import { SignJWT } from 'jose';

async function testEndpoints() {
  try {
    const secretKey = new TextEncoder().encode('random');
    const token = await new SignJWT({ user_code: 'USR000000', username: 'admin', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secretKey);

    console.log('Created valid JWT token:', token.slice(0, 15) + '...');

    const headers = {
      'Content-Type': 'application/json',
      'X-Timestamp': new Date().toISOString(),
      'Authorization': `Bearer ${token}`
    };

    const testUrls = [
      '/master/ruangan-data',
      '/master/promo-data',
      '/master/jadwal-karyawan-data',
      '/master/alat-data'
    ];

    for (const url of testUrls) {
      try {
        const res = await axios.post(`http://localhost:8000/api/v1${url}`, {}, { headers });
        console.log(`SUCCESS [${url}] status: ${res.status}, total_data: ${res.data.total_data}`);
      } catch (err) {
        console.log(`ERROR [${url}] status: ${err.response?.status}, message: ${JSON.stringify(err.response?.data)}`);
      }
    }
  } catch (e) {
    console.error('Test script error:', e.message);
  } finally {
    process.exit(0);
  }
}

testEndpoints();
