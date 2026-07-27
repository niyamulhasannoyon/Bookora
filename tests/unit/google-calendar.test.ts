import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  retryFailedCalendarSyncs,
  getGoogleOAuthUrl,
} from "@/lib/google-calendar";
import { encryptToken, decryptToken } from "@/lib/encryption";

// In-memory mock databases
const mockMemberships: any[] = [];
const mockConnections: any[] = [];
const mockBookings: any[] = [];

// Mock Google APIs
const mockInsertEvent = vi.fn();
const mockPatchEvent = vi.fn();
const mockDeleteEvent = vi.fn();
const mockGetToken = vi.fn();
const mockRefreshAccessToken = vi.fn();

vi.mock("googleapis", () => {
  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(() => ({
          generateAuthUrl: vi.fn(({ scope, state }) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}&scope=${scope.join("%20")}`),
          getToken: mockGetToken,
          setCredentials: vi.fn(),
          refreshAccessToken: mockRefreshAccessToken,
        })),
      },
      calendar: vi.fn().mockImplementation(() => ({
        events: {
          insert: mockInsertEvent,
          patch: mockPatchEvent,
          delete: mockDeleteEvent,
        },
      })),
    },
  };
});

// Mock database
vi.mock("@/lib/db", () => {
  const mockDb = {
    organizationMember: {
      findUnique: vi.fn(({ where }) => {
        return mockMemberships.find(
          (m) =>
            m.userId === where.userId_organizationId.userId &&
            m.organizationId === where.userId_organizationId.organizationId
        );
      }),
    },
    googleCalendarConnection: {
      findFirst: vi.fn(({ where }) => {
        return mockConnections.find((c) => c.organizationId === where.organizationId);
      }),
      findUnique: vi.fn(({ where }) => {
        return mockConnections.find(
          (c) =>
            c.organizationId === where.organizationId_userId.organizationId &&
            c.userId === where.organizationId_userId.userId
        );
      }),
      upsert: vi.fn(({ where, create, update }) => {
        let conn = mockConnections.find(
          (c) =>
            c.organizationId === where.organizationId_userId.organizationId &&
            c.userId === where.organizationId_userId.userId
        );
        if (conn) {
          Object.assign(conn, update);
        } else {
          conn = { id: `gconn-${Date.now()}`, ...create };
          mockConnections.push(conn);
        }
        return conn;
      }),
      deleteMany: vi.fn(({ where }) => {
        const initialCount = mockConnections.length;
        const remaining = mockConnections.filter((c) => c.organizationId !== where.organizationId);
        mockConnections.length = 0;
        mockConnections.push(...remaining);
        return { count: initialCount - remaining.length };
      }),
      update: vi.fn(({ where, data }) => {
        const conn = mockConnections.find((c) => c.id === where.id);
        if (conn) Object.assign(conn, data);
        return conn;
      }),
    },
    booking: {
      findUnique: vi.fn(({ where }) => {
        return mockBookings.find((b) => b.id === where.id);
      }),
      findMany: vi.fn(({ where }) => {
        return mockBookings.filter((b) => {
          const matchStatus = where.status ? b.status === where.status : true;
          const matchSync = where.calendarSyncStatus ? b.calendarSyncStatus === where.calendarSyncStatus : true;
          const matchOrg = where.organizationId ? b.organizationId === where.organizationId : true;
          return matchStatus && matchSync && matchOrg;
        });
      }),
      update: vi.fn(({ where, data }) => {
        const b = mockBookings.find((item) => item.id === where.id);
        if (b) Object.assign(b, data);
        return b;
      }),
    },
  };

  return { db: mockDb };
});

describe("Google Calendar Integration Unit Tests", () => {
  const orgId = "org-acme";
  const ownerId = "user-owner";
  const memberId = "user-member";

  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberships.length = 0;
    mockConnections.length = 0;
    mockBookings.length = 0;

    // Set mock process env for Google Client ID
    process.env.GOOGLE_CLIENT_ID = "valid-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "valid-google-client-secret";

    // Setup mock organization memberships
    mockMemberships.push({
      userId: ownerId,
      organizationId: orgId,
      role: "OWNER",
    });
    mockMemberships.push({
      userId: memberId,
      organizationId: orgId,
      role: "MEMBER",
    });

    // Default mock response for Google OAuth token exchange
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: "mock-google-access-token",
        refresh_token: "mock-google-refresh-token",
        expiry_date: Date.now() + 3600 * 1000,
      },
    });

    // Default mock response for event insertion
    mockInsertEvent.mockResolvedValue({
      data: { id: "gcal_event_12345" },
    });
  });

  describe("Google OAuth Url & Scope Verification", () => {
    it("generates authorization URL requesting minimum calendar.events scope", () => {
      const url = getGoogleOAuthUrl(orgId);
      expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("calendar.events");
      expect(url).toContain(orgId);
    });
  });

  describe("connectGoogleCalendar()", () => {
    it("allows organization OWNER or ADMIN to connect Google Calendar and encrypts tokens", async () => {
      const connection = await connectGoogleCalendar({
        organizationId: orgId,
        userId: ownerId,
        code: "auth-code-123",
      });

      expect(connection.organizationId).toBe(orgId);
      expect(connection.userId).toBe(ownerId);
      // Verify tokens are stored encrypted
      expect(connection.accessToken).not.toBe("mock-google-access-token");
      expect(decryptToken(connection.accessToken)).toBe("mock-google-access-token");
      expect(decryptToken(connection.refreshToken)).toBe("mock-google-refresh-token");
    });

    it("blocks non-admin/non-owner members from connecting Google Calendar", async () => {
      await expect(
        connectGoogleCalendar({
          organizationId: orgId,
          userId: memberId,
          code: "auth-code-123",
        })
      ).rejects.toThrow("Unauthorized: Only organization owners or admins can connect Google Calendar.");
    });
  });

  describe("disconnectGoogleCalendar()", () => {
    it("removes Google Calendar connection for organization", async () => {
      // Connect first
      await connectGoogleCalendar({
        organizationId: orgId,
        userId: ownerId,
        code: "auth-code-123",
      });
      expect(mockConnections.length).toBe(1);

      // Disconnect
      const res = await disconnectGoogleCalendar({ organizationId: orgId });
      expect(res.success).toBe(true);
      expect(mockConnections.length).toBe(0);
    });
  });

  describe("createCalendarEvent()", () => {
    const bookingId = "b-100";

    beforeEach(async () => {
      // Create connection
      await connectGoogleCalendar({
        organizationId: orgId,
        userId: ownerId,
        code: "auth-code-123",
      });

      // Create initial booking
      mockBookings.push({
        id: bookingId,
        organizationId: orgId,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "+15550199",
        notes: "Prefers morning appointments",
        startAt: new Date("2026-08-01T10:00:00Z"),
        endAt: new Date("2026-08-01T10:30:00Z"),
        status: "CONFIRMED",
        calendarSyncStatus: "PENDING",
        service: { name: "Dental Checkup" },
        organization: { name: "Smile Clinic" },
      });
    });

    it("creates calendar event with customer email attendee, service details, and updates sync status", async () => {
      const result = await createCalendarEvent({ bookingId });

      expect(result.success).toBe(true);
      expect(result.eventId).toBe("gcal_event_12345");

      // Verify Google Calendar API payload
      expect(mockInsertEvent).toHaveBeenCalledWith({
        calendarId: "primary",
        requestBody: expect.objectContaining({
          summary: "Dental Checkup - Jane Doe",
          description: expect.stringContaining("Jane Doe"),
          attendees: [{ email: "jane@example.com" }],
        }),
      });

      // Verify booking status was updated
      const updatedBooking = mockBookings.find((b) => b.id === bookingId);
      expect(updatedBooking.googleEventId).toBe("gcal_event_12345");
      expect(updatedBooking.calendarSyncStatus).toBe("SYNCED");
      expect(updatedBooking.calendarSyncError).toBeNull();
    });

    it("prevents duplicate event creation if googleEventId is already set on booking", async () => {
      const booking = mockBookings.find((b) => b.id === bookingId);
      booking.googleEventId = "gcal_existing_999";
      mockPatchEvent.mockResolvedValue({ data: { id: "gcal_existing_999" } });

      await createCalendarEvent({ bookingId });

      // Should call patch (update) instead of insert (create duplicate)
      expect(mockInsertEvent).not.toHaveBeenCalled();
      expect(mockPatchEvent).toHaveBeenCalled();
    });

    it("handles missing Google Calendar connection gracefully without throwing", async () => {
      mockConnections.length = 0; // Clear connection

      const result = await createCalendarEvent({ bookingId });

      expect(result.success).toBe(false);
      expect(result.status).toBe("NOT_CONNECTED");

      const updatedBooking = mockBookings.find((b) => b.id === bookingId);
      expect(updatedBooking.calendarSyncStatus).toBe("NOT_CONNECTED");
    });

    it("handles API failure gracefully by setting calendarSyncStatus to FAILED without throwing", async () => {
      mockInsertEvent.mockRejectedValue(new Error("Google API 503 Service Unavailable"));

      const result = await createCalendarEvent({ bookingId });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.error).toContain("Google API 503");

      const updatedBooking = mockBookings.find((b) => b.id === bookingId);
      expect(updatedBooking.calendarSyncStatus).toBe("FAILED");
      expect(updatedBooking.calendarSyncError).toContain("503 Service Unavailable");
    });
  });

  describe("updateCalendarEvent() & deleteCalendarEvent()", () => {
    const bookingId = "b-200";

    beforeEach(async () => {
      await connectGoogleCalendar({
        organizationId: orgId,
        userId: ownerId,
        code: "auth-code-123",
      });

      mockBookings.push({
        id: bookingId,
        organizationId: orgId,
        customerName: "Alex Smith",
        customerEmail: "alex@example.com",
        googleEventId: "gcal_event_existing",
        startAt: new Date("2026-08-02T14:00:00Z"),
        endAt: new Date("2026-08-02T15:00:00Z"),
        status: "CONFIRMED",
        calendarSyncStatus: "SYNCED",
        service: { name: "Consultation" },
        organization: { name: "Smile Clinic" },
      });
    });

    it("updates calendar event and marks sync status SYNCED", async () => {
      mockPatchEvent.mockResolvedValue({ data: { id: "gcal_event_existing" } });

      const res = await updateCalendarEvent({ bookingId });
      expect(res.success).toBe(true);

      expect(mockPatchEvent).toHaveBeenCalledWith({
        calendarId: "primary",
        eventId: "gcal_event_existing",
        requestBody: expect.objectContaining({
          summary: "Consultation - Alex Smith",
        }),
      });
    });

    it("deletes calendar event and marks sync status DELETED", async () => {
      mockDeleteEvent.mockResolvedValue({});

      const res = await deleteCalendarEvent({ bookingId });
      expect(res.success).toBe(true);

      const booking = mockBookings.find((b) => b.id === bookingId);
      expect(booking.calendarSyncStatus).toBe("DELETED");
    });
  });

  describe("retryFailedCalendarSyncs()", () => {
    it("retries syncing all confirmed bookings with FAILED calendarSyncStatus", async () => {
      await connectGoogleCalendar({
        organizationId: orgId,
        userId: ownerId,
        code: "auth-code-123",
      });

      mockBookings.push({
        id: "b-failed-1",
        organizationId: orgId,
        customerName: "Failed Customer",
        customerEmail: "failed@example.com",
        startAt: new Date("2026-08-05T09:00:00Z"),
        endAt: new Date("2026-08-05T09:30:00Z"),
        status: "CONFIRMED",
        calendarSyncStatus: "FAILED",
        calendarSyncError: "Network error",
        service: { name: "Haircut" },
        organization: { name: "Barber" },
      });

      mockInsertEvent.mockResolvedValue({ data: { id: "gcal_retry_success_123" } });

      const results = await retryFailedCalendarSyncs(orgId);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].eventId).toBe("gcal_retry_success_123");

      const booking = mockBookings.find((b) => b.id === "b-failed-1");
      expect(booking.calendarSyncStatus).toBe("SYNCED");
    });
  });
});
