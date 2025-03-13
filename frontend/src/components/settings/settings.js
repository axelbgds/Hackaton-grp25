import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getCurrentUser, updateUserProfile } from "../../services/apiUsers";
import "./settings.scss";
import FollowersModal from '../Followermodal/FollowersModal';
 
const isAuthenticated = () => {
  const token = localStorage.getItem("authToken");
  return !!token;
};
 
const ProfileSettings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [userData, setUserData] = useState({
    username: "",
    bio: "",
    profilePic: "",
    followers: 0,
    following: 0,
    tweets: 0,
  });
  const [imageFile, setImageFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emotion, setEmotion] = useState("Neutre");
  const [cameraActive, setCameraActive] = useState(false);
 
  // Added missing state variables
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("https://via.placeholder.com/150");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tweets, setTweets] = useState(0);
 
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [currentUsername, setCurrentUsername] = useState("");
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState('followers');
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState("");
 
  useEffect(() => {
    // Vérifier l'authentification au chargement
    if (!isAuthenticated()) {
      toast.error("Veuillez vous connecter pour accéder à vos paramètres");
      // Rediriger vers la page de connexion
      window.location.href = '/login';
      return;
    }
 
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const user = getCurrentUser();
        if (user) {
          setUserData({
            username: user.username || "",
            bio: user.bio || "",
            profilePic: user.profilePic || "https://via.placeholder.com/150",
            followers: user.followers?.length || 0,
            following: user.following?.length || 0,
            tweets: user.tweets?.length || 0,
          });
          console.log("✅ Utilisateur récupéré:", user);
          setCurrentUser(user);

          // S'assurer que l'ID utilisateur est bien défini
          const userIdValue = user._id || user.id || "";
          console.log("👤 ID utilisateur:", userIdValue);

          if (!userIdValue) {
            console.warn("⚠️ ID utilisateur manquant dans les données utilisateur");
          }

          setUserId(userIdValue);

          const usernameValue = user.username || "";
          setUsername(usernameValue);
          setCurrentUsername(usernameValue);
          setBio(user.bio || "");

          // Récupération des compteurs, en s'assurant qu'ils ne sont jamais null ou undefined
          const followersCount = Array.isArray(user.followers)
            ? user.followers.length
            : (typeof user.followers === 'number' ? user.followers : 0);

          const followingCount = Array.isArray(user.following)
            ? user.following.length
            : (typeof user.following === 'number' ? user.following : 0);

          const tweetsCount = Array.isArray(user.tweets)
            ? user.tweets.length
            : (typeof user.tweets === 'number' ? user.tweets : 0);

          setFollowers(followersCount);
          setFollowing(followingCount);
          setTweets(tweetsCount);

          setProfileImage(user.profilePic || "https://via.placeholder.com/150");
        } else {
          toast.info("Veuillez vous connecter pour voir votre profil");
          // Redirection vers la page de connexion si aucun utilisateur
          window.location.href = '/login';
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement du profil");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);
 
  // Added missing function
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);

      // Preview image
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target.result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
 
  // 📸 Gérer l'activation/désactivation de la caméra
  const toggleCamera = async () => {
    if (!cameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        streamRef.current = stream; // Stocker le flux
        setCameraActive(true);
        toast.success("Caméra activée !");

      } catch (error) {
        console.error("🚨 Erreur lors de l'activation de la caméra :", error);
        toast.error("Erreur lors de l'activation de la caméra. Vérifiez les permissions.");
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop()); // Arrêter chaque track vidéo
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null; // Supprimer la référence vidéo
      }

      setCameraActive(false);
      toast.info("Caméra désactivée.");
    }
  };


  // 🎭 Détection d'émotion via la caméra
  const sendImageToEmotionAI = async () => {
    if (!videoRef.current) return;
 
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
 
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("image", blob);
      formData.append("user_id", getCurrentUser()?._id);
 
      try {
        const response = await fetch("http://localhost:5000/api/emotions/predict", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        setEmotion(data.emotion);
        toast.info(`Émotion détectée : ${data.emotion}`);
      } catch (error) {
        console.error("Erreur lors de l'analyse de l'émotion :", error);
      }
    }, "image/jpeg");
  };
 
  // 📤 Mettre à jour le profil
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const loadingToastId = toast.loading("Mise à jour du profil en cours...");
 
    try {
      const data = {
        username: username.trim(),
        bio: bio.trim(),
        profilePic: profileImage,
      };

      const result = await updateUserProfile(data);

      const currentUser = getCurrentUser();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          username,
          bio,
          profilePic: result.user?.profilePic || profileImage,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setCurrentUsername(username);

      toast.update(loadingToastId, {
        render: "Profil mis à jour avec succès ! ✅",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      window.location.reload();
 
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.update(loadingToastId, {
        render: "Erreur lors de la mise à jour du profil.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };
 
  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    toast.success("Mot de passe mis à jour avec succès !");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };
 
  const handleOpenFollowersModal = () => {
    if (!isAuthenticated()) {
      toast.error("Vous devez être connecté pour voir vos abonnés");
      return;
    }

    if (!userId) {
      console.error("❌ Impossible d'ouvrir le modal: ID utilisateur manquant");
      toast.error("Une erreur est survenue. Veuillez rafraîchir la page.");
      return;
    }

    setFollowModalType('followers');
    setFollowModalVisible(true);
  };

  const handleOpenFollowingModal = () => {
    if (!isAuthenticated()) {
      toast.error("Vous devez être connecté pour voir vos abonnements");
      return;
    }

    if (!userId) {
      console.error("❌ Impossible d'ouvrir le modal: ID utilisateur manquant");
      toast.error("Une erreur est survenue. Veuillez rafraîchir la page.");
      return;
    }

    setFollowModalType('following');
    setFollowModalVisible(true);
  };

  return (
    <div className="settings-container">
      <div className="profile-header">
        <div className="profile-main">
          <div className="user-profile-info">
            <div className="profile-image-container">
              <div className="profile-image">
                <img
                  src={profileImage}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }}
                />
              </div>
              <label htmlFor="profile-pic" className="edit-icon">
                <svg viewBox="0 0 24 24" className="pencil-icon">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </label>
              <input type="file" id="profile-pic" className="hidden-input" onChange={handleImageChange} accept="image/*" />
            </div>
            <div className="username-display">
              <h2>{currentUsername || "Utilisateur"}</h2>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{tweets}</span>
            <span className="stat-label">Tweets</span>
          </div>
          <div className="stat-item" onClick={handleOpenFollowersModal}>
            <span className="stat-value">{followers}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat-item" onClick={handleOpenFollowingModal}>
            <span className="stat-value">{following}</span>
            <span className="stat-label">Following</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-button ${activeTab === 0 ? "active" : ""}`} onClick={() => setActiveTab(0)}>Profil</button>
        <button className={`tab-button ${activeTab === 1 ? "active" : ""}`} onClick={() => setActiveTab(1)}>Sécurité</button>
        <button className={`tab-button ${activeTab === 2 ? "active" : ""}`} onClick={() => setActiveTab(2)}>Caméra IA</button>
      </div>

      {activeTab === 0 && (
        <form className="settings-form" onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">Nom d'utilisateur</label>
            <input
              id="username"
              type="text"
              className="input-field"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
            />
          </div>
          <div className="form-group">
            <label htmlFor="bio" className="form-label">Bio</label>
            <textarea
              id="bio"
              className="input-field bio-field"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Ma bio"
              rows={4}
            />
          </div>
          <div className="button-container">
            <button type="submit" className="save-button" disabled={isLoading}>
              {isLoading ? "Sauvegarde en cours..." : "Sauvegarder"}
            </button>
          </div>
        </form>
      )}

      {activeTab === 1 && (
        <form className="settings-form" onSubmit={handlePasswordUpdate}>
          <div className="form-group">
            <label htmlFor="current-password" className="form-label">Mot de passe actuel</label>
            <input
              id="current-password"
              type="password"
              className="input-field"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Mot de passe actuel"
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password" className="form-label">Nouveau mot de passe</label>
            <input
              id="new-password"
              type="password"
              className="input-field"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password" className="form-label">Confirmer le mot de passe</label>
            <input
              id="confirm-password"
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirmer le mot de passe"
            />
          </div>
          <div className="button-container">
            <button type="submit" className="save-button">
              Mettre à jour
            </button>
          </div>
        </form>
      )}
 
      {activeTab === 2 && (
        <div className="camera-section">
          <button className="camera-toggle-button" onClick={toggleCamera}>
            {cameraActive ? "Désactiver la caméra" : "Activer la caméra"}
          </button>
          {cameraActive && (
            <div className="camera-container">
              <video ref={videoRef} autoPlay playsInline className="camera-preview" />
              <button className="analyze-button" onClick={sendImageToEmotionAI}>
                Analyser l'émotion
              </button>
            </div>
          )}
          <div className="emotion-result">
            <p>Émotion détectée : <span className="emotion-value">{emotion}</span></p>
          </div>
        </div>
      )}

      {userId && followModalVisible && (
        <FollowersModal
          userId={userId}
          isOpen={followModalVisible}
          onClose={() => setFollowModalVisible(false)}
          initialTab={followModalType}
        />
      )}
    </div>
  );
};
 
export default ProfileSettings;