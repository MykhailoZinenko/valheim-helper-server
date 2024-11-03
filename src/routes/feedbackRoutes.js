import express from "express";
import { FeedbackService } from "../services/feedbackService.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { name, email, issueType, description } = req.body;

    if (!name || !email || !issueType || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await FeedbackService.sendFeedback({ name, email, issueType, description });

    res.status(200).json({
      success: true,
      message: "Feedback sent successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
