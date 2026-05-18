/**
 * Fast2SMS Gateway Integration
 */
export const sendSMSOTP = async (phone, otpCode) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ FAST2SMS_API_KEY is not set in .env. Falling back to simulated OTP delivery.');
    return { success: false, simulated: true };
  }

  // Standardize the mobile number (Fast2SMS expects 10 digits without +91 country prefix)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.substring(2);
  }

  const senderId = process.env.FAST2SMS_SENDER_ID;
  const templateId = process.env.FAST2SMS_TEMPLATE_ID;

  let requestBody = {};
  
  if (templateId && senderId) {
    // 1. Custom DLT route (if you have your own registered Sender and Template IDs)
    requestBody = {
      route: 'dlt',
      numbers: cleanPhone,
      sender_id: senderId,
      message: templateId,
      variables_values: otpCode,
      flash: 0
    };
  } else {
    // 2. Generic pre-approved Fast2SMS OTP route (works instantly out-of-the-box!)
    requestBody = {
      route: 'otp',
      numbers: cleanPhone,
      variables_values: otpCode
    };
  }

  try {
    console.log(`[SMS] Sending Fast2SMS request for ${cleanPhone}...`);
    
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('[SMS] Fast2SMS Gateway Response:', data);

    if (data.return === true) {
      return { success: true, data };
    } else {
      throw new Error(data.message || 'Fast2SMS API returned return=false response');
    }
  } catch (err) {
    console.error('[SMS] Fast2SMS request execution failed:', err);
    throw err;
  }
};
