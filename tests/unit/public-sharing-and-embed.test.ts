import { describe, it, expect } from "vitest";
import {
  getPublicBookingUrl,
  getEmbedBookingUrl,
  generateIframeSnippet,
  getBaseUrl,
} from "@/lib/sharing";
import nextConfig from "../../next.config";

describe("Public Booking Sharing & Embed Widget Unit Tests", () => {
  describe("URL Generation Utilities", () => {
    it("generates correct base URL fallback", () => {
      const url = getBaseUrl("https://yourapp.com");
      expect(url).toBe("https://yourapp.com");
    });

    it("generates correct public booking URL for organization slug", () => {
      const url = getPublicBookingUrl("elite-salon", "https://yourapp.com");
      expect(url).toBe("https://yourapp.com/book/elite-salon");
    });

    it("encodes organization slug with special characters safely", () => {
      const url = getPublicBookingUrl("salon & spa", "https://yourapp.com");
      expect(url).toBe("https://yourapp.com/book/salon%20%26%20spa");
    });

    it("generates correct embed booking URL for organization slug", () => {
      const embedUrl = getEmbedBookingUrl("elite-salon", "https://yourapp.com");
      expect(embedUrl).toBe("https://yourapp.com/embed/elite-salon");
    });
  });

  describe("HTML Iframe Snippet Generator", () => {
    it("generates standard responsive iframe snippet", () => {
      const snippet = generateIframeSnippet({
        organizationSlug: "elite-salon",
        baseUrl: "https://yourapp.com",
        width: "100%",
        height: "700",
        title: "Book with Elite Salon",
      });

      expect(snippet).toContain('<iframe');
      expect(snippet).toContain('src="https://yourapp.com/embed/elite-salon"');
      expect(snippet).toContain('width="100%"');
      expect(snippet).toContain('height="700"');
      expect(snippet).toContain('title="Book with Elite Salon"');
      expect(snippet).toContain('allow="payment"');
      expect(snippet).toContain('</iframe>');
    });

    it("applies border style when border option is enabled", () => {
      const snippetBorder = generateIframeSnippet({
        organizationSlug: "elite-salon",
        baseUrl: "https://yourapp.com",
        border: true,
      });

      expect(snippetBorder).toContain("border: 1px solid rgba(139, 92, 246, 0.3)");
    });

    it("removes border style when border option is disabled", () => {
      const snippetNoBorder = generateIframeSnippet({
        organizationSlug: "elite-salon",
        baseUrl: "https://yourapp.com",
        border: false,
      });

      expect(snippetNoBorder).toContain("border: none");
    });
  });

  describe("CORS & Security Configuration", () => {
    it("configures iframe embedding CSP frame-ancestors * in next.config.ts", async () => {
      if (typeof nextConfig.headers === "function") {
        const headersList = await nextConfig.headers();
        const embedHeaderConfig = headersList.find((h) => h.source === "/embed/:path*");

        expect(embedHeaderConfig).toBeDefined();
        const cspHeader = embedHeaderConfig?.headers.find((h) => h.key === "Content-Security-Policy");
        expect(cspHeader?.value).toBe("frame-ancestors *;");

        const corsHeader = embedHeaderConfig?.headers.find((h) => h.key === "Access-Control-Allow-Origin");
        expect(corsHeader?.value).toBe("*");
      }
    });
  });
});
