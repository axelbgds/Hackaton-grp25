import Tweet from "../models/Tweet.js";
import Hashtag from "../models/Hashtag.js";
import mongoose from 'mongoose';


// 📝 Créer un tweet avec hashtags
export const createTweet = async (req, res) => {
  try {
    const { content, media, hashtags } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Le contenu du tweet est requis" });
    }

    let hashtagIds = [];
    let category = "Autre"; // ✅ Catégorie par défaut

    if (hashtags && Array.isArray(hashtags)) {
      for (const tag of hashtags) {
        let hashtag = await Hashtag.findOne({ hashtag: tag });

        if (!hashtag) {
          hashtag = await Hashtag.create({ hashtag: tag, category: "Autre" });
        }

        hashtagIds.push(hashtag._id);

        // ✅ On récupère la première catégorie trouvée (priorité au premier hashtag)
        if (category === "Autre" && hashtag.category) {
          category = hashtag.category;
        }
      }
    }

    const tweet = await Tweet.create({
      userId: req.user.id,
      content,
      media,
      hashtags: hashtagIds,
      category, // ✅ Ajout de la catégorie
    });

    res.status(201).json({ message: "Tweet créé avec succès", tweet });
  } catch (error) {
    console.error("❌ Erreur lors de la création du tweet :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 📌 Obtenir tous les tweets
export const getTweets = async (req, res) => {
  try {
    const tweets = await Tweet.find()
      .populate("userId", "username profilePic")
      .populate("hashtags", "hashtag category") // 🔥 Ajoute les hashtags
      .sort({ createdAt: -1 });

    res.json(tweets);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des tweets :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


// 📌 Obtenir les tweets d'un utilisateur spécifique
export const getUserTweets = async (req, res) => {
  try {
    const { id } = req.params;
    const tweets = await Tweet.find({ userId: id })
      .populate("userId", "username profilePic")
      .populate("hashtags", "hashtag category")
      .sort({ createdAt: -1 });

    if (!tweets.length) {
      return res.status(404).json({ message: "Aucun tweet trouvé pour cet utilisateur" });
    }

    res.json(tweets);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des tweets utilisateur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};



// ❤️ Liker un tweet
export const likeTweet = async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).json({ message: "Tweet non trouvé" });

    if (tweet.likes.includes(req.user.id)) {
      tweet.likes = tweet.likes.filter(id => id.toString() !== req.user.id);
    } else {
      tweet.likes.push(req.user.id);
    }

    await tweet.save();

    const populatedTweet = await Tweet.findById(tweet._id)
      .populate("userId", "username profilePic")
      .populate("hashtags", "hashtag category");

    res.json(populatedTweet);
  } catch (error) {
    console.error("Erreur like tweet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};



// ❌ Supprimer un tweet
export const deleteTweet = async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).json({ message: "Tweet non trouvé" });

    if (tweet.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Action non autorisée" });
    }

    // Supprimer le tweet
    await tweet.deleteOne();

    res.json({ message: "Tweet supprimé" });
  } catch (error) {
    console.error("Erreur suppression tweet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


// Retweet un tweet
export const retweetTweet = async (req, res) => {
  try {
    const originalTweetId = req.params.id;
    const userId = req.user.id;

    // Vérification de la validité de l'ID
    if (!mongoose.Types.ObjectId.isValid(originalTweetId)) {
      return res.status(400).json({ message: "Format d'ID de tweet invalide" });
    }

    // Recherche du tweet original
    console.log("Recherche du tweet original avec ID:", originalTweetId);
    const originalTweet = await Tweet.findById(originalTweetId);
    
    // Vérification de l'existence du tweet original
    if (!originalTweet) {
      console.log("Tweet original non trouvé avec ID:", originalTweetId);
      return res.status(404).json({ message: "Tweet original non trouvé" });
    }
    console.log("Tweet original trouvé:", originalTweet._id);

    // Recherche d'un retweet existant par cet utilisateur pour ce tweet
    const existingRetweet = await Tweet.findOne({
      isRetweet: true,
      originalTweetId: originalTweetId,
      retweetedBy: userId
    });

    // Si un retweet existe déjà, l'annuler
    if (existingRetweet) {
      console.log("Retweet existant trouvé:", existingRetweet._id);
      
      try {
        // Supprimer LE RETWEET (pas le tweet original)
        await Tweet.findByIdAndDelete(existingRetweet._id);
        console.log("Retweet supprimé avec succès");
        
        // Retirer l'utilisateur de la liste des retweets du tweet original
        originalTweet.retweets = originalTweet.retweets.filter(
          id => id.toString() !== userId.toString()
        );
        await originalTweet.save();

        // Retourner le tweet original mis à jour
        const updatedOriginalTweet = await Tweet.findById(originalTweetId)
          .populate("userId", "username profilePic")
          .populate("retweets", "username profilePic");

        return res.json({
          message: "Retweet supprimé",
          originalTweet: updatedOriginalTweet
        });
      } catch (deleteError) {
        console.error("Erreur lors de l'annulation du retweet:", deleteError);
        return res.status(500).json({ 
          message: "Erreur lors de l'annulation du retweet",
          error: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
        });
      }
    }

    // Créer un nouveau retweet (un nouveau tweet qui fait référence au tweet original)
    console.log("Création d'un nouveau retweet pour le tweet original:", originalTweetId);
    const newRetweet = new Tweet({
      content: originalTweet.content,
      userId: originalTweet.userId, // On garde l'auteur original
      isRetweet: true,
      originalTweetId: originalTweetId,
      retweetedBy: userId,
    });

    // Sauvegarder le nouveau retweet
    const savedRetweet = await newRetweet.save();
    console.log("Nouveau retweet créé avec ID:", savedRetweet._id);

    // Ajouter l'utilisateur à la liste des retweets du tweet original
    if (!originalTweet.retweets.includes(userId)) {
      originalTweet.retweets.push(userId);
      await originalTweet.save();
      console.log("Utilisateur ajouté à la liste des retweets du tweet original");
    }

    // Récupérer les versions populées des tweets
    const populatedOriginalTweet = await Tweet.findById(originalTweetId)
      .populate("userId", "username profilePic")
      .populate("retweets", "username profilePic");

    const populatedRetweet = await Tweet.findById(savedRetweet._id)
      .populate("userId", "username profilePic")
      .populate("retweetedBy", "username profilePic");

    // Retourner le résultat
    return res.status(201).json({
      message: "Retweet créé avec succès",
      originalTweet: populatedOriginalTweet,
      retweet: populatedRetweet
    });
  } catch (error) {
    console.error("Erreur lors du retweet:", error);
    return res.status(500).json({ 
      message: "Erreur serveur lors du retweet",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



// Annuler un retweet
export const unretweetPost = async (req, res) => {
  try {
    const retweet = await Tweet.findOne({
      isRetweet: true,
      originalTweetId: req.params.id,
      retweetedBy: req.user.id
    });

    if (!retweet) {
      return res.status(404).json({ message: "Retweet non trouvé" });
    }

    // Supprimer le retweet
    await retweet.deleteOne();

    // Retirer l'utilisateur de la liste des retweets de l'original
    const originalTweet = await Tweet.findById(req.params.id);
    if (originalTweet) {
      originalTweet.retweets = originalTweet.retweets.filter(id => id.toString() !== req.user.id);
      await originalTweet.save();
    }

    res.json({ message: "Retweet annulé avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'annulation du retweet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 📌 Obtenir la catégorie d'un tweet
export const getTweetCategory = async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id).populate("hashtags");

    if (!tweet) {
      return res.status(404).json({ message: "Tweet non trouvé" });
    }

    res.json({ category: tweet.category });
  } catch (error) {
    console.error("Erreur lors de la récupération de la catégorie :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


