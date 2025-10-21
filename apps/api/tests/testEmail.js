// apps/api/src/scripts/testEmail.ts
import { sendEmail } from "../src/services/emailService.js";

(async () => {
  console.log("📧 Sending test email via Gmail SMTP...");

  const result = await sendEmail(
    "muppetbrown@gmail.com",
    "Mana & Meeples SMTP Test",
    `<h1>Hello!</h1>
     <p>This is a test email sent from your backend using Gmail SMTP.</p>`
  );

  console.log("✅ Result:", result);
})();
