/**
 * Telegram notifications.
 */
import { getSecret } from './secrets';
import { logError, logInfo } from './logger';

export async function sendTelegram(html: string): Promise<boolean> {
  const token = await getSecret('TELEGRAM_BOT_TOKEN');
  const chatId = await getSecret('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!res.ok) {
      logError('telegram', `sendMessage failed: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (e: any) {
    logError('telegram', `sendMessage error: ${e.message}`);
    return false;
  }
}

export async function notifyPostSuccess(topic: string, targets: string[]) {
  await sendTelegram(
    `<b>Đã đăng bài</b>\n\n${topic}\n${targets.map((t) => `• ${t}`).join('\n')}`
  );
  logInfo('telegram', 'Success notification sent');
}

export async function notifyPostFailed(topic: string, error: string) {
  await sendTelegram(`<b>Đăng bài thất bại</b>\n\n${topic}\n<code>${error}</code>`);
}

export async function notifySystem(message: string) {
  await sendTelegram(`<b>System</b>\n${message}`);
}
