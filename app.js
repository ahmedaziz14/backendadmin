const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/manageRoutes');
const adminAuthRoutes = require('./routes/authRoutes') ; 
const productRoutes = require('./routes/ProductRoutes');
const chatRoutes = require('./routes/ChatRoutes');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', adminRoutes);
app.use('/auth', adminAuthRoutes);
app.use('/products',productRoutes) ;
app.use('/chat', chatRoutes); 
module.exports = app; // Export the app for server.js to use