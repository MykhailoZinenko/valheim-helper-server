import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const formatFeedbackMessage = (feedback) => {
  return `
🔔 New Feedback Received

👤 User: ${feedback.name}
📧 Email: ${feedback.email}
📝 Type: ${feedback.issueType}

💬 Message:
${feedback.description}
`;
};

export { bot, TELEGRAM_CHAT_ID, formatFeedbackMessage };
