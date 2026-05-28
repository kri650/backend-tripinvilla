import { sendPasswordResetOTP } from './utils/email.js';
import dotenv from 'dotenv';
dotenv.config(); // Because we run inside server/

async function test() {
  try {
    await sendPasswordResetOTP('admin@tripinvilla.com', 'Test User', '123456');
    console.log("Success");
  } catch (e) {
    console.error("Fail", e);
  }
}
test();
