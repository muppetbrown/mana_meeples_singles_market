"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.testEmail = testEmail;
// apps/api/src/services/emailService.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv = __importStar(require("dotenv"));
dotenv.config(); // loads .env in current directory automatically
let transporter = null;
function getTransport() {
    if (!transporter) {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASSWORD;
        const secure = process.env.SMTP_SECURE === "true";
        if (!host || !user || !pass) {
            throw new Error("SMTP credentials missing in environment variables.");
        }
        transporter = nodemailer_1.default.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
        });
    }
    return transporter;
}
async function sendEmail(to, subject, html, text, options) {
    try {
        const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@gmail.com";
        const result = await getTransport().sendMail({
            from,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ""),
            ...options,
        });
        console.log(`📨 Email sent successfully to ${to}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    }
    catch (error) {
        console.error("❌ Failed to send email:", error.message);
        return { success: false };
    }
}
async function testEmail() {
    try {
        await getTransport().verify();
        console.log("✅ SMTP connection verified.");
        return true;
    }
    catch (error) {
        console.error("❌ SMTP verification failed:", error.message);
        return false;
    }
}
