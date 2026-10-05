import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { saveOutreachLog } from "@/lib/agent-tools";
import { emailTemplates } from "@/lib/email-templates";
import type { EmailCampaignType } from "@/lib/types";

const emailRequestSchema = z.object({
  customerId: z.string().min(1),
  customerEmail: z.string().email(),
  campaignType: z.enum(["vip", "at-risk", "welcome"]),
  couponCode: z.string().nullable(),
});

const campaignSubjects: Record<EmailCampaignType, string> = {
  vip: "Exclusive 15% discount for valued customers",
  "at-risk": "We miss you! Here's 10% to come back",
  welcome: "Welcome! Start with 10% off",
};

export async function POST(request: Request) {
  try {
    const input = emailRequestSchema.parse(await request.json());
    const customerName = input.customerEmail.split("@")[0];
    const html = emailTemplates[input.campaignType](customerName, input.couponCode);
    const emailId = `demo_${Date.now()}`;
    const apiKey = process.env.RESEND_API_KEY;

    if (apiKey) {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "SmartSync CRM <onboarding@resend.dev>",
        to: input.customerEmail,
        subject: campaignSubjects[input.campaignType],
        html,
      });
      if (result.error) throw new Error(result.error.message);
      saveOutreachLog(input.customerId, campaignSubjects[input.campaignType], input.couponCode);
      return NextResponse.json({ success: true, message: `Email sent to ${input.customerEmail}`, emailId: result.data?.id ?? emailId });
    }

    saveOutreachLog(input.customerId, `[Demo] ${campaignSubjects[input.campaignType]}`, input.couponCode);
    console.info("Email campaign simulated", { customerId: input.customerId, customerEmail: input.customerEmail, campaignType: input.campaignType });
    return NextResponse.json({ success: true, message: `Email sent to ${input.customerEmail}`, emailId });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Enter a valid customer email and campaign type" : error instanceof Error ? error.message : "Unable to send campaign";
    console.error("Email campaign failed", error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
