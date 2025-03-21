const supabase = require('../config/supabase');

const getAllUsers = async (req, res) => {
  const admin_id = req.user.id;

  try {
    // Étape 1 : Récupérer les product_keys créés par cet admin avec user_id
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('product_key, user_id') // Inclure product_key explicitement
      .eq('admin_id', admin_id);

    if (productError) {
      return res.status(500).json({ error: 'Database error fetching products', details: productError });
    }

    if (!products.length) {
      return res.status(200).json({ users: [] });
    }

    const userIds = products
      .filter(p => p.user_id !== null)
      .map(p => p.user_id);

    if (!userIds.length) {
      return res.status(200).json({ users: [] });
    }

    // Étape 2 : Récupérer les profils des utilisateurs
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, name, interest, more_info, profile_picture, admin_id')
      .in('id', userIds);

    if (profileError) {
      return res.status(500).json({ error: 'Database error fetching users', details: profileError });
    }

    // Associer product_key aux profils
    const usersWithPictures = profiles.map((profile) => {
      const product = products.find(p => p.user_id === profile.id);

      return {
        id: profile.id,
        name: profile.name,
        interest: profile.interest,
        more_info: profile.more_info,
        profile_picture: profile.profile_picture, // Only the profile picture
        admin_id: profile.admin_id,
        product_key: product.product_key  // Ajoute product_key ici
      };
    });

    res.status(200).json({ users: usersWithPictures });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const getUserByProductKey = async (req, res) => {
  const { productKey } = req.params;

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('user_id')
      .eq('product_key', productKey)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product key not found' });
    }

    const userId = product.user_id;

    if (!userId) {
      return res.status(404).json({ error: 'No user associated with this product key' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, name, interest, more_info, profile_picture')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: profile.id,
        name: profile.name,
        interest: profile.interest,
        more_info: profile.more_info,
        profile_picture: profile.profile_picture, // Only the profile picture
        product_key: productKey,
      },
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

const deleteUser = async (req, res) => {
  const { productKey } = req.params;

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('user_id')
      .eq('product_key', productKey)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product key not found' });
    }

    const userId = product.user_id;

    if (!userId) {
      return res.status(404).json({ error: 'No user associated with this product key' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('profile_picture, image_urls')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found in profiles' });
    }

    // Delete profile picture from storage
    if (profile.profile_picture) {
      const profilePicturePath = profile.profile_picture.split('/profile-pictures/')[1];
      const { error: profilePictureDeleteError } = await supabase.storage
        .from('profile-pictures')
        .remove([profilePicturePath]);

      if (profilePictureDeleteError) {
        console.error('Profile picture deletion error:', profilePictureDeleteError);
      }
    }

    // Delete other images from storage
    if (profile?.image_urls?.length > 0) {
      const paths = profile.image_urls.map((url) => url.split('/user-profile-images/')[1]);
      const { error: storageError } = await supabase.storage
        .from('user-profile-images')
        .remove(paths);
      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // Update product to remove user association
    const { error: productUpdateError } = await supabase
      .from('products')
      .update({ user_id: null, used: false })
      .eq('product_key', productKey);

    if (productUpdateError) {
      return res.status(500).json({ error: 'Failed to update product', details: productUpdateError });
    }

    // Delete user profile
    const { error: profileDeleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      return res.status(500).json({ error: 'Failed to delete user profile', details: profileDeleteError });
    }

    // Delete user
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userDeleteError) {
      return res.status(500).json({ error: 'Failed to delete user', details: userDeleteError });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { getAllUsers, getUserByProductKey, deleteUser };