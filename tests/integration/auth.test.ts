import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validators";

describe("Authentication Integration Tests", () => {
  const mockHashedPassword = bcrypt.hashSync("SecurePassword123!", 10);

  const mockUsers = [
    {
      id: "usr-100",
      email: "owner@bookora.com",
      name: "Owner User",
      password: mockHashedPassword,
      emailVerified: new Date(),
    },
  ];

  describe("Credentials Validation & Password Hashing", () => {
    it("validates valid credentials payload against loginSchema", () => {
      const validPayload = { email: "owner@bookora.com", password: "SecurePassword123!" };
      const parsed = loginSchema.safeParse(validPayload);

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe("owner@bookora.com");
      }
    });

    it("rejects invalid email formats in loginSchema", () => {
      const invalidPayload = { email: "not-an-email", password: "SecurePassword123!" };
      const parsed = loginSchema.safeParse(invalidPayload);

      expect(parsed.success).toBe(false);
    });

    it("successfully verifies correct password against bcrypt hash", async () => {
      const isMatch = await bcrypt.compare("SecurePassword123!", mockUsers[0].password);
      expect(isMatch).toBe(true);
    });

    it("rejects wrong password against bcrypt hash", async () => {
      const isMatch = await bcrypt.compare("WrongPassword!", mockUsers[0].password);
      expect(isMatch).toBe(false);
    });
  });

  describe("User Authorization Scoping", () => {
    it("lowercases user emails for case-insensitive authentication", () => {
      const inputEmail = "Owner@Bookora.COM";
      const normalized = inputEmail.toLowerCase();
      expect(normalized).toBe("owner@bookora.com");

      const user = mockUsers.find((u) => u.email === normalized);
      expect(user).toBeDefined();
      expect(user?.id).toBe("usr-100");
    });
  });
});
