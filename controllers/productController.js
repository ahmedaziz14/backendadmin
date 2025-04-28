const supabase = require('../config/supabase');

/* Fonction pour générer une clé de produit aléatoire (ex. "ABC123-XYZ789")
const generateRandomProductKey = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 6; i++) {
    key += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  key += '-';
  for (let i = 0; i < 6; i++) {
    key += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return key; // Exemple : "K9P2M7-X4N8J3"
};
*/
// Ajouter un product_key par un admin
// Ajouter un product_key manuellement depuis req.body par un admin
const addProductKey = async (req, res) => {
  const admin_id = req.user.id; // Récupéré du JWT via middleware
  const { product_key } = req.body; // Récupération de la clé depuis req.body

  // Vérifier si product_key est fourni dans la requête
  if (!product_key) {
    return res.status(400).json({ error: 'Product key is required.' });
  }

  try {
    // Vérifier si la clé existe déjà
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('product_key')
      .eq('product_key', product_key)
      .single();

    if (existingProduct) {
      return res.status(400).json({ error: 'Product key already exists.' });
    }

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Database error.', details: checkError });
    }

    // Insérer la nouvelle clé fournie manuellement
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert([{ product_key, admin_id, used: false, user_id: null }])
      .select()
      .single();

    if (insertError) {
      return res.status(400).json({ error: 'Failed to add product key.', details: insertError });
    }

    res.status(201).json({ message: 'Product key added successfully!', product });
  } catch (error) {
    console.error('Server error during product key addition:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Récupérer tous les produits d'un admin (inchangé)
const getAdminProducts = async (req, res) => {
  const admin_id = req.user.id;

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('admin_id', admin_id);

    if (error) {
      return res.status(500).json({ error: 'Database error.', details: error });
    }

    res.status(200).json({ products });
  } catch (error) {
    console.error('Server error during fetching products:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Supprimer un produit spécifique créé par l'admin (inchangé)
const deleteProduct = async (req, res) => {
  const { product_key } = req.params;
  const admin_id = req.user.id;

  try {
    const { data: product, error: checkError } = await supabase
      .from('products')
      .select('*')
      .eq('product_key', product_key)
      .eq('admin_id', admin_id)
      .single();

    if (!product || checkError) {
      return res.status(404).json({ error: 'Product not found or not owned by this admin.' });
    }

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('product_key', product_key)
      .eq('admin_id', admin_id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete product.', details: deleteError });
    }

    res.status(200).json({ message: 'Product deleted successfully!' });
  } catch (error) {
    console.error('Server error during product deletion:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { addProductKey, getAdminProducts, deleteProduct };