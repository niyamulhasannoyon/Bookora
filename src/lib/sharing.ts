/**
 * Public Booking & Embed Sharing Utilities
 */

export interface IframeSnippetOptions {
  organizationSlug: string;
  baseUrl?: string;
  width?: string;
  height?: string;
  title?: string;
  border?: boolean;
  borderRadius?: string;
  theme?: "dark" | "light" | "auto";
}

/**
 * Resolves the base URL of the application.
 */
export function getBaseUrl(providedBaseUrl?: string): string {
  if (providedBaseUrl) return providedBaseUrl;
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return "https://bookora.com";
}

/**
 * Returns the public booking URL for an organization.
 */
export function getPublicBookingUrl(organizationSlug: string, baseUrl?: string): string {
  const base = getBaseUrl(baseUrl);
  return `${base}/book/${encodeURIComponent(organizationSlug)}`;
}

/**
 * Returns the embeddable booking URL for an organization.
 */
export function getEmbedBookingUrl(organizationSlug: string, baseUrl?: string): string {
  const base = getBaseUrl(baseUrl);
  return `${base}/embed/${encodeURIComponent(organizationSlug)}`;
}

/**
 * Generates an HTML iframe snippet ready to be copied and embedded into third-party sites.
 */
export function generateIframeSnippet({
  organizationSlug,
  baseUrl,
  width = "100%",
  height = "700",
  title = "Book an Appointment",
  border = false,
  borderRadius = "16px",
}: IframeSnippetOptions): string {
  const embedUrl = getEmbedBookingUrl(organizationSlug, baseUrl);
  const borderStyle = border ? "1px solid rgba(139, 92, 246, 0.3)" : "none";

  return `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border: ${borderStyle}; border-radius: ${borderRadius}; width: ${width}; height: ${height}px; max-width: 100%; overflow: hidden;"
  allow="payment"
  title="${title}"
></iframe>`;
}

/**
 * Copies string content to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
