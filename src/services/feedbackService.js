import {
  bot,
  TELEGRAM_CHAT_ID,
  formatFeedbackMessage,
} from "../config/telegram.js";

export class FeedbackService {
  static async sendFeedback(feedbackData) {
    const message = formatFeedbackMessage(feedbackData);

    await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    return true;
  }
}
