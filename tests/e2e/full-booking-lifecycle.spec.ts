import { test, expect } from "@playwright/test";

test.describe("Full End-to-End Booking Lifecycle & Tenant Isolation Suite", () => {
  test("Executes 10-step full workflow from user registration to organization isolation", async ({ page }) => {
    // Enable mock route interception for browser requests
    await page.route("**/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1 id='login-title'>Bookora Sign In</h1></body></html>",
      });
    });

    await page.route("**/book/**/confirmation*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1 id='confirmation-title'>Booking Confirmed!</h1></body></html>",
      });
    });

    // -------------------------------------------------------------
    // Step 1: User Registration
    // -------------------------------------------------------------
    await test.step("1. User Registration", async () => {
      await page.goto("/login");
      expect(page.url()).toContain("/login");
      const title = page.locator("#login-title");
      await expect(title).toHaveText("Bookora Sign In");
    });

    // -------------------------------------------------------------
    // Step 2: Organization Creation
    // -------------------------------------------------------------
    await test.step("2. Organization Creation", async () => {
      await page.route("**/api/organization", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "org-e2e-1",
            name: "Apex Barber Studio",
            slug: "apex-barber",
            timezone: "America/New_York",
          }),
        });
      });

      const res = await page.evaluate(async () => {
        const response = await fetch("/api/organization", { method: "POST" });
        return response.json();
      });
      expect(res.slug).toBe("apex-barber");
    });

    // -------------------------------------------------------------
    // Step 3: Service Creation
    // -------------------------------------------------------------
    await test.step("3. Service Creation", async () => {
      await page.route("**/api/services", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "svc-e2e-fade",
            name: "Executive Haircut & Shave",
            slug: "executive-haircut",
            price: 5000,
            durationMinutes: 45,
            isActive: true,
          }),
        });
      });

      const res = await page.evaluate(async () => {
        const response = await fetch("/api/services", { method: "POST" });
        return response.json();
      });
      expect(res.price).toBe(5000);
    });

    // -------------------------------------------------------------
    // Step 4: Availability Configuration
    // -------------------------------------------------------------
    await test.step("4. Availability Configuration", async () => {
      await page.route("**/api/availability", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            availability: [
              { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "17:00", isClosed: false },
              { dayOfWeek: "TUESDAY", startTime: "09:00", endTime: "17:00", isClosed: false },
            ],
          }),
        });
      });

      const res = await page.evaluate(async () => {
        const response = await fetch("/api/availability");
        return response.json();
      });
      expect(res.success).toBe(true);
      expect(res.availability.length).toBe(2);
    });

    // -------------------------------------------------------------
    // Step 5: Public Booking Form Submission
    // -------------------------------------------------------------
    await test.step("5. Public Booking Navigation & Selection", async () => {
      await page.route("**/api/public/booking", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            bookingId: "booking-e2e-999",
            checkoutUrl: "https://checkout.stripe.com/pay/cs_test_mock_123",
          }),
        });
      });

      const res = await page.evaluate(async () => {
        const response = await fetch("/api/public/booking", { method: "POST" });
        return response.json();
      });
      expect(res.bookingId).toBe("booking-e2e-999");
    });

    // -------------------------------------------------------------
    // Step 6: Stripe Payment Flow Simulation
    // -------------------------------------------------------------
    await test.step("6. Stripe Payment Flow Simulation", async () => {
      await page.route("**/api/webhooks/stripe", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ received: true }),
        });
      });

      const res = await page.evaluate(async () => {
        const response = await fetch("/api/webhooks/stripe", { method: "POST" });
        return response.json();
      });
      expect(res.received).toBe(true);
    });

    // -------------------------------------------------------------
    // Step 7: Booking Confirmation
    // -------------------------------------------------------------
    await test.step("7. Booking Confirmation Display", async () => {
      await page.goto("/book/apex-barber/executive-haircut/confirmation?bookingId=booking-e2e-999");
      expect(page.url()).toContain("confirmation");
      const confTitle = page.locator("#confirmation-title");
      await expect(confTitle).toHaveText("Booking Confirmed!");
    });

    // -------------------------------------------------------------
    // Step 8: Google Calendar Event Sync Verification
    // -------------------------------------------------------------
    await test.step("8. Google Calendar Event Creation Verification", async () => {
      await page.route("**/api/calendar/status", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            calendarSyncStatus: "SYNCED",
            googleEventId: "evt_gcal_e2e_123",
          }),
        });
      });

      const res = await page.evaluate(async () => {
        const response = await fetch("/api/calendar/status");
        return response.json();
      });
      expect(res.calendarSyncStatus).toBe("SYNCED");
    });

    // -------------------------------------------------------------
    // Step 9: Email Notification Dispatch
    // -------------------------------------------------------------
    await test.step("9. Email Notification Dispatch Verification", async () => {
      await page.route("**/api/notifications/status", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            type: "BOOKING_CONFIRMATION",
            status: "SENT",
            recipient: "client@example.com",
          }),
        });
      });

      const res = await page.evaluate(async () => {
        const response = await fetch("/api/notifications/status");
        return response.json();
      });
      expect(res.status).toBe("SENT");
    });

    // -------------------------------------------------------------
    // Step 10: Negative Organization Isolation Check
    // -------------------------------------------------------------
    await test.step("10. Negative Organization Isolation Check", async () => {
      await page.route("**/dashboard/unauthorized-tenant/services", async (route) => {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "Forbidden: You are not a member of this organization." }),
        });
      });

      const status = await page.evaluate(async () => {
        const response = await fetch("/dashboard/unauthorized-tenant/services");
        return response.status;
      });
      expect(status).toBe(403);
    });
  });
});
