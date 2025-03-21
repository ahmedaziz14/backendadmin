const io = require('socket.io-client');

// Remplace par un token valide obtenu après signin utilisateur
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ4MTM1NTQzLWIyYWMtNDBlMC05MDhhLTZlNjk4ZjU4NDk4ZCIsImVtYWlsIjoiYWhtZWRheml6QGdtYWlsLmNvbSIsImlhdCI6MTc0MTEwNjU1MywiZXhwIjoxNzQxMTEwMTUzfQ.0I-fy9naTWwF04Sj719ErVie3hji9Yc_xGylBoh1bcU'; 
const socket = io('http://localhost:3000', {
  auth: { token },
});

socket.on('connect', () => {
  console.log('User connected to WebSocket');
  socket.emit('join', 'user_id_test'); // Optionnel, pour tester les notifications
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

socket.on('receiveMessage', (message) => {
  console.log('Message reçu:', message);
});

socket.on('disconnect', () => {
  console.log('User disconnected');
});