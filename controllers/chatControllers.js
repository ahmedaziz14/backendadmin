const crypto = require('crypto');
const supabase = require('../config/supabase');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Clé de 256 bits (32 bytes hex)
const IV_LENGTH = 16; // Longueur du vecteur d'initialisation

// Fonction de chiffrement AES-256-CBC
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + encrypted;
}

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

const sendMessage = async (req, res) => {
  const { product_key, message } = req.body;
  const sender_id = req.user.id;

  if (!product_key || !message) {
    return res.status(400).json({ error: 'product_key and message are required' });
  }

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('user_id')
      .eq('product_key', product_key)
      .eq('admin_id', sender_id)
      .single();

    if (productError || !product) {
      return res.status(400).json({ error: 'Invalid product key or unauthorized', details: productError });
    }

    const receiver_id = product.user_id;
    const encryptedMessage = encrypt(message);

    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id, receiver_id, message: encryptedMessage, is_admin: true }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to send message', details: error });
    }

    const messageData = {
      id: data.id,
      sender_id,
      receiver_id,
      message, // Clair, PAS encryptedMessage
      is_admin: true,
      created_at: data.created_at,
    };

    console.log('Sending via WebSocket:', messageData); // Log pour débogage
    const io = req.app.get('io');
    io.to(receiver_id).emit('receiveMessage', messageData);
    io.to(sender_id).emit('receiveMessage', messageData);

    res.status(200).json({ message: 'Message sent successfully', data: messageData });
  } catch (error) {
    console.error('Server error during sendMessage:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};
const getChatHistory = async (req, res) => {
  const { product_key } = req.query;
  const admin_id = req.user.id;

  if (!product_key) {
    return res.status(400).json({ error: 'product_key is required' });
  }

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('user_id')
      .eq('product_key', product_key)
      .eq('admin_id', admin_id)
      .single();

    if (productError || !product) {
      return res.status(400).json({ error: 'Invalid product key or unauthorized', details: productError });
    }

    const user_id = product.user_id;

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${admin_id},receiver_id.eq.${user_id}),and(sender_id.eq.${user_id},receiver_id.eq.${admin_id})`)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch chat history', details: error });
    }

    // Déchiffrer les messages avant envoi au client
    const decryptedMessages = messages.map(msg => ({
      ...msg,
      message: decrypt(msg.message), // Déchiffre chaque message
    }));

    res.status(200).json({ messages: decryptedMessages });
  } catch (error) {
    console.error('Server error during getChatHistory:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { sendMessage, getChatHistory };