import type { EmailCampaignType } from "./types";

function emailShell(title: string, content: string) {
  return `<div style="background:#f7f8f5;padding:40px 20px;font-family:Arial,sans-serif;color:#1e2725"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e4e9e4;border-radius:8px;padding:36px"><p style="color:#5d8d68;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">SmartSync CRM</p><h1 style="font-size:28px;line-height:1.1">${title}</h1>${content}<p style="color:#75817d;font-size:12px;margin-top:32px">You are receiving this because you are part of our customer community.</p></div></div>`;
}

export function getVIPTemplate(customerName: string, couponCode: string | null) {
  return emailShell("A thank-you, reserved for you", `<p>Hi ${customerName},</p><p>Your continued support means a lot to us. Enjoy an exclusive 15% reward on your next order${couponCode ? ` with code <strong>${couponCode}</strong>` : ""}.</p><p>We picked a few new favorites we think you will love.</p>`);
}

export function getAtRiskTemplate(customerName: string, couponCode: string | null) {
  return emailShell("We saved something for your return", `<p>Hi ${customerName},</p><p>We miss seeing you. Come back and rediscover something you love${couponCode ? ` with 10% off using <strong>${couponCode}</strong>` : ""}.</p><p>This little welcome-back offer is available for a limited time.</p>`);
}

export function getWelcomeTemplate(customerName: string, couponCode: string | null) {
  return emailShell("Welcome to the community", `<p>Hi ${customerName},</p><p>We are glad you are here. Start your next order with a 10% welcome reward${couponCode ? ` using <strong>${couponCode}</strong>` : ""}.</p><p>We will keep sharing products and ideas selected for you.</p>`);
}

export const emailTemplates: Record<EmailCampaignType, (name: string, coupon: string | null) => string> = {
  vip: getVIPTemplate,
  "at-risk": getAtRiskTemplate,
  welcome: getWelcomeTemplate,
};
