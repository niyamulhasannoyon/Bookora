import { Resend } from "resend";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import {
  renderBookingConfirmationEmail,
  renderPaymentReceiptEmail,
  renderCancellationEmail,
  renderRescheduleEmail,
  render24hReminderEmail,
  render1hReminderEmail,
  CommonTemplateParams,
} from "./email-templates";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

export interface RecipientInfo {
  email: string;
  name: string;
  role: "customer" | "owner" | "staff";
}

/**
 * Resolves all notification targets for a booking:
 * 1. Customer
 * 2. Organization Owner(s)
 * 3. Organization Staff Member(s)
 */
export async function resolveBookingRecipients(bookingId: string): Promise<{
  booking: any;
  recipients: RecipientInfo[];
} | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      organization: {
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!booking) {
    console.error(`[Notification Error] Booking not found for ID: ${bookingId}`);
    return null;
  }

  const recipients: RecipientInfo[] = [];
  const addedEmails = new Set<string>();

  // 1. Customer recipient
  if (booking.customerEmail) {
    const email = booking.customerEmail.toLowerCase().trim();
    recipients.push({
      email,
      name: booking.customerName || "Valued Customer",
      role: "customer",
    });
    addedEmails.add(email);
  }

  // 2. Organization Owner(s) & Staff
  const members = booking.organization?.members || [];
  for (const member of members) {
    const memberEmail = member.user?.email?.toLowerCase().trim();
    if (!memberEmail) continue;

    const role = member.role === "OWNER" || member.role === "ADMIN" ? "owner" : "staff";
    
    // If not already added as customer, add as owner/staff recipient
    if (!addedEmails.has(memberEmail)) {
      recipients.push({
        email: memberEmail,
        name: member.user.name || "Team Member",
        role,
      });
      addedEmails.add(memberEmail);
    }
  }

  return { booking, recipients };
}

/**
 * Sends a single email with exponential backoff retry logic.
 */
async function sendSingleEmailWithRetry(params: {
  to: string;
  subject: string;
  html: string;
  maxAttempts?: number;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, maxAttempts = 3 } = params;
  const from = process.env.EMAIL_FROM || "Bookora <notifications@bookora.com>";

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_mock_key") {
    console.log(`[Mock Email Sent] To: ${to} | Subject: ${subject}`);
    return { success: true, messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(7)}` };
  }

  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (response.error) {
        throw new Error(response.error.message || "Resend API error");
      }

      return { success: true, messageId: response.data?.id };
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(
        `[Resend Attempt ${attempt}/${maxAttempts} Failed] To: ${to} | Subject: ${subject} | Error: ${lastError}`
      );

      if (attempt < maxAttempts) {
        // Exponential backoff delay: 200ms, 400ms, 800ms...
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  // Log failure details
  console.error(`[Notification Failure Logged] All ${maxAttempts} attempts failed for ${to}. Error: ${lastError}`);
  return { success: false, error: lastError };
}

/**
 * Helper to dispatch notification to multiple recipients with deduplication and status recording.
 * Never throws an error (Non-blocking).
 */
async function dispatchNotification(params: {
  bookingId: string;
  notificationType: string;
  metadata?: Record<string, any>;
  renderForRecipient: (recipient: RecipientInfo, commonParams: CommonTemplateParams) => { subject: string; html: string };
}): Promise<{ success: boolean; recipientCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  try {
    const resolved = await resolveBookingRecipients(params.bookingId);
    if (!resolved) {
      return { success: false, recipientCount: 0, errors: ["Booking not found"] };
    }

    const { booking, recipients } = resolved;
    const startTimeFormatted = format(new Date(booking.startAt), "EEEE, MMMM d, yyyy 'at' h:mm a");
    const endTimeFormatted = format(new Date(booking.endAt), "h:mm a");
    const priceFormatted = formatPrice(booking.service.price, booking.service.currency);

    const baseTemplateParams: CommonTemplateParams = {
      bookingId: booking.id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      serviceName: booking.service.name,
      organizationName: booking.organization.name,
      startTimeFormatted,
      endTimeFormatted,
      priceFormatted,
      notes: booking.notes,
    };

    for (const recipient of recipients) {
      // 1. Idempotency Check: Prevent duplicate emails if SENT previously
      const existingSent = await db.notification.findFirst({
        where: {
          bookingId: booking.id,
          type: params.notificationType,
          recipient: recipient.email,
          status: "SENT",
        },
      });

      if (existingSent) {
        console.log(
          `[Notification Deduplicated] Notification ${params.notificationType} already SENT to ${recipient.email} for booking ${booking.id}`
        );
        successCount++;
        continue;
      }

      // 2. Render email content for target recipient role
      const { subject, html } = params.renderForRecipient(recipient, {
        ...baseTemplateParams,
        recipientRole: recipient.role,
      });

      // 3. Create or update Notification record in Prisma
      let notificationRecord = await db.notification.findFirst({
        where: {
          bookingId: booking.id,
          type: params.notificationType,
          recipient: recipient.email,
          status: "PENDING",
        },
      });

      if (!notificationRecord) {
        notificationRecord = await db.notification.create({
          data: {
            bookingId: booking.id,
            type: params.notificationType,
            recipient: recipient.email,
            status: "PENDING",
            attempts: 0,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          },
        });
      }

      // 4. Send email with retries
      const sendResult = await sendSingleEmailWithRetry({
        to: recipient.email,
        subject,
        html,
      });

      if (sendResult.success) {
        successCount++;
        await db.notification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "SENT",
            attempts: notificationRecord.attempts + 1,
            sentAt: new Date(),
            errorLog: null,
          },
        });
      } else {
        const errorMsg = sendResult.error || "Unknown dispatch failure";
        errors.push(`${recipient.email}: ${errorMsg}`);
        await db.notification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "FAILED",
            attempts: notificationRecord.attempts + 1,
            errorLog: errorMsg,
          },
        });
      }
    }

    return {
      success: errors.length === 0,
      recipientCount: recipients.length,
      errors,
    };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error(`[Notification Critical Exception] Booking ${params.bookingId}, Type ${params.notificationType}: ${msg}`);
    return { success: false, recipientCount: 0, errors: [msg] };
  }
}

/**
 * 1. sendBookingConfirmation()
 * Sends booking confirmation to Customer, Owner, and Staff.
 * Never blocks caller execution.
 */
export async function sendBookingConfirmation(bookingId: string): Promise<{ success: boolean; recipientCount: number; errors: string[] }> {
  return dispatchNotification({
    bookingId,
    notificationType: "BOOKING_CONFIRMATION",
    renderForRecipient: (recipient, commonParams) =>
      renderBookingConfirmationEmail({ ...commonParams, recipientRole: recipient.role }),
  });
}

/**
 * 2. sendCancellationEmail()
 * Sends cancellation notification to Customer, Owner, and Staff.
 * Never blocks caller execution.
 */
export async function sendCancellationEmail(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; recipientCount: number; errors: string[] }> {
  return dispatchNotification({
    bookingId,
    notificationType: "BOOKING_CANCELLED",
    metadata: { reason },
    renderForRecipient: (recipient, commonParams) =>
      renderCancellationEmail({ ...commonParams, reason, recipientRole: recipient.role }),
  });
}

/**
 * 3. sendRescheduleEmail()
 * Sends rescheduled notification to Customer, Owner, and Staff.
 * Never blocks caller execution.
 */
export async function sendRescheduleEmail(
  bookingId: string,
  oldStartAt?: Date
): Promise<{ success: boolean; recipientCount: number; errors: string[] }> {
  const oldStartTimeFormatted = oldStartAt
    ? format(new Date(oldStartAt), "EEEE, MMMM d, yyyy 'at' h:mm a")
    : "Previously Scheduled Time";

  return dispatchNotification({
    bookingId,
    notificationType: "BOOKING_RESCHEDULED",
    metadata: { oldStartAt: oldStartAt?.toISOString() },
    renderForRecipient: (recipient, commonParams) =>
      renderRescheduleEmail({
        ...commonParams,
        oldStartTimeFormatted,
        recipientRole: recipient.role,
      }),
  });
}

/**
 * 4. sendReminderEmail()
 * Sends 24h or 1h reminder email to Customer, Owner, and Staff.
 * Never blocks caller execution.
 */
export async function sendReminderEmail(
  bookingId: string,
  reminderType: "24h" | "1h"
): Promise<{ success: boolean; recipientCount: number; errors: string[] }> {
  const notificationType = reminderType === "24h" ? "REMINDER_24H" : "REMINDER_1H";

  return dispatchNotification({
    bookingId,
    notificationType,
    metadata: { reminderType },
    renderForRecipient: (recipient, commonParams) =>
      reminderType === "24h"
        ? render24hReminderEmail({ ...commonParams, recipientRole: recipient.role })
        : render1hReminderEmail({ ...commonParams, recipientRole: recipient.role }),
  });
}

/**
 * 5. sendPaymentReceipt()
 * Sends payment receipt email to Customer, Owner, and Staff.
 * Never blocks caller execution.
 */
export async function sendPaymentReceipt(bookingId: string): Promise<{ success: boolean; recipientCount: number; errors: string[] }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, payment: true },
  });

  const paymentAmountFormatted = booking?.payment
    ? formatPrice(booking.payment.amount, booking.payment.currency)
    : booking?.service
    ? formatPrice(booking.service.price, booking.service.currency)
    : "$0.00";

  const transactionId = booking?.payment?.stripePaymentIntentId || booking?.payment?.stripeSessionId || undefined;

  return dispatchNotification({
    bookingId,
    notificationType: "PAYMENT_RECEIVED",
    renderForRecipient: (recipient, commonParams) =>
      renderPaymentReceiptEmail({
        ...commonParams,
        paymentAmountFormatted,
        transactionId,
        recipientRole: recipient.role,
      }),
  });
}

// Backward compatibility helper functions
export async function sendBookingConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  organizationName: string;
  startTimeFormatted: string;
  priceFormatted: string;
  bookingId: string;
}) {
  return sendBookingConfirmation(params.bookingId);
}

export async function sendVerificationEmail(params: { email: string; token: string }) {
  const { email, token } = params;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyLink = `${baseUrl}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
      <h2 style="color: #8b5cf6; margin-bottom: 8px;">Verify Your Email Address</h2>
      <p style="color: #cbd5e1; font-size: 16px;">Welcome to <strong>Bookora</strong>! Please verify your email address to get started with your account.</p>
      
      <div style="margin: 32px 0;">
        <a href="${verifyLink}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px;">Or copy and paste this link in your browser:</p>
      <p style="color: #a78bfa; font-size: 13px; word-break: break-all;">${verifyLink}</p>
      <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">Powered by Bookora Multi-Tenant Booking SaaS</p>
    </div>
  `;

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_mock_key") {
    console.log(`[Mock Verification Email Sent] To: ${email} | Link: ${verifyLink}`);
    return { id: `msg_verify_mock_${Date.now()}` };
  }

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || "Bookora <notifications@bookora.com>",
    to: email,
    subject: "Verify your email address - Bookora",
    html,
  });
}

export async function sendPasswordResetEmail(params: { email: string; token: string }) {
  const { email, token } = params;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px;">
      <h2 style="color: #8b5cf6; margin-bottom: 8px;">Reset Your Password</h2>
      <p style="color: #cbd5e1; font-size: 16px;">You requested a password reset for your <strong>Bookora</strong> account. Click the button below to set a new password.</p>
      
      <div style="margin: 32px 0;">
        <a href="${resetLink}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <p style="color: #a78bfa; font-size: 13px; word-break: break-all;">${resetLink}</p>
      <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">Powered by Bookora Multi-Tenant Booking SaaS</p>
    </div>
  `;

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_mock_key") {
    console.log(`[Mock Password Reset Email Sent] To: ${email} | Link: ${resetLink}`);
    return { id: `msg_reset_mock_${Date.now()}` };
  }

  return await resend.emails.send({
    from: process.env.EMAIL_FROM || "Bookora <notifications@bookora.com>",
    to: email,
    subject: "Reset your password - Bookora",
    html,
  });
}
