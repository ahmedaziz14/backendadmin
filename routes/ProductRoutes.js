const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/add', authenticateToken, productController.addProductKey);
router.get('/all', authenticateToken, productController.getAdminProducts); // Récupérer tous les produits de l'admin
router.delete('/:product_key', authenticateToken, productController.deleteProduct); // Supprimer un produit

module.exports = router;