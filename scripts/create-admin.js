require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));
(async () => {
  const email = (await ask('Admin email: ')).trim().toLowerCase();
  const password = await ask('New admin password (minimum 12 characters): ');
  rl.close();
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) throw new Error('Enter a valid email and a password of at least 12 characters.');
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined });
  const hash = await bcrypt.hash(password, 12);
  await db.execute('INSERT INTO admins(email,password_hash) VALUES(?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)', [email, hash]);
  await db.end();
  console.log('Admin account created/updated for ' + email);
})().catch(e => { console.error(e.message); try { rl.close(); } catch {} process.exit(1); });
