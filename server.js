require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.warn('WARNING: JWT_SECRET is not set. Admin login will not work securely until configured.');
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(publicDir, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use(express.static(publicDir));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  ssl: {
    ca: fs.readFileSync(process.env.DB_CA_CERT),
    rejectUnauthorized: true
  }
});
const storage = multer.diskStorage({ destination: uploadDir, filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(file.mimetype)) });

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try { if (!JWT_SECRET) throw new Error('Missing secret'); req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Please log in again.' }); }
}
function makeTrackingCode() { return 'UG-' + crypto.randomBytes(4).toString('hex').toUpperCase(); }
function cleanText(value, max = 250) { return String(value ?? '').trim().slice(0, max); }

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, service: 'UniGo API', database: 'connected' }); }
  catch (e) { res.status(503).json({ ok: false, service: 'UniGo API', database: 'unavailable' }); }
});

// Public menu. The customer website can continue using its own menu until you enable live menu sync.
app.get('/api/menu', async (req, res) => {
  try { const [rows] = await pool.query('SELECT id,name,price,emoji,image_url,category,available FROM menu_items ORDER BY sort_order,id'); res.json(rows); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Could not load menu.' }); }
});

app.post('/api/orders', async (req, res) => {
  const body = req.body || {};
  const customer = cleanText(body.customer_name, 100);
  const phone = cleanText(body.phone, 30);
  const area = cleanText(body.area, 100);
  const location = cleanText(body.location, 250);
  const instructions = cleanText(body.instructions, 500);
  const items = Array.isArray(body.items) ? body.items : [];
  if (!customer || !phone || !area || !location || !items.length) return res.status(400).json({ error: 'Name, phone, area, delivery location and at least one item are required.' });
  if (items.length > 40) return res.status(400).json({ error: 'Too many different items in one order.' });
  const normalized = [];
  for (const item of items) {
    const name = cleanText(item.name, 120);
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 50 || !Number.isFinite(price) || price < 0 || price > 100000) return res.status(400).json({ error: 'One of the order items is invalid.' });
    normalized.push({ name, quantity, price });
  }
  const subtotal = normalized.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const deliveryFee = 10;
  const total = subtotal + deliveryFee;
  let conn;
  try {
    conn = await pool.getConnection(); await conn.beginTransaction();
    let code;
    for (let i = 0; i < 5; i++) {
      code = makeTrackingCode();
      const [exists] = await conn.query('SELECT id FROM orders WHERE tracking_code=?', [code]);
      if (!exists.length) break;
    }
    const [result] = await conn.query(
      `INSERT INTO orders (tracking_code,customer_name,phone,area,location,instructions,subtotal,delivery_fee,total,payment_method,status)
       VALUES (?,?,?,?,?,?,?,?,?,'Pay on Delivery','Received')`,
      [code, customer, phone, area, location, instructions, subtotal, deliveryFee, total]
    );
    for (const item of normalized) await conn.query('INSERT INTO order_items (order_id,item_name,unit_price,quantity,line_total) VALUES (?,?,?,?,?)', [result.insertId, item.name, item.price, item.quantity, item.price * item.quantity]);
    await conn.commit();
    res.status(201).json({ ok: true, tracking_code: code, status: 'Received', subtotal, delivery_fee: deliveryFee, total, payment_method: 'Pay on Delivery' });
  } catch (e) { if (conn) await conn.rollback(); console.error(e); res.status(500).json({ error: 'Could not save your order. Please try again.' }); }
  finally { if (conn) conn.release(); }
});

app.get('/api/orders/:tracking_code', async (req, res) => {
  try {
    const code = cleanText(req.params.tracking_code, 30).toUpperCase();
    const [rows] = await pool.query('SELECT tracking_code,status,total,created_at,updated_at FROM orders WHERE tracking_code=? LIMIT 1', [code]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found. Check your tracking code.' });
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not retrieve order.' }); }
});

app.post('/api/orders/:tracking_code/feedback', async (req, res) => {
  const rating = cleanText(req.body?.rating, 40);
  const comment = cleanText(req.body?.comment, 1000);
  if (!['😍 Excellent','😊 Good','😐 Average','😕 Poor'].includes(rating)) return res.status(400).json({ error: 'Choose a valid rating.' });
  try {
    const [orders] = await pool.query('SELECT id,status FROM orders WHERE tracking_code=? LIMIT 1', [cleanText(req.params.tracking_code, 30).toUpperCase()]);
    if (!orders.length) return res.status(404).json({ error: 'Order not found.' });
    if (orders[0].status !== 'Delivered') return res.status(409).json({ error: 'Feedback is available after delivery.' });
    await pool.query('INSERT INTO order_feedback (order_id,rating,comment) VALUES (?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating),comment=VALUES(comment)', [orders[0].id, rating, comment]);
    res.json({ ok: true, message: 'Thank you for your feedback!' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save feedback.' }); }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const email = cleanText(req.body?.email, 190).toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    const [rows] = await pool.query(
      'SELECT id, email, password_hash FROM admins WHERE email=? LIMIT 1',
      [email]
    );

    if (!rows.length || !await bcrypt.compare(password, rows[0].password_hash)) {
      return res.status(401).json({
        error: 'Incorrect email or password.'
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        error: 'Server security configuration is incomplete.'
      });
    }

    res.json({
      token: jwt.sign(
        { id: rows[0].id, email: rows[0].email },
        JWT_SECRET,
        { expiresIn: '8h' }
      )
    });

  } catch (e) {
    console.error('ADMIN LOGIN ERROR:', e);

    res.status(500).json({
      error: 'Login failed. Check database setup.',
      details: e.message
    });
  }
});

app.get('/api/admin/menu', auth, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY sort_order,id'); res.json(rows); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Could not load menu.' }); }
});
app.post('/api/admin/menu', auth, upload.single('image'), async (req, res) => {
  try {
    const name = cleanText(req.body.name, 100), price = Number(req.body.price);
    if (!name || !Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Enter a food name and valid price.' });
    const [r] = await pool.query('INSERT INTO menu_items(name,price,emoji,image_url,category,available) VALUES(?,?,?,?,?,?)', [name, price, cleanText(req.body.emoji, 16) || '🍽️', req.file ? '/uploads/' + req.file.filename : null, cleanText(req.body.category, 80), req.body.available !== 'false']);
    res.status(201).json({ id: r.insertId });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not save food item.' }); }
});
app.put('/api/admin/menu/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const name = cleanText(req.body.name, 100), price = Number(req.body.price);
    if (!name || !Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Enter a food name and valid price.' });
    let sql = 'UPDATE menu_items SET name=?,price=?,emoji=?,category=?,available=?';
    const args = [name, price, cleanText(req.body.emoji, 16) || '🍽️', cleanText(req.body.category, 80), req.body.available !== 'false'];
    if (req.file) { sql += ',image_url=?'; args.push('/uploads/' + req.file.filename); }
    sql += ' WHERE id=?'; args.push(Number(req.params.id));
    const [r] = await pool.query(sql, args); if (!r.affectedRows) return res.status(404).json({ error: 'Menu item not found.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not update food item.' }); }
});
app.delete('/api/admin/menu/:id', auth, async (req, res) => {
  try { const [r] = await pool.query('DELETE FROM menu_items WHERE id=?', [Number(req.params.id)]); if (!r.affectedRows) return res.status(404).json({ error: 'Menu item not found.' }); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Could not delete food item.' }); }
});

app.get('/api/admin/orders', auth, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT id,tracking_code,customer_name,phone,area,location,instructions,subtotal,delivery_fee,total,payment_method,status,created_at FROM orders ORDER BY created_at DESC LIMIT 200');
    for (const order of orders) { const [items] = await pool.query('SELECT item_name,unit_price,quantity,line_total FROM order_items WHERE order_id=? ORDER BY id', [order.id]); order.items = items; }
    res.json(orders);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load orders.' }); }
});
app.patch('/api/admin/orders/:id/status', auth, async (req, res) => {
  const status = cleanText(req.body?.status, 30);
  const allowed = ['Received','Confirmed','Preparing','Ready for pickup','Out for delivery','Delivered','Cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid order status.' });
  try { const [r] = await pool.query('UPDATE orders SET status=? WHERE id=?', [status, Number(req.params.id)]); if (!r.affectedRows) return res.status(404).json({ error: 'Order not found.' }); res.json({ ok: true, status }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Could not update order status.' }); }
});
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
app.get('/', (req, res) => res.send('UniGo Deliveries API is running. Customer website is hosted separately.'));
app.use((err, req, res, next) => { console.error(err); if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller.' : 'Image upload failed.' }); res.status(500).json({ error: 'Unexpected server error.' }); });
app.listen(PORT, () => console.log(`UniGo API listening on port ${PORT}`));
