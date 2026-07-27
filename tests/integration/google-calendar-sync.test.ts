import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { getAuthenticatedCalendarClient } from "@/lib/google-calendar";

vi.mock("@/lib/db", () => {
  const mockConnections: any[] = [];
  return {
    db: {
      googleCalendarConnection: {
        findFirst: vi.fn(({ where }) => {
          return mockConnections.find((c) => c.organizationId === where.organizationId) || null;
        }),
        _mockConnections: mockConnections,
      },
    },
  };
});

describe("Google Calendar Integration Tests", () => {
  describe("AES-256 Token Encryption & Decryption", () => {
    it("encrypts and decrypts OAuth tokens securely without data loss", () => {
      const plainToken = "ya29.a0AfB_mock_google_oauth_access_token_12345";

      const encrypted = encryptToken(plainToken);
      expect(encrypted).not.toBe(plainToken);
      expect(typeof encrypted).toBe("string");

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plainToken);
    });
  });

  describe("Google Calendar Client Authentication Resolution", () => {
    it("returns NOT_CONNECTED reason when no GoogleCalendarConnection record exists", async () => {
      const result = await getAuthenticatedCalendarClient("org-no-gcal");
      expect(result.connection).toBeNull();
      expect(result.reason).toBe("NOT_CONNECTED");
    });
  });
});
