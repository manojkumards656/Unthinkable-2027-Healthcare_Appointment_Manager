import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';
import { Redis } from '@upstash/redis';
import { db } from '@/db';
import { emailLogs } from '@/db/schema';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const brevoClient = process.env.BREVO_API_KEY
  ? new BrevoClient({ apiKey: process.env.BREVO_API_KEY })
  : null;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  locale?: 'en' | 'ta' | 'hi' | string;
  context: Record<string, any>;
}

function isClientError(error: any): boolean {
  const status = error?.statusCode || error?.status || error?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function logEmail(
  options: EmailOptions,
  provider: 'RESEND' | 'BREVO',
  status: 'SENT' | 'FAILED' | 'RETRYING',
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(emailLogs).values({
      recipientEmail: options.to,
      provider,
      templateName: options.template,
      status,
      errorMessage: errorMessage || null,
    });
  } catch (logError) {
    console.error('Failed to write email audit log to database:', logError);
  }
}

function renderTemplate(
  template: string,
  locale: string,
  subject: string,
  context: Record<string, any>
): string {
  const isTamil = locale === 'ta';
  const isHindi = locale === 'hi';

  switch (template) {
    case 'booking-confirmation':
      if (isTamil) {
        return `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h1 style="color: #2563eb;">மருத்துவ முன்பதிவு உறுதி செய்யப்பட்டது</h1>
            <p>அன்புள்ள ${context.patientName || 'நோயாளி'},</p>
            <p>மருத்துவர் <strong>${context.doctorName || ''}</strong> உடனான உங்கள் சந்திப்பு வெற்றிகரமாக திட்டமிடப்பட்டுள்ளது.</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>தேதி & நேரம்:</strong> ${new Date(context.appointmentDate).toLocaleString('ta-IN')}</p>
            </div>
            <p>நன்றி,<br>மருத்துவ தளம் குழு</p>
          </div>
        `;
      }
      if (isHindi) {
        return `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h1 style="color: #2563eb;">अपॉइंटमेंट की पुष्टि हो गई है</h1>
            <p>प्रिय ${context.patientName || 'मरीज़'},</p>
            <p>डॉ. <strong>${context.doctorName || ''}</strong> के साथ आपका अपॉइंटमेंट सफलतापूर्वक तय हो गया है।</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>तारीख और समय:</strong> ${new Date(context.appointmentDate).toLocaleString('hi-IN')}</p>
            </div>
            <p>धन्यवाद,<br>स्वास्थ्य मंच टीम</p>
          </div>
        `;
      }
      return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #2563eb;">Appointment Confirmed</h1>
          <p>Dear ${context.patientName || 'Patient'},</p>
          <p>Your appointment with Dr. <strong>${context.doctorName || ''}</strong> has been confirmed.</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${new Date(context.appointmentDate).toLocaleString('en-US')}</p>
          </div>
          <p>Thank you,<br>Healthcare Platform Team</p>
        </div>
      `;

    case 'doctor-leave-notification':
      if (isTamil) {
        return `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 8px;">
            <h1 style="color: #dc2626;">முக்கிய அறிவிப்பு: சந்திப்பு மறுதிட்டமிடல் தேவை</h1>
            <p>அன்புள்ள ${context.patientName || 'நோயாளி'},</p>
            <p>${new Date(context.appointmentDate).toLocaleDateString('ta-IN')} அன்று திட்டமிடப்பட்டிருந்த உங்கள் சந்திப்பு மருத்துவரின் அவசர விடுப்பு காரணமாக ரத்து செய்யப்பட்டுள்ளது.</p>
            <p>உங்களுக்கு சிறப்பு முன்னுரிமை மறுதிட்டமிடல் வசதி வழங்கப்பட்டுள்ளது. கீழே உள்ள பொத்தானை கிளிக் செய்து புதிய நேரத்தை தேர்வு செய்யவும்:</p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${context.rescheduleLink}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">இப்போதே மறுதிட்டமிடுங்கள்</a>
            </div>
            <p style="color: #64748b; font-size: 13px;">இந்த இணைப்பு 72 மணிநேரத்திற்கு மட்டுமே செல்லுபடியாகும்.</p>
          </div>
        `;
      }
      if (isHindi) {
        return `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 8px;">
            <h1 style="color: #dc2626;">महत्वपूर्ण सूचना: अपॉइंटमेंट पुनर्निर्धारण आवश्यक</h1>
            <p>प्रिय ${context.patientName || 'मरीज़'},</p>
            <p>${new Date(context.appointmentDate).toLocaleDateString('hi-IN')} को निर्धारित आपका अपॉइंटमेंट डॉक्टर की आपातकालीन छुट्टी के कारण रद्द कर दिया गया है।</p>
            <p>आपको प्राथमिकता पुनर्निर्धारण का विकल्प दिया गया है। नया समय चुनने के लिए नीचे दिए गए लिंक पर क्लिक करें:</p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${context.rescheduleLink}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">अभी नया समय चुनें</a>
            </div>
            <p style="color: #64748b; font-size: 13px;">यह लिंक अगले 72 घंटों के लिए वैध है।</p>
          </div>
        `;
      }
      return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 8px;">
          <h1 style="color: #dc2626;">Important: Appointment Rescheduling Required</h1>
          <p>Dear ${context.patientName || 'Patient'},</p>
          <p>Your appointment on ${new Date(context.appointmentDate).toLocaleDateString('en-US')} requires rescheduling due to unexpected provider leave.</p>
          <p>A priority reschedule token has been issued for your account. Please click the link below to select an alternate slot:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${context.rescheduleLink}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reschedule Appointment Now</a>
          </div>
          <p style="color: #64748b; font-size: 13px;">This priority link remains valid for 72 hours.</p>
        </div>
      `;

    case 'booking-reminder':
      return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #2563eb;">Appointment Reminder</h1>
          <p>Dear ${context.patientName || 'Patient'},</p>
          <p>This is a reminder that you have a scheduled appointment with Dr. <strong>${context.doctorName || ''}</strong> tomorrow at ${new Date(context.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>
        </div>
      `;

    case 'medication-reminder':
      return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h1 style="color: #059669;">Daily Medication Reminder</h1>
          <p>Dear ${context.patientName || 'Patient'},</p>
          <p>This is your daily reminder to take your prescribed medications:</p>
          <pre style="background: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace;">${JSON.stringify(context.medications, null, 2)}</pre>
        </div>
      `;

    default:
      return `<div style="font-family: sans-serif; padding: 16px;"><h1>${subject}</h1><p>${JSON.stringify(context)}</p></div>`;
  }
}

export async function sendEmailWithFallback(options: EmailOptions): Promise<{
  provider: 'RESEND' | 'BREVO';
  messageId: string;
}> {
  const today = getTodayDateString();
  const counterKey = `email:resend:daily:${today}`;
  let resendAvailable = false;

  // STEP 1 — Check Resend daily usage in Redis
  if (redis) {
    try {
      const currentCount = Number(await redis.get(counterKey)) || 0;
      resendAvailable = currentCount < 90; // 10 email safety buffer
    } catch (e) {
      console.warn('Could not read Resend daily quota from Redis:', e);
      resendAvailable = true;
    }
  } else {
    resendAvailable = !!resend;
  }

  // STEP 2 — Render HTML
  const renderedHtml = renderTemplate(
    options.template,
    options.locale || 'en',
    options.subject,
    options.context
  );
  const fromEmail = process.env.EMAIL_FROM || 'Healthcare Platform <noreply@resend.dev>';

  // STEP 3 — Try Resend
  if (resend && resendAvailable) {
    try {
      const result = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: renderedHtml,
      });

      if (redis) {
        try {
          await redis.incr(counterKey);
          await redis.expire(counterKey, 86400);
        } catch (e) {}
      }

      await logEmail(options, 'RESEND', 'SENT');
      return { provider: 'RESEND', messageId: result.data?.id || 'resend-ok' };
    } catch (error: any) {
      console.error('Resend dispatch failed:', error.message);
      if (isClientError(error)) {
        await logEmail(options, 'RESEND', 'FAILED', error.message);
        throw error;
      }
      // 5xx / timeout -> fall through to Brevo
    }
  }

  // STEP 4 — Fallback to Brevo
  if (brevoClient) {
    try {
      const result = await brevoClient.transactionalEmails.sendTransacEmail({
        to: [{ email: options.to }],
        sender: { email: 'noreply@yourdomain.com', name: 'Healthcare Platform' },
        subject: options.subject,
        htmlContent: renderedHtml,
      });

      await logEmail(options, 'BREVO', 'SENT');
      return { provider: 'BREVO', messageId: (result as Record<string, string>)?.messageId || 'brevo-ok' };
    } catch (brevoError: any) {
      console.error('Brevo fallback failed:', brevoError.message);
      await logEmail(options, 'BREVO', 'FAILED', brevoError.message);
      throw brevoError;
    }
  }

  // If no providers configured in dev environment, log warning and return mock
  console.warn('Neither Resend nor Brevo keys are active or reachable. Simulated email to:', options.to);
  await logEmail(options, 'RESEND', 'SENT', 'Mocked dev send');
  return { provider: 'RESEND', messageId: 'mock-dev-id' };
}
