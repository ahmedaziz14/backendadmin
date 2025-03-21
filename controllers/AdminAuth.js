const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");

// Signup pour admin
const adminSignUp = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Vérifier si l'email existe déjà
    const { data: existingAdmin, error: checkError } = await supabase
      .from("admins")
      .select("email")
      .eq("email", email)
      .single();

    if (existingAdmin) {
      return res.status(400).json({ error: "Email already in use." });
    }

    if (checkError && checkError.code !== "PGRST116") { // Code pour "pas de résultat"
      return res.status(500).json({ error: "Database error.", details: checkError });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'admin dans la table `admins` (UUID généré automatiquement)
    const { data: admin, error: insertError } = await supabase
      .from("admins")
      .insert([{ email, password: hashedPassword }])
      .select()
      .single();

    if (insertError) {
      return res.status(400).json({ error: "Admin registration failed.", details: insertError });
    }

    res.status(201).json({ message: "Admin registered successfully!", admin });
  } catch (error) {
    console.error("Server error during admin signup:", error);
    res.status(500).json({ error: "Server error." });
  }
};

// Signin pour admin
const adminSignIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Récupérer l'admin depuis la table `admins`
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .single();

    if (!admin || adminError) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Comparer le mot de passe
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: "admin" }, // Inclut l'id UUID
      process.env.JWT_SECRET || "SECRET_KEY",
      { algorithm: "HS256", expiresIn: "1h" }
    );

    res.status(200).json({ message: "Admin login successful!", token });
  } catch (error) {
    console.error("Server error during admin signin:", error);
    res.status(500).json({ error: "Server error." });
  }
};

module.exports = { adminSignUp, adminSignIn };