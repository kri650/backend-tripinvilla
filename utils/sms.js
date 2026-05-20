/**
 * Fast2SMS Gateway Integration
 * Docs: https://docs.fast2sms.com/
 */
export const sendSMSOTP = async (phone, otpCode) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ FAST2SMS_API_KEY is not set in .env');
    return { success: false, simulated: true };
  }

  // Standardize the mobile number (Fast2SMS expects 10 digits without +91 country prefix)
  let cleanPhone = String(phone).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.substring(2);
  }

  if (cleanPhone.length !== 10) {
    throw new Error(`Invalid phone number format: ${phone}. Must be 10 digits.`);
  }

  const senderId = process.env.FAST2SMS_SENDER_ID;
  const templateId = process.env.FAST2SMS_TEMPLATE_ID;

  let requestBody = {};

  if (templateId && senderId) {
    // DLT route — use when you have registered Sender ID + Template ID on TRAI portal
    requestBody = {
      route: 'dlt',
      numbers: cleanPhone,
      sender_id: senderId,
      message: templateId,
      variables_values: otpCode,
      flash: 0
    };
  } else {
    // Quick SMS route — works with Fast2SMS registered accounts (no DLT needed)
    requestBody = {
      route: 'q',
      message: `Your TripInVilla verification code is: ${otpCode}. Valid for 5 minutes. Do not share with anyone.`,
      language: 'english',
      flash: 0,
      numbers: cleanPhone
    };
  }

  console.log(`[SMS] Sending OTP to ${cleanPhone} via Fast2SMS (route: ${requestBody.route})...`);
  console.log(`[SMS] Request body:`, JSON.stringify(requestBody));

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('[SMS] Fast2SMS Response:', JSON.stringify(data));

    if (data.return === true) {
      console.log(`[SMS] ✅ OTP SMS delivered to ${cleanPhone}`);
      return { success: true, data };
    } else {
      const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Unknown Fast2SMS error');
      console.error(`[SMS] ❌ Fast2SMS rejected request: ${errMsg}`);
      throw new Error(`Fast2SMS Error: ${errMsg}`);
    }
  } catch (err) {
    if (err.message && err.message.startsWith('Fast2SMS Error:')) {
      throw err;
    }
    console.error('[SMS] Network/fetch error calling Fast2SMS:', err.message);
    throw new Error(`SMS network error: ${err.message}`);
  }
};
