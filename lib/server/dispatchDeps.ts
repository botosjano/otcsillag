import { LinkSeeMeSmsProvider, NullSmsProvider, type SmsProvider } from "@/lib/server/providers/sms";
import { MyLinkEmailProvider, NullEmailProvider, type EmailProvider } from "@/lib/server/providers/email";
import type { DispatchMessageDeps } from "@/lib/server/dispatch";

/** 18.3 alap email-sablon + 18.2 alap SMS-sablon (spec). */
const DEFAULT_SMS_TEMPLATE = "Köszönjük, hogy minket választott! Értékelés: {{review.link}}";
const DEFAULT_EMAIL_TEMPLATE = {
  subject: "Megosztanád velünk a tapasztalatodat?",
  text: "Szia {{customer.first_name}}!\n\nKöszönjük, hogy szolgáltatásunkat választottad. Ha van egy perced, kérjük, írd meg a tapasztalatodat a Google-on:\n{{review.link}}\n\nKöszönjük!",
  html: "<p>Szia {{customer.first_name}}!</p><p>Köszönjük, hogy szolgáltatásunkat választottad. Ha van egy perced, kérjük, írd meg a tapasztalatodat a Google-on:</p><p><a href=\"{{review.link}}\">{{review.link}}</a></p><p>Köszönjük!</p>",
};

function smsProvider(): SmsProvider {
  const apiKey = process.env.LINK_SEEME_API_KEY;
  return apiKey ? new LinkSeeMeSmsProvider(apiKey) : new NullSmsProvider();
}

function emailProvider(): EmailProvider {
  const apiKey = process.env.MYLINK_EMAIL_API_KEY;
  return apiKey ? new MyLinkEmailProvider(apiKey) : new NullEmailProvider();
}

export function buildDispatchDeps(): DispatchMessageDeps {
  return {
    smsProvider: smsProvider(),
    emailProvider: emailProvider(),
    businessName: process.env.OTCSILLAG_BUSINESS_NAME ?? "Ötcsillag",
    fromEmail: process.env.OTCSILLAG_FROM_EMAIL ?? "ertesites@otcsillag.hu",
    replyToEmail: process.env.OTCSILLAG_REPLY_TO_EMAIL ?? "support@otcsillag.hu",
    smsTemplate: DEFAULT_SMS_TEMPLATE,
    emailTemplate: DEFAULT_EMAIL_TEMPLATE,
  };
}
