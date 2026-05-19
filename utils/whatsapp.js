/**
 * WhatsApp Cloud API integration (Meta)
 * Requires:
 *  - WHATSAPP_TOKEN (permanent or system user access token)
 *  - WHATSAPP_PHONE_NUMBER_ID
 * Optional:
 *  - WHATSAPP_GRAPH_VERSION (default: v21.0)
 */

const cleanWhatsAppNumber = (raw) => {
  if (!raw) return '';
  return String(raw).replace(/[^0-9]/g, '');
};

export const sendWhatsAppText = async (to, message) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

  if (!token || !phoneNumberId) {
    return { success: false, simulated: true, message: 'WhatsApp env not configured' };
  }

  const cleanTo = cleanWhatsAppNumber(to);
  if (!cleanTo) {
    return { success: false, simulated: true, message: 'Missing recipient phone' };
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'text',
      text: { body: String(message || '').slice(0, 4096) }
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data?.error?.message || data?.error?.error_user_msg || 'WhatsApp API error';
    throw new Error(details);
  }
  return { success: true, data };
};

