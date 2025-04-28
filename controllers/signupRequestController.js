const supabase = require('../config/supabase');

const getSignupRequests = async (req, res) => {
  try {
    const adminId = req.user.id; // From JWT middleware
    const { data, error } = await supabase
      .from('signup_requests')
      .select('id, admin_id, message, Accepted, created_at')
      .eq('admin_id', adminId)
      .is('Accepted', null);

    if (error) {
      console.error('Erreur lors de la récupération des demandes:', error);
      return res.status(500).json({ error: 'Échec de la récupération des demandes d\'inscription.' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

module.exports = {
  getSignupRequests,

};