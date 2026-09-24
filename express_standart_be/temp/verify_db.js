import mysql from 'mysql2/promise';

async function verify() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'db_klinik_kecantikan'
  });

  const [users] = await connection.query('SELECT * FROM users');
  console.log('Users in `users` table:', users);

  const [credentials] = await connection.query('SELECT user_code, username, fullname, role, status FROM user_credential');
  console.log('Credentials in `user_credential` table:', credentials);

  const [navigation] = await connection.query('SELECT user_code, menu FROM user_navigation');
  console.log('Navigation for user:', navigation[0]?.user_code);
  console.log('Parsed Menu Count:', JSON.parse(navigation[0]?.menu)[0]?.items?.length);

  await connection.end();
}

verify().catch(console.error);
