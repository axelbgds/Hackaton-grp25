import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// 📝 Inscription
export const registerUser = async (req, res) => {
    console.log("📢 Route atteinte")
    try {
        console.log("📩 Données reçues pour inscription :", req.body); // Log des données reçues

        const { username, email, password } = req.body;

        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log("⚠️ Email déjà utilisé :", email);
            return res.status(400).json({ message: "Email déjà utilisé" });
        }

        // Créer un nouvel utilisateur
        const user = await User.create({ username, email, password });

        console.log("✅ Utilisateur créé avec succès :", user);
        res.status(201).json({ message: "Utilisateur créé avec succès !" });
    } catch (error) {
        console.error("❌ Erreur serveur lors de l'inscription :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};


// 🔑 Connexion
export const loginUser = async (req, res) => {
    try {
        console.log("📩 Données reçues :", req.body);

        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email ou mot de passe incorrect" });
        }

        console.log("✅ Utilisateur trouvé :", user);

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Email ou mot de passe incorrect" });
        }

        console.log("🔑 Connexion réussie, génération du token...");
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 🔓 Déconnexion
export const logoutUser = async (req, res) => {
    res.json({ message: "Déconnexion réussie !" });
};

// 📌 Obtenir un profil utilisateur
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ✏️ Modifier le profil utilisateur (photo de profil, bannière, pseudo, bio, email facultatif)
export const updateUserProfile = async (req, res) => {
    try {
        const { username, profilePic, bannerPic, bio, email } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {

            return res.status(404).json({ message: "Utilisateur non trouvé" });

        }

        // Mise à jour des champs uniquement si ils sont fournis
        if (username) user.username = username;
        if (profilePic) user.profilePic = profilePic;
        if (bannerPic) user.bannerPic = bannerPic;
        if (bio) user.bio = bio;
        if (email && email !== user.email) {
            // Vérifier si l'email est déjà utilisé par un autre utilisateur
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ message: "Cet email est déjà utilisé par un autre compte." });
            }
            user.email = email;
        }

        await user.save();
        res.json({ message: "Profil mis à jour avec succès", user });
    } catch (error) {
        console.error("Erreur mise à jour profil:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};


// Suivre un utilisateur
export const followUser = async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const targetUserId = req.params.id;
      
      // Vérifier qu'on n'essaie pas de se suivre soi-même
      if (currentUserId.toString() === targetUserId) {
        return res.status(400).json({ message: "Impossible de se suivre soi-même" });
      }
      
      // Vérifier si l'utilisateur cible existe
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Utilisateur cible introuvable" });
      }
      
      // Vérifier si l'utilisateur actuel ne suit pas déjà l'utilisateur cible
      const currentUser = await User.findById(currentUserId);
      if (currentUser.following.includes(targetUserId)) {
        return res.status(400).json({ message: "Vous suivez déjà cet utilisateur" });
      }
      
      // Mettre à jour les deux utilisateurs de manière atomique
      const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
        User.findByIdAndUpdate(
          currentUserId, 
          { $addToSet: { following: targetUserId } }, 
          { new: true }
        ),
        User.findByIdAndUpdate(
          targetUserId, 
          { $addToSet: { followers: currentUserId } }, 
          { new: true }
        )
      ]);
      
      // Renvoyer les compteurs mis à jour
      res.json({ 
        message: "Utilisateur suivi avec succès",
        followerCount: updatedTargetUser.followers.length,
        followingCount: updatedCurrentUser.following.length,
        isFollowing: true
      });
    } catch (error) {
      console.error("Erreur lors du suivi d'utilisateur:", error);
      res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
  };
  
  // Ne plus suivre un utilisateur
  export const unfollowUser = async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const targetUserId = req.params.id;
      
      // Vérifier si l'utilisateur cible existe
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Utilisateur cible introuvable" });
      }
      
      // Vérifier si l'utilisateur actuel suit bien l'utilisateur cible
      const currentUser = await User.findById(currentUserId);
      if (!currentUser.following.some(id => id.toString() === targetUserId)) {
        return res.status(400).json({ message: "Vous ne suivez pas cet utilisateur" });
      }
      
      // Mettre à jour les deux utilisateurs de manière atomique
      const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
        User.findByIdAndUpdate(
          currentUserId, 
          { $pull: { following: targetUserId } }, 
          { new: true }
        ),
        User.findByIdAndUpdate(
          targetUserId, 
          { $pull: { followers: currentUserId } }, 
          { new: true }
        )
      ]);
      
      // Renvoyer les compteurs mis à jour
      res.json({ 
        message: "Utilisateur non suivi avec succès",
        followerCount: updatedTargetUser.followers.length,
        followingCount: updatedCurrentUser.following.length,
        isFollowing: false
      });
    } catch (error) {
      console.error("Erreur lors du désabonnement:", error);
      res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
  };
  

// 🔄 Réinitialisation du mot de passe
export const resetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        const newPassword = crypto.randomBytes(6).toString("hex");
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Mot de passe réinitialisé avec succès", newPassword });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 🔑 Changer son mot de passe
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Ancien mot de passe incorrect" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Mot de passe mis à jour avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 🔍 Rechercher des utilisateurs
export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const users = await User.find({ username: new RegExp(query, "i") }).select("-password");

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 📋 Récupérer tous les utilisateurs
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 👥 Récupérer les abonnés d'un utilisateur
export const getUserFollowers = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("followers", "username profilePic");
        res.json(user.followers);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 👥 Récupérer la liste des abonnements d'un utilisateur
export const getUserFollowing = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("following", "username profilePic");
        res.json(user.following);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// 📛 Bloquer un utilisateur
export const blockUser = async (req, res) => {
    try {
        // Vérification si req.user est défini
        if (!req.user) {
            console.error('Utilisateur non authentifié');
            return res.status(401).json({ message: "Utilisateur non authentifié" });
        }

        console.log('Début de la fonction blockUser');
        
        // Recherche de l'utilisateur à bloquer
        const userToBlock = await User.findById(req.params.id);
        console.log('Utilisateur à bloquer :', userToBlock);

        if (!userToBlock) {
            console.error('Utilisateur non trouvé');
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Vérification si l'utilisateur est déjà bloqué
        const alreadyBlocked = req.user.blockedUsers.includes(req.params.id);
        console.log('Utilisateur déjà bloqué ?', alreadyBlocked);

        if (alreadyBlocked) {
            console.error('Cet utilisateur est déjà bloqué');
            return res.status(400).json({ message: "Cet utilisateur est déjà bloqué" });
        }

        // Bloquer l'utilisateur
        req.user.blockedUsers.push(req.params.id);
        await req.user.save();
        console.log('Utilisateur bloqué avec succès', req.user);

        // Répondre avec un message de succès
        res.json({ message: `Utilisateur ${userToBlock.username} bloqué avec succès` });
    } catch (error) {
        console.error('Erreur serveur:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};



// 🔓 Débloquer un utilisateur
export const unblockUser = async (req, res) => {
    try {
        if (!req.user) {
            console.error('Utilisateur non authentifié');
            return res.status(401).json({ message: "Utilisateur non authentifié" });
          }
        
        const userToUnblock = await User.findById(req.params.id);
        
        if (!userToUnblock) return res.status(404).json({ message: "Utilisateur non trouvé" });

       const blockedIndex = req.user.blockedUsers.indexOf(req.params.id);
        if (blockedIndex === -1) {
            return res.status(400).json({ message: "Cet utilisateur n'est pas bloqué" });
        }

         req.user.blockedUsers.splice(blockedIndex, 1);
        await req.user.save();

        res.json({ message: `Utilisateur ${userToUnblock.username} débloqué avec succès` });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};


export const identifier = async (req, res) => {
    try {
        const { identifier } = req.params;
        console.log(`API - Recherche utilisateur avec identifier: ${identifier}`);
        let user;
        
        // Tenter par ID d'abord (les IDs MongoDB ont généralement 24 caractères)
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
          console.log(`API - Tentative de recherche par ID: ${identifier}`);
          // Enlever le populate qui cause l'erreur
          user = await User.findById(identifier);
          if (user) {
            console.log(`API - Utilisateur trouvé par ID: ${user.username}`);
          }
        }
        
        // Si non trouvé ou pas un format d'ID, chercher par nom d'utilisateur
        if (!user) {
          console.log(`API - Tentative de recherche par username: ${identifier}`);
          // Enlever le populate qui cause l'erreur
          user = await User.findOne({ username: identifier });
          if (user) {
            console.log(`API - Utilisateur trouvé par username: ${user.username}`);
          }
        }
        
        if (!user) {
          console.log(`API - Utilisateur non trouvé pour identifier: ${identifier}`);
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        
        // Si besoin, récupérer les tweets séparément
        try {
          // Supposons que les tweets sont stockés dans une collection séparée
          // et qu'ils ont un champ userId ou authorId qui fait référence à l'utilisateur
          const tweets = await Tweet.find({ userId: user._id });
          
          // Ajouter les tweets à l'objet utilisateur avant de le renvoyer
          const userWithTweets = user.toObject(); // Convertir en objet simple
          userWithTweets.tweets = tweets;
          
          res.json(userWithTweets);
        } catch (tweetError) {
          console.warn("Impossible de récupérer les tweets:", tweetError);
          // Renvoyer l'utilisateur sans les tweets si on ne peut pas les récupérer
          res.json(user);
        }
      } catch (error) {
        console.error("Erreur détaillée lors de la recherche d'utilisateur:", error);
        res.status(500).json({ message: "Erreur serveur", details: error.message });
      }
};
      
// Vérifier si l'utilisateur actuel suit un autre utilisateur
export const getFollowStatus = async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const targetUserId = req.params.id;
      
      // Récupérer les deux utilisateurs en parallèle pour plus d'efficacité
      const [targetUser, currentUser] = await Promise.all([
        User.findById(targetUserId),
        User.findById(currentUserId)
      ]);
      
      if (!targetUser) {
        return res.status(404).json({ message: "Utilisateur cible introuvable" });
      }
      
      if (!currentUser) {
        return res.status(404).json({ message: "Utilisateur actuel introuvable" });
      }
      
      // Vérifier si l'utilisateur actuel suit déjà l'utilisateur cible
      const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);
      
      res.json({
        isFollowing,
        followerCount: targetUser.followers.length,
        followingCount: targetUser.following.length
      });
    } catch (error) {
      console.error("Erreur lors de la vérification du statut de suivi:", error);
      res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
  };
  