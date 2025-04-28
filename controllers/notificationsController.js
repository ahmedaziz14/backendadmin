const supabase = require("../config/supabase") ; 


const getNotifications  = async(req , res) =>{
    const adminId=req.user.id ; 
try{
    const {data:notifications , error} =  await supabase 
    .from("admin_notifications")
   .select('*')
   .eq("admin_id" ,adminId )
   .order("created_at", { ascending: true }); // Pas de filtre is_read
if (error) throw new Error(`Erreur de base de données : ${error.message}`);


   

console.log("🔄 Notifications renvoyées :", notifications);
res.status(200).json({ notifications });
} catch (error) {
res.status(500).json({ error: "Erreur serveur", details: error.message });
}
};

const markNotficationAsRead = async (req , res) =>{
    adminId = req.user.id ; 
    notificationId = req.params.id ; 
    try {
        const {data :notification , error : findError} = await supabase 
        .from("admin_notifications")
        .select("*")
        .eq("id" , notificationId)
        .single() ; 

        if (findError || !notification) {
            return res.status(404).json({ error: "Notification non trouvée" });
          }

          const {data:updatenotification , error : updateError} = await supabase
          .from("admin_notifications")
          .update({is_read : true})
          .eq("id" , notificationId)
          .select()
          .single() ; 


        if (updateError) throw new Error(`Erreur mise à jour : ${updateError.message}`);

        req.app.get("io").to(adminId).emit("notification-marked-as-read", notificationId);

        res.status(200).json({
            message: "Notification marquée comme lue",
            notification: updatenotification,
          });
        } catch (error) {
          res.status(500).json({ error: "Erreur serveur", details: error.message });
        }

    
            

        
    }  ; 


const deleteNotification = async (req , res) =>{
    adminId = req.user.id ; 
    notificationId = req.params.id ; 
    try {
        const {data :notification , error : findError} = await supabase 
        .from("admin_notifications")
        .select("*")
        .eq("id" ,notificationId)
        .single() ; 

        if (findError || !notification) {
            return res.status(404).json({ error: "Notification non trouvée" });
          }

          if (findError || !notification) {
            return res.status(404).json({ error: "Notification non trouvée" });
          }
      
          const { error: deleteError } = await supabase
            .from("admin_notifications")
            .delete()
            .eq("id", notificationId);
      
          if (deleteError) throw new Error(`Erreur suppression : ${deleteError.message}`);

          
    req.app.get("io").to(adminId).emit("notification-deleted", notificationId);
      
         
      
          res.status(200).json({ message: "Notification supprimée avec succès" });
        } catch (error) {
          res.status(500).json({ error: "Erreur serveur", details: error.message });
        }

    


} ; 

const deleteAllNotifications = async (req, res) => {
    const adminId = req.user.id;
  
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .eq("admin_id", adminId);
  
      if (error) throw new Error(`Erreur suppression : ${error.message}`);

      req.app.get("io").to(adminId).emit("all-notifications-deleted");
  
  
      res.status(200).json({ message: "Toutes les notifications ont été supprimées avec succès" });
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur", details: error.message });
    }
  };



module.exports = { getNotifications , markNotficationAsRead , deleteNotification , deleteAllNotifications};





