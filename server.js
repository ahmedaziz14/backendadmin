require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const app = require('./app');
const crypto = require('crypto'); // Ajout de crypto pour déchiffrement

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Clé de 256 bits (32 bytes hex)
const IV_LENGTH = 16; // Longueur du vecteur d'initialisation

// Fonction de déchiffrement AES-256-CBC
function decrypt(encryptedText) {
  try {
    if (!encryptedText || encryptedText.length < IV_LENGTH * 2) {
      throw new Error('Encrypted text is too short or missing IV');
    }

    const ivHex = encryptedText.substring(0, IV_LENGTH * 2);
    const encrypted = encryptedText.substring(IV_LENGTH * 2);
    const iv = Buffer.from(ivHex, 'hex');

    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return '[ERROR]';
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token provided'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('✅ Admin connecté :', socket.user.id);
  socket.join(socket.user.id);

  socket.on('disconnect', () => {
    console.log('❌ Admin déconnecté :', socket.user.id);
  });
});

// Écoute des nouveaux messages via Supabase Realtime
supabase
  .channel('messages-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      const newMessage = payload.new;
      console.log('🔔 Nouveau message brut :', newMessage);
      // Déchiffrer le message avant de l'envoyer
      const decryptedMessage = {
        ...newMessage,
        message: decrypt(newMessage.message),
      };
      console.log('🔔 Nouveau message déchiffré pour admin :', decryptedMessage);
      io.to(newMessage.receiver_id).emit('receiveMessage', decryptedMessage); // Envoie à l’admin
    }
  )
  .subscribe((status) => {
    console.log('📡 Statut de l\'abonnement Realtime :', status);
  });

app.set('io', io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://192.168.1.10:${PORT}`);
});