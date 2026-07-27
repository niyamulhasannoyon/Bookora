import { google } from "googleapis";
import { db } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/encryption";

// Scope required for Google Calendar event management
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
];

export function getGoogleOAuthClient(redirectUri?: string) {
  const defaultRedirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/google-calendar/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || defaultRedirectUri
  );
}

/**
 * Generates Google OAuth Authorization URL for organization admin connection
 */
export function getGoogleOAuthUrl(organizationId: string, redirectUri?: string) {
  const oauth2Client = getGoogleOAuthClient(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_CALENDAR_SCOPES,
    prompt: "consent",
    state: organizationId,
  });
}

/**
 * Connects Google Calendar for an organization by exchanging authorization code for tokens
 * and storing them encrypted in the database.
 */
export async function connectGoogleCalendar(params: {
  organizationId: string;
  userId: string;
  code: string;
  redirectUri?: string;
}) {
  const { organizationId, userId, code, redirectUri } = params;

  // Verify user is owner or admin in the organization
  const membership = await db.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new Error("Unauthorized: Only organization owners or admins can connect Google Calendar.");
  }

  const oauth2Client = getGoogleOAuthClient(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Failed to retrieve access token from Google OAuth.");
  }

  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : "";
  const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);

  // If refresh_token wasn't returned in this flow (e.g. re-auth without prompt), attempt to keep existing refresh token
  let refreshTokenToSave = encryptedRefreshToken;
  if (!refreshTokenToSave) {
    const existing = await db.googleCalendarConnection.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
    if (existing) {
      refreshTokenToSave = existing.refreshToken;
    }
  }

  const connection = await db.googleCalendarConnection.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    create: {
      organizationId,
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: refreshTokenToSave,
      expiresAt,
    },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: refreshTokenToSave || undefined,
      expiresAt,
    },
  });

  return connection;
}

/**
 * Disconnects Google Calendar for an organization.
 */
export async function disconnectGoogleCalendar(params: {
  organizationId: string;
  userId?: string;
}) {
  const { organizationId, userId } = params;

  if (userId) {
    await db.googleCalendarConnection.deleteMany({
      where: { organizationId, userId },
    });
  } else {
    await db.googleCalendarConnection.deleteMany({
      where: { organizationId },
    });
  }

  return { success: true };
}

/**
 * Retrieves an authenticated Google Calendar API client with automatic token refresh.
 */
export async function getAuthenticatedCalendarClient(organizationId: string) {
  const connection = await db.googleCalendarConnection.findFirst({
    where: { organizationId },
  });

  if (!connection) {
    return { calendar: null, connection: null, reason: "NOT_CONNECTED" as const };
  }

  // Graceful fallback for local dev / mock mode
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "mock-google-client-id") {
    return {
      calendar: null,
      connection,
      isMock: true,
      reason: null,
    };
  }

  const oauth2Client = getGoogleOAuthClient();
  const rawAccessToken = decryptToken(connection.accessToken);
  const rawRefreshToken = decryptToken(connection.refreshToken);

  oauth2Client.setCredentials({
    access_token: rawAccessToken,
    refresh_token: rawRefreshToken,
    expiry_date: connection.expiresAt.getTime(),
  });

  // Check token expiration (with 5-minute buffer)
  const isExpired = connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (isExpired && rawRefreshToken) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      const newTokens = refreshed.credentials;

      const newEncryptedAccess = encryptToken(newTokens.access_token!);
      const newEncryptedRefresh = newTokens.refresh_token ? encryptToken(newTokens.refresh_token) : connection.accessToken;
      const newExpiresAt = new Date(newTokens.expiry_date || Date.now() + 3600 * 1000);

      await db.googleCalendarConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: newEncryptedAccess,
          refreshToken: newEncryptedRefresh,
          expiresAt: newExpiresAt,
        },
      });

      oauth2Client.setCredentials(newTokens);
    } catch (refreshErr) {
      console.error("Failed to refresh Google OAuth access token:", refreshErr);
    }
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return { calendar, connection, oauth2Client, isMock: false, reason: null };
}

/**
 * Creates a Google Calendar Event for a booking.
 * Non-blocking, handles token refresh, prevents duplicates, and updates calendarSyncStatus.
 */
export async function createCalendarEvent(params: { bookingId: string }): Promise<any> {
  const { bookingId } = params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      organization: true,
    },
  });

  if (!booking) {
    return { success: false, error: `Booking with ID ${bookingId} not found.` };
  }

  // Prevent duplicate event creation if event ID already exists
  if (booking.googleEventId) {
    return updateCalendarEvent({ bookingId });
  }

  const clientRes = await getAuthenticatedCalendarClient(booking.organizationId);

  if (!clientRes.connection) {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "NOT_CONNECTED",
        calendarSyncError: "Google Calendar not connected for this organization",
      },
    });
    return { success: false, status: "NOT_CONNECTED", error: "Google Calendar not connected" };
  }

  // Handle mock environment fallback for testing/local dev
  if (clientRes.isMock || !clientRes.calendar) {
    const mockEventId = `gcal_mock_event_${Date.now()}`;
    await db.booking.update({
      where: { id: bookingId },
      data: {
        googleEventId: mockEventId,
        calendarSyncStatus: "SYNCED",
        calendarSyncError: null,
      },
    });
    return { success: true, eventId: mockEventId, isMock: true };
  }

  const summary = `${booking.service.name} - ${booking.customerName}`;
  const description = [
    `Bookora Appointment`,
    `Service: ${booking.service.name}`,
    `Customer: ${booking.customerName}`,
    `Email: ${booking.customerEmail}`,
    `Phone: ${booking.customerPhone || "N/A"}`,
    `Notes: ${booking.notes || "None"}`,
  ].join("\n");

  try {
    const event = await clientRes.calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        start: { dateTime: booking.startAt.toISOString() },
        end: { dateTime: booking.endAt.toISOString() },
        attendees: booking.customerEmail ? [{ email: booking.customerEmail }] : [],
      },
    });

    const eventId = event.data.id!;
    await db.booking.update({
      where: { id: bookingId },
      data: {
        googleEventId: eventId,
        calendarSyncStatus: "SYNCED",
        calendarSyncError: null,
      },
    });

    return { success: true, eventId };
  } catch (err: any) {
    const errorMessage = err.message || "Failed to create Google Calendar event";
    console.error(`Google Calendar create event failed for booking ${bookingId}:`, err);

    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "FAILED",
        calendarSyncError: errorMessage,
      },
    });

    // Graceful failure - return status without throwing
    return { success: false, status: "FAILED", error: errorMessage };
  }
}

/**
 * Updates an existing Google Calendar Event for a booking.
 */
export async function updateCalendarEvent(params: { bookingId: string }): Promise<any> {
  const { bookingId } = params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      organization: true,
    },
  });

  if (!booking) {
    return { success: false, error: `Booking with ID ${bookingId} not found.` };
  }

  // If no existing Google Event ID, create one instead
  if (!booking.googleEventId) {
    return createCalendarEvent({ bookingId });
  }

  const clientRes = await getAuthenticatedCalendarClient(booking.organizationId);

  if (!clientRes.connection) {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "NOT_CONNECTED",
        calendarSyncError: "Google Calendar not connected",
      },
    });
    return { success: false, status: "NOT_CONNECTED", error: "Google Calendar not connected" };
  }

  if (clientRes.isMock || !clientRes.calendar) {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "SYNCED",
        calendarSyncError: null,
      },
    });
    return { success: true, eventId: booking.googleEventId, isMock: true };
  }

  const summary = `${booking.service.name} - ${booking.customerName}`;
  const description = [
    `Bookora Appointment`,
    `Service: ${booking.service.name}`,
    `Customer: ${booking.customerName}`,
    `Email: ${booking.customerEmail}`,
    `Phone: ${booking.customerPhone || "N/A"}`,
    `Notes: ${booking.notes || "None"}`,
  ].join("\n");

  try {
    await clientRes.calendar.events.patch({
      calendarId: "primary",
      eventId: booking.googleEventId,
      requestBody: {
        summary,
        description,
        start: { dateTime: booking.startAt.toISOString() },
        end: { dateTime: booking.endAt.toISOString() },
        attendees: booking.customerEmail ? [{ email: booking.customerEmail }] : [],
      },
    });

    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "SYNCED",
        calendarSyncError: null,
      },
    });

    return { success: true, eventId: booking.googleEventId };
  } catch (err: any) {
    const errorMessage = err.message || "Failed to update Google Calendar event";
    console.error(`Google Calendar update event failed for booking ${bookingId}:`, err);

    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "FAILED",
        calendarSyncError: errorMessage,
      },
    });

    return { success: false, status: "FAILED", error: errorMessage };
  }
}

/**
 * Deletes a Google Calendar Event for a booking.
 */
export async function deleteCalendarEvent(params: { bookingId: string }) {
  const { bookingId } = params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return { success: false, error: `Booking with ID ${bookingId} not found.` };
  }

  if (!booking.googleEventId) {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "DELETED",
        calendarSyncError: null,
      },
    });
    return { success: true };
  }

  const clientRes = await getAuthenticatedCalendarClient(booking.organizationId);

  if (!clientRes.connection || clientRes.isMock || !clientRes.calendar) {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "DELETED",
        calendarSyncError: null,
      },
    });
    return { success: true };
  }

  try {
    await clientRes.calendar.events.delete({
      calendarId: "primary",
      eventId: booking.googleEventId,
    });

    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "DELETED",
        calendarSyncError: null,
      },
    });

    return { success: true };
  } catch (err: any) {
    const errorMessage = err.message || "Failed to delete Google Calendar event";
    console.error(`Google Calendar delete event failed for booking ${bookingId}:`, err);

    await db.booking.update({
      where: { id: bookingId },
      data: {
        calendarSyncStatus: "FAILED",
        calendarSyncError: errorMessage,
      },
    });

    return { success: false, status: "FAILED", error: errorMessage };
  }
}

/**
 * Retries failed calendar synchronizations.
 */
export async function retryFailedCalendarSyncs(organizationId?: string) {
  const failedBookings = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      calendarSyncStatus: "FAILED",
      ...(organizationId ? { organizationId } : {}),
    },
  });

  const results = [];
  for (const booking of failedBookings) {
    const res = booking.googleEventId
      ? await updateCalendarEvent({ bookingId: booking.id })
      : await createCalendarEvent({ bookingId: booking.id });
    results.push({ bookingId: booking.id, ...res });
  }

  return results;
}

/**
 * Queries busy slots from Google Calendar for availability verification.
 */
export async function getGoogleCalendarBusySlots(params: {
  accessToken: string;
  refreshToken: string;
  calendarId?: string;
  timeMin: Date;
  timeMax: Date;
}) {
  const { accessToken, refreshToken, calendarId = "primary", timeMin, timeMax } = params;

  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "mock-google-client-id") {
    return [];
  }

  const oauth2Client = getGoogleOAuthClient();
  const decryptedAccess = decryptToken(accessToken);
  const decryptedRefresh = decryptToken(refreshToken);

  oauth2Client.setCredentials({
    access_token: decryptedAccess,
    refresh_token: decryptedRefresh,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  const busyTimes = response.data.calendars?.[calendarId]?.busy || [];

  return busyTimes.map((item) => ({
    start: new Date(item.start!),
    end: new Date(item.end!),
  }));
}
