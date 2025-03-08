const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost/hypercomplex'
});

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname + '/public'));

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Нет токена' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Неверный токен' });
    req.user = user;
    next();
  });
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign(user, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка регистрации' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: 'Пользователь не найден' });
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username } });
    } else {
      res.status(400).json({ message: 'Неверный пароль' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка входа' });
  }
});

app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT posts.*, users.username FROM posts 
       INNER JOIN users ON posts.user_id = users.id 
       ORDER BY posts.created_at DESC`
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка получения постов' });
  }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
  const { content } = req.body;
  const user_id = req.user.id;
  try {
    await pool.query(
      'INSERT INTO posts (content, user_id) VALUES ($1, $2)',
      [content, user_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка добавления поста' });
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Нет токена'));
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Неверный токен'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`Пользователь ${socket.user.username} подключился к чату`);
  socket.on('chat message', (data) => {
    io.emit('chat message', { username: socket.user.username, message: data.message });
    pool.query(
      'INSERT INTO messages (user_id, message) VALUES ($1, $2)',
      [socket.user.id, data.message]
    ).catch(err => console.error(err));
  });
});

server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
