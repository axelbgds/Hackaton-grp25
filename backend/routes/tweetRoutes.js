import express from "express";
import { createTweet, getTweets, likeTweet, retweetTweet, deleteTweet, getUserTweets } from "../controllers/tweetController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createTweet);
router.get("/", getTweets);
router.get("/user/:id", protect, getUserTweets);
router.post("/:id/like", protect, likeTweet);
router.post("/:id/retweet", protect, retweetTweet);
router.delete("/:id", protect, deleteTweet);
router.get("/user/:id", protect, getUserTweets);

export default router;
