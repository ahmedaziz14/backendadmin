const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/manageRoutes');
const adminAuthRoutes = require('./routes/authRoutes') ; 
const productRoutes = require('./routes/ProductRoutes');
const chatRoutes = require('./routes/ChatRoutes');
const NotifRoutes = require('./routes/notificationsRoutes')  ; 
const Requests = require('./routes/RequestRoute') ; 
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', adminRoutes);
app.use('/auth', adminAuthRoutes);
app.use('/products',productRoutes) ;
app.use('/chat', chatRoutes); 
app.use('/notifications' , NotifRoutes) ; 
app.use('/Requests'  , Requests) ; 
module.exports = app; // Export the app for server.js to use