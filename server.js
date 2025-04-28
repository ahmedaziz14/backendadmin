require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const app = require('./app');
const crypto = require('crypto');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

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

  // 🔖 Marquer une notification comme lue
  socket.on('mark-notification-as-read', (notificationId) => {
    console.log('🔖 Notification marquée comme lue:', notificationId);
    io.emit('notification-marked-as-read', notificationId);
  });

  // 📢 Nouvelle notification
  socket.on('new-notification', (notification) => {
    console.log('📢 Nouvelle notification envoyée:', notification);
    io.to(notification.user_id).emit('new-notification', notification);
  });

  // 🗑️ Notification supprimée
  socket.on('notification-deleted', (notificationId) => {
    console.log('🗑️ Notification supprimée:', notificationId);
    io.emit('notification-deleted', notificationId);
  });

  // 🧹 Supprimer toutes les notifications pour un utilisateur
  socket.on('delete-all-notifications', (userId) => {
    console.log(`🧹 Suppression de toutes les notifications pour l'utilisateur ${userId}`);
    io.to(userId).emit('all-notifications-deleted');
  });
  // Handle accept request event
  socket.on('accept-signup-request', async ({ requestId, adminId }) => {
    console.log(`✅ Accepting request: ${requestId} from admin: ${adminId}`);
    
    try {
      // Verify request exists - only selecting columns that exist in the table
      const { data: request, error: fetchError } = await supabase
        .from('signup_requests')
        .select('id, admin_id, Accepted')
        .eq('id', requestId)
        .single();
  
      if (fetchError || !request) {
        console.error('Request not found:', fetchError);
        socket.emit('signup-request-error', { 
          requestId,
          message: 'Request not found' 
        });
        return;
      }
  
      // Verify authorization
      if (request.admin_id !== adminId) {
        console.error('Authorization failed for admin:', adminId);
        socket.emit('signup-request-error', { 
          requestId,
          message: 'Unauthorized: You cannot process this request' 
        });
        return;
      }
  
      // Check if already processed
      if (request.Accepted !== null) {
        socket.emit('signup-request-error', { 
          requestId,
          message: 'Request already processed' 
        });
        return;
      }
  
      // Process acceptance - only updating existing columns
      const { error: updateError } = await supabase
        .from('signup_requests')
        .update({ 
          Accepted: true
        })
        .eq('id', requestId);
  
      if (updateError) {
        throw updateError;
      }
  
      // Notify success
      io.to(socket.user.id).emit('signup-request-updated', { 
        id: requestId, 
        Accepted: true 
      });
  
      console.log(`Request ${requestId} accepted successfully`);
  
    } catch (error) {
      console.error('Accept error:', error);
      socket.emit('signup-request-error', { 
        requestId,
        message: error.message || 'Failed to accept request' 
      });
    }
  });
  
  // Handle reject request event
  socket.on('reject-signup-request', async ({ requestId, adminId }) => {
    console.log(`❌ Rejecting request: ${requestId} from admin: ${adminId}`);
    
    try {
      // Verify request exists - only selecting columns that exist in the table
      const { data: request, error: fetchError } = await supabase
        .from('signup_requests')
        .select('id, admin_id, Accepted')
        .eq('id', requestId)
        .single();
  
      if (fetchError || !request) {
        console.error('Request not found:', fetchError);
        socket.emit('signup-request-error', { 
          requestId,
          message: 'Request not found' 
        });
        return;
      }
  
      // Verify authorization
      if (request.admin_id !== adminId) {
        console.error('Authorization failed for admin:', adminId);
        socket.emit('signup-request-error', { 
          requestId,
          message: 'Unauthorized: You cannot process this request' 
        });
        return;
      }
  
      // Check if already processed
      if (request.Accepted !== null) {
        socket.emit('signup-request-error', { 
          requestId,
          message: 'Request already processed' 
        });
        return;
      }
  
      // Process rejection - only updating existing columns
      const { error: updateError } = await supabase
        .from('signup_requests')
        .update({ 
          Accepted: false
        })
        .eq('id', requestId);
  
      if (updateError) {
        throw updateError;
      }
  
      // Notify success
      io.to(socket.user.id).emit('signup-request-updated', { 
        id: requestId, 
        Accepted: false 
      });
  
      console.log(`Request ${requestId} rejected successfully`);
  
    } catch (error) {
      console.error('Reject error:', error);
      socket.emit('signup-request-error', { 
        requestId,
        message: error.message || 'Failed to reject request' 
      });
    }
  });
  socket.on('disconnect', () => {
    console.log('❌ Admin déconnecté :', socket.user.id);
  });
});

// 🔁 Supabase Realtime - Messages
supabase
  .channel('messages-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      const newMessage = payload.new;
      console.log('🔔 Nouveau message brut :', newMessage);
      const decryptedMessage = {
        ...newMessage,
        message: decrypt(newMessage.message),
      };
      console.log('🔔 Nouveau message déchiffré pour admin :', decryptedMessage);
      io.to(newMessage.receiver_id).emit('receiveMessage', decryptedMessage);
    }
  )
  .subscribe((status) => {
    console.log('📡 Statut de l\'abonnement Realtime :', status);
  });

// 🔁 Supabase Realtime - Notifications
supabase
  .channel('notifications-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
    (payload) => {
      const newNotification = payload.new;
      console.log('🔔 Nouvelle notification détectée dans Supabase :', newNotification);
      io.to(newNotification.admin_id).emit('new-notification', newNotification);
    }
  )
  .subscribe((status) => {
    console.log('📡 Statut de l\'abonnement Supabase pour notifications :', status);
  });

  // Écoute des nouvelles demandes d'inscription
supabase
.channel('signup-requests-channel')
.on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'signup_requests' },
  (payload) => {
    const newRequest = payload.new;
    console.log('📢 Nouvelle demande d\'inscription détectée dans Supabase :', newRequest);
    io.to(newRequest.admin_id).emit('signup-request', newRequest);
  }
)
.subscribe((status) => {
  console.log('📡 Statut de l\'abonnement Supabase pour signup_requests :', status);
});

app.set('io', io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://192.168.1.10:${PORT}`);
});
