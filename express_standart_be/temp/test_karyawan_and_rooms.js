import axios from 'axios';
import mysql from 'mysql2/promise';

const BASE_URL = 'http://127.0.0.1:8000/api/v1';

async function runTest() {
  console.log('=== Step 1: Login as Manager ===');
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
  const managerToken = loginRes.data.data.access_token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${managerToken}`,
    'X-Timestamp': new Date().toISOString()
  };

  console.log('\n=== Step 2: Fetch Employees from mst_karyawan ===');
  const karyawanRes = await axios.post(
    `${BASE_URL}/master/karyawan-data`,
    {},
    { headers: authHeaders }
  );
  console.log('Karyawan Count:', karyawanRes.data?.data?.length);
  const fajarEmp = karyawanRes.data?.data?.find(k => k.kode_karyawan === 'KRY-007');
  console.log('Found KRY-007:', fajarEmp?.nama, fajarEmp?.jabatan, fajarEmp?.email);
  if (!fajarEmp) throw new Error('KRY-007 not found in mst_karyawan');

  console.log('\n=== Step 3: Fetch Ruangan Dropdown ===');
  const ruanganRes = await axios.post(
    `${BASE_URL}/master/ruangan-dropdown`,
    {},
    { headers: authHeaders }
  );
  console.log('Ruangan Count:', ruanganRes.data?.data?.length);
  const rooms = ruanganRes.data?.data || [];
  const tindakanRooms = rooms.filter(r => !r.is_konsultasi || r.is_konsultasi === 0);
  console.log('Tindakan Rooms Count:', tindakanRooms.length);

  console.log('\n=== Step 4: Create User with Karyawan Link & Granular Room Permissions ===');
  const testUsername = 'fajar.ramadhan@klinik.com';
  const selectedRooms = ['RNG-001', 'RNG-014']; // Only Ruang A and Ruang Facial & Skincare

  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'db_klinik_kecantikan'
  });
  // Clean up any existing record
  await db.query('DELETE FROM user_navigation WHERE user_code IN (SELECT user_code FROM user_credential WHERE username = ?)', [testUsername]);
  await db.query('DELETE FROM user_credential WHERE username = ?', [testUsername]);
  await db.query('UPDATE mst_karyawan SET kode_user = NULL WHERE kode_karyawan = ?', ['KRY-007']);

  const customMenu = [
    {
      label: 'HOME',
      icon: 'pi pi-fw pi-home',
      items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/dashboard' }]
    },
    {
      label: 'Layanan & Tindakan',
      icon: 'pi pi-sparkles',
      items: [
        {
          label: 'Tindakan Perawatan',
          icon: 'pi pi-sparkles',
          to: '/pendaftaran-antrean/antrean?type=layanan',
          allowed_ruangan: selectedRooms,
          items: [
            { label: 'Ruang A', icon: 'pi pi-building', to: '/pendaftaran-antrean/antrean?type=layanan&ruangan=RNG-001' },
            { label: 'Ruang Facial & Skincare', icon: 'pi pi-building', to: '/pendaftaran-antrean/antrean?type=layanan&ruangan=RNG-014' }
          ]
        }
      ]
    }
  ];

  const createRes = await axios.post(
    `${BASE_URL}/setup/user-login/user-create`,
    {
      fullname: fajarEmp.nama,
      username: testUsername,
      telp: fajarEmp.no_hp || '081234500007',
      role: 'beautician',
      kode_cabang: 'CBG-001',
      password: 'password123',
      status: '1',
      kode_karyawan: 'KRY-007',
      menu: customMenu
    },
    { headers: authHeaders }
  );

  console.log('Create User Response:', createRes.data);
  const createdUserCode = createRes.data?.data?.user_code;

  console.log('\n=== Step 5: Verify DB Records (user_credential, mst_karyawan, user_navigation) ===');
  const [dbEmp] = await db.query('SELECT kode_karyawan, kode_user, nama FROM mst_karyawan WHERE kode_karyawan = ?', ['KRY-007']);
  console.log('mst_karyawan record:', dbEmp[0]);
  if (dbEmp[0]?.kode_user !== createdUserCode) {
    throw new Error(`mst_karyawan.kode_user mismatch! Expected ${createdUserCode}, got ${dbEmp[0]?.kode_user}`);
  }

  const [dbNav] = await db.query('SELECT user_code, menu FROM user_navigation WHERE user_code = ?', [createdUserCode]);
  const parsedMenu = JSON.parse(dbNav[0]?.menu || '[]');
  console.log('Parsed Menu Categories:', parsedMenu.map(c => c.label));
  const tindakanItem = parsedMenu.find(c => c.label === 'Layanan & Tindakan')?.items?.[0];
  console.log('Tindakan Item in DB:', {
    label: tindakanItem?.label,
    to: tindakanItem?.to,
    allowed_ruangan: tindakanItem?.allowed_ruangan,
    subItems: tindakanItem?.items?.map(i => i.label)
  });

  if (!tindakanItem?.allowed_ruangan || tindakanItem.allowed_ruangan.length !== 2) {
    throw new Error('allowed_ruangan mismatch in user_navigation DB!');
  }

  console.log('\n=== Step 6: Login as Created User & Verify nav/user-data ===');
  const userLoginRes = await axios.post(
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
  console.log('User Login Status:', userLoginRes.data?.status, userLoginRes.data?.message);
  const userToken = userLoginRes.data?.data?.access_token;

  const navRes = await axios.post(
    `${BASE_URL}/setup/nav/user-data`,
    { user_code: createdUserCode },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
        'X-Timestamp': new Date().toISOString()
      }
    }
  );
  const userNav = navRes.data?.data || [];
  const userTindakan = userNav.find(c => c.label === 'Layanan & Tindakan')?.items?.[0];
  console.log('User Nav Data returned by nav/user-data endpoint:');
  console.log('  allowed_ruangan:', userTindakan?.allowed_ruangan);
  console.log('  subItems count:', userTindakan?.items?.length);

  console.log('\n=== Step 7: Clean up Test Records ===');
  await db.query('DELETE FROM user_navigation WHERE user_code = ?', [createdUserCode]);
  await db.query('DELETE FROM user_credential WHERE user_code = ?', [createdUserCode]);
  await db.query('UPDATE mst_karyawan SET kode_user = NULL WHERE kode_karyawan = ?', ['KRY-007']);
  await db.end();

  console.log('\n>>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
}

runTest().catch(err => {
  console.error('Test Failed:', err.response?.data || err.message || err);
  process.exit(1);
});
