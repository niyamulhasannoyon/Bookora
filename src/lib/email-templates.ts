export interface CommonTemplateParams {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  organizationName: string;
  startTimeFormatted: string;
  endTimeFormatted?: string;
  priceFormatted: string;
  recipientRole?: "customer" | "owner" | "staff";
  notes?: string | null;
  manageUrl?: string;
}

export interface CancellationTemplateParams extends CommonTemplateParams {
  reason?: string;
}

export interface RescheduleTemplateParams extends CommonTemplateParams {
  oldStartTimeFormatted: string;
}

export interface PaymentReceiptTemplateParams extends CommonTemplateParams {
  paymentAmountFormatted: string;
  paymentMethod?: string;
  transactionId?: string;
}

function getHeaderBanner(title: string, badgeText: string, badgeBg: string, badgeColor: string) {
  return `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">
        ${badgeText}
      </div>
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; padding: 0;">${title}</h1>
    </div>
  `;
}

function getFooter(organizationName: string) {
  return `
    <div style="border-top: 1px solid #334155; margin-top: 32px; padding-top: 24px; text-align: center;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0;">
        Thank you for choosing <strong>${organizationName}</strong>.
      </p>
      <p style="color: #64748b; font-size: 11px; margin: 0;">
        Powered by Bookora &bull; Multi-Tenant Booking SaaS Platform
      </p>
    </div>
  `;
}

function getRecipientNotice(role?: "customer" | "owner" | "staff") {
  if (role === "owner") {
    return `<div style="background-color: #1e1b4b; border-left: 4px solid #8b5cf6; padding: 12px; margin-bottom: 20px; border-radius: 4px; font-size: 13px; color: #c7d2fe;">
      <strong>Organization Owner Copy:</strong> A new activity has occurred for your organization.
    </div>`;
  }
  if (role === "staff") {
    return `<div style="background-color: #1e1b4b; border-left: 4px solid #6366f1; padding: 12px; margin-bottom: 20px; border-radius: 4px; font-size: 13px; color: #c7d2fe;">
      <strong>Staff Member Copy:</strong> You are assigned to this appointment session.
    </div>`;
  }
  return "";
}

/**
 * 1. Booking Confirmation Email Template
 */
export function renderBookingConfirmationEmail(params: CommonTemplateParams): { subject: string; html: string } {
  const {
    customerName,
    serviceName,
    organizationName,
    startTimeFormatted,
    priceFormatted,
    notes,
    recipientRole = "customer",
    bookingId,
  } = params;

  const subject = recipientRole === "customer"
    ? `Booking Confirmed: ${serviceName} with ${organizationName}`
    : `New Booking Confirmed: ${serviceName} (${customerName})`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px 16px; margin: 0;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px;">
        ${getHeaderBanner("Booking Confirmed! 🎉", "Appointment Confirmed", "#064e3b", "#34d399")}
        ${getRecipientNotice(recipientRole)}
        
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hi <strong>${customerName}</strong>, your reservation for <strong>${serviceName}</strong> has been successfully booked with <strong>${organizationName}</strong>.
        </p>

        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 35%;">Service:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Date & Time:</td>
              <td style="padding: 8px 0; color: #a78bfa; font-weight: 700;">${startTimeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Price:</td>
              <td style="padding: 8px 0; color: #34d399; font-weight: 600;">${priceFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Booking Reference:</td>
              <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace;">${bookingId}</td>
            </tr>
            ${notes ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Notes:</td>
              <td style="padding: 8px 0; color: #e2e8f0; font-style: italic;">${notes}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          We look forward to hosting you! If you need to make changes, please get in touch with ${organizationName}.
        </p>

        ${getFooter(organizationName)}
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 2. Payment Receipt Email Template
 */
export function renderPaymentReceiptEmail(params: PaymentReceiptTemplateParams): { subject: string; html: string } {
  const {
    customerName,
    serviceName,
    organizationName,
    paymentAmountFormatted,
    transactionId,
    startTimeFormatted,
    recipientRole = "customer",
    bookingId,
  } = params;

  const subject = recipientRole === "customer"
    ? `Payment Receipt from ${organizationName}`
    : `Payment Received: ${paymentAmountFormatted} from ${customerName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px 16px; margin: 0;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px;">
        ${getHeaderBanner("Payment Successful 💳", "Payment Receipt", "#065f46", "#6ee7b7")}
        ${getRecipientNotice(recipientRole)}

        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hi <strong>${customerName}</strong>, your payment for <strong>${serviceName}</strong> has been received by <strong>${organizationName}</strong>.
        </p>

        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 35%;">Amount Paid:</td>
              <td style="padding: 8px 0; color: #34d399; font-weight: 800; font-size: 18px;">${paymentAmountFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Service:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Scheduled For:</td>
              <td style="padding: 8px 0; color: #a78bfa; font-weight: 600;">${startTimeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Booking Ref:</td>
              <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace;">${bookingId}</td>
            </tr>
            ${transactionId ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Transaction ID:</td>
              <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace; font-size: 12px;">${transactionId}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          This email serves as your official payment receipt.
        </p>

        ${getFooter(organizationName)}
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 3. Booking Cancellation Email Template
 */
export function renderCancellationEmail(params: CancellationTemplateParams): { subject: string; html: string } {
  const {
    customerName,
    serviceName,
    organizationName,
    startTimeFormatted,
    reason,
    recipientRole = "customer",
    bookingId,
  } = params;

  const subject = recipientRole === "customer"
    ? `Booking Cancelled: ${serviceName} with ${organizationName}`
    : `Appointment Cancelled: ${serviceName} (${customerName})`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px 16px; margin: 0;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px;">
        ${getHeaderBanner("Booking Cancelled ❌", "Cancelled", "#7f1d1d", "#fca5a5")}
        ${getRecipientNotice(recipientRole)}

        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hi <strong>${customerName}</strong>, your appointment for <strong>${serviceName}</strong> with <strong>${organizationName}</strong> has been cancelled.
        </p>

        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 35%;">Service:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Originally For:</td>
              <td style="padding: 8px 0; color: #cbd5e1;">${startTimeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Booking Ref:</td>
              <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace;">${bookingId}</td>
            </tr>
            ${reason ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Reason:</td>
              <td style="padding: 8px 0; color: #fca5a5; font-style: italic;">${reason}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          If you wish to reschedule or book a new appointment, please visit our booking page.
        </p>

        ${getFooter(organizationName)}
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 4. Booking Rescheduled Email Template
 */
export function renderRescheduleEmail(params: RescheduleTemplateParams): { subject: string; html: string } {
  const {
    customerName,
    serviceName,
    organizationName,
    oldStartTimeFormatted,
    startTimeFormatted,
    recipientRole = "customer",
    bookingId,
  } = params;

  const subject = recipientRole === "customer"
    ? `Booking Rescheduled: ${serviceName} with ${organizationName}`
    : `Appointment Rescheduled: ${serviceName} (${customerName})`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px 16px; margin: 0;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px;">
        ${getHeaderBanner("Booking Rescheduled 📅", "Schedule Updated", "#78350f", "#fde047")}
        ${getRecipientNotice(recipientRole)}

        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hi <strong>${customerName}</strong>, your appointment for <strong>${serviceName}</strong> with <strong>${organizationName}</strong> has been rescheduled.
        </p>

        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 35%;">Service:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Previous Time:</td>
              <td style="padding: 8px 0; color: #94a3b8; text-decoration: line-through;">${oldStartTimeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">New Date & Time:</td>
              <td style="padding: 8px 0; color: #a78bfa; font-weight: 800; font-size: 15px;">${startTimeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Booking Ref:</td>
              <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace;">${bookingId}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          Please note your new appointment time. We look forward to seeing you then!
        </p>

        ${getFooter(organizationName)}
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 5. 24-Hour Reminder Email Template
 */
export function render24hReminderEmail(params: CommonTemplateParams): { subject: string; html: string } {
  const {
    customerName,
    serviceName,
    organizationName,
    startTimeFormatted,
    priceFormatted,
    recipientRole = "customer",
    bookingId,
  } = params;

  const subject = recipientRole === "customer"
    ? `Reminder: Appointment Tomorrow with ${organizationName}`
    : `Reminder (24h): ${serviceName} with ${customerName} tomorrow`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px 16px; margin: 0;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px;">
        ${getHeaderBanner("Upcoming Appointment ⏰", "24-Hour Reminder", "#1e1b4b", "#c7d2fe")}
        ${getRecipientNotice(recipientRole)}

        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hi <strong>${customerName}</strong>, this is a friendly reminder that your appointment for <strong>${serviceName}</strong> with <strong>${organizationName}</strong> is scheduled in 24 hours.
        </p>

        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 35%;">Service:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Time:</td>
              <td style="padding: 8px 0; color: #a78bfa; font-weight: 700;">${startTimeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Price:</td>
              <td style="padding: 8px 0; color: #cbd5e1;">${priceFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Booking Ref:</td>
              <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace;">${bookingId}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          If you need to contact us prior to your appointment, please reach out to ${organizationName}.
        </p>

        ${getFooter(organizationName)}
      </div>
    </div>
  `;

  return { subject, html };
}

/**
 * 6. 1-Hour Reminder Email Template
 */
export function render1hReminderEmail(params: CommonTemplateParams): { subject: string; html: string } {
  const {
    customerName,
    serviceName,
    organizationName,
    startTimeFormatted,
    recipientRole = "customer",
    bookingId,
  } = params;

  const subject = recipientRole === "customer"
    ? `Starting Soon: Appointment in 1 Hour with ${organizationName}`
    : `Reminder (1h): ${serviceName} with ${customerName} starting in 1 hour`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px 16px; margin: 0;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px;">
        ${getHeaderBanner("Starting in 1 Hour ⏳", "1-Hour Reminder", "#581c87", "#e9d5ff")}
        ${getRecipientNotice(recipientRole)}

        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hi <strong>${customerName}</strong>, your appointment for <strong>${serviceName}</strong> with <strong>${organizationName}</strong> starts in <strong>1 hour</strong>.
        </p>

        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; width: 35%;">Service:</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Start Time:</td>
              <td style="padding: 8px 0; color: #c084fc; font-weight: 800; font-size: 16px;">${startTimeFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Booking Ref:</td>
              <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace;">${bookingId}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px;">
          Please ensure you are ready at the scheduled time. See you soon!
        </p>

        ${getFooter(organizationName)}
      </div>
    </div>
  `;

  return { subject, html };
}
