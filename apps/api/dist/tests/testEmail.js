"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/scripts/testEmail.ts
const emailService_js_1 = require("../services/emailService.js");
(async () => {
    console.log("📧 Sending test email via Gmail SMTP...");
    const result = await (0, emailService_js_1.sendEmail)("muppetbrown@gmail.com", "Mana & Meeples SMTP Test", `<h1>Hello!</h1>
     <p>This is a test email sent from your backend using Gmail SMTP.</p>`);
    console.log("✅ Result:", result);
})();
