import axios from 'axios';
import mysql from 'mysql2/promise';

const BASE_URL = 'http://127.0.0.1:8000/api/v1';

async function runTest() {
  console.log('--- Step 1: Login as Manager ---');
  const loginRes = await axios.post(
    `${BASE_URL}/auth/login`,
    {
      username: 'manager@klinik.com',
      password: 'password123',
      remember_me: '1'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': new Date().toISOString()
      }
    }
  );

  console.log('Manager Login Status:', loginRes.data?.status, loginRes.data?.message);
  if (loginRes.data?.status !== 200 && loginRes.data?.status !== '00') {
    throw new Error('Manager login failed');
  }

  const managerToken = loginRes.data.data.access_token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${managerToken}`,
    'X-Timestamp': new Date().toISOString()
  };

  console.log('\n--- Step 2: Create a Staff User with Custom Menu (Beautician) ---');
  const customMenu = [
    {
      label: 'Home',
      items: [
        { label: 'Dashboard', icon: 'pi pi-home', to: '/dashboard' }
      ]
    },
    {
      label: 'Layanan & Tindakan',
      items: [
        { label: 'Antrean Layanan', icon: 'pi pi-users', to: '/pendaftaran-antrean/antrean?type=layanan' },
        { label: 'Pelayanan Pasien', icon: 'pi pi-heart', to: '/layanan/pelayanan-pasien' }
      ]
    }
  ];

  const testUsername = 'beautician_custom@klinik.com';
  
  // Cleanup any old test user first just in case
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'db_klinik_kecantikan'
  });
  await db.query('DELETE FROM user_navigation WHERE user_code IN (SELECT user_code FROM user_credential WHERE username = ?)', [testUsername]);
  await db.query('DELETE FROM user_credential WHERE username = ?', [testUsername]);
  await db.query('DELETE FROM mst_karyawan WHERE email = ?', [testUsername]);

  const createRes = await axios.post(
    `${BASE_URL}/setup/user-login/user-create`,
    {
      username: testUsername,
      fullname: 'Siti Beautician Custom',
      password: 'password123',
      telp: '081234567890',
      role: 'beautician',
      kode_cabang: 'CBG-001',
      status: '1',
      menu: customMenu
    },
    { headers: authHeaders }
  );

  console.log('Create User Response:', createRes.data);
  if (createRes.data?.status !== 200 && createRes.data?.status !== '00') {
    throw new Error('Create user failed: ' + JSON.stringify(createRes.data));
  }

  console.log('\n--- Step 3: Verify DB user_navigation for created user ---');
  const [dbCred] = await db.query('SELECT user_code, username, role, kode_cabang FROM user_credential WHERE username = ?', [testUsername]);
  console.log('Created Credential:', dbCred[0]);
  const userCode = dbCred[0].user_code;

  const [dbNav] = await db.query('SELECT user_code, menu FROM user_navigation WHERE user_code = ?', [userCode]);
  console.log('Saved Menu in DB:', dbNav[0]?.menu);
  const parsedSavedMenu = JSON.parse(dbNav[0]?.menu || '[]');
  console.log('Menu Category Count:', parsedSavedMenu.length);
  if (parsedSavedMenu.length !== 2) {
    throw new Error('Menu length mismatch! Expected 2 categories, got ' + parsedSavedMenu.length);
  }

  console.log('\n--- Step 4: Login as New Custom Staff User & Verify Session Menu ---');
  const staffLoginRes = await axios.post(
    `${BASE_URL}/auth/login`,
    {
      username: testUsername,
      password: 'password123',
      remember_me: '1'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': new Date().toISOString()
      }
    }
  );

  console.log('Staff Login Status:', staffLoginRes.data?.status, staffLoginRes.data?.message);
  const staffMenu = staffLoginRes.data?.data?.user?.menu;
  console.log('Staff Returned Menu in Login Data:', JSON.stringify(staffMenu));

  console.log('\n--- Step 5: Update Permissions using user-update Endpoint ---');
  const updatedMenu = [
    ...customMenu,
    {
      label: 'Kasir & Pembayaran',
      items: [
        { label: 'Pembayaran Kasir', icon: 'pi pi-wallet', to: '/kasir/pembayaran' }
      ]
    }
  ];

  const updateRes = await axios.post(
    `${BASE_URL}/setup/user-login/user-update`,
    {
      user_code: userCode,
      username: testUsername,
      fullname: 'Siti Beautician Custom Updated',
      telp: '081234567890',
      role: 'beautician',
      status: '1',
      kode_cabang: 'CBG-001',
      menu: updatedMenu
    },
    { headers: authHeaders }
  );

  console.log('Update Response:', updateRes.data);

  const [dbNavAfterUpdate] = await db.query('SELECT user_code, menu FROM user_navigation WHERE user_code = ?', [userCode]);
  const parsedUpdatedMenu = JSON.parse(dbNavAfterUpdate[0]?.menu || '[]');
  console.log('Updated Menu Category Count in DB:', parsedUpdatedMenu.length);
  if (parsedUpdatedMenu.length !== 3) {
    throw new Error('Updated menu category count mismatch! Expected 3, got ' + parsedUpdatedMenu.length);
  }

  console.log('\n--- Step 6: Cleanup Test User ---');
  await db.query('DELETE FROM user_navigation WHERE user_code = ?', [userCode]);
  await db.query('DELETE FROM user_credential WHERE user_code = ?', [userCode]);
  await db.query('DELETE FROM mst_karyawan WHERE email = ?', [testUsername]);
  await db.end();

  console.log('\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<');
}

runTest().catch(err => {
  console.error('Test Failed:', err.response?.data || err.message || err);
  process.exit(1);
});
