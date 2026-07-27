"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Code2,
  Download,
  ExternalLink,
  Sparkles,
  X,
  Globe,
  Layers,
  Smartphone,
  Monitor,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPublicBookingUrl,
  getEmbedBookingUrl,
  generateIframeSnippet,
  copyToClipboard,
} from "@/lib/sharing";

interface ShareBookingModalProps {
  organizationSlug: string;
  organizationName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareBookingModal({
  organizationSlug,
  organizationName,
  isOpen,
  onClose,
}: ShareBookingModalProps) {
  const [activeTab, setActiveTab] = useState<"link" | "qr" | "embed">("link");

  // Copy Feedback States
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedEmbedUrl, setCopiedEmbedUrl] = useState(false);

  // QR Code Customization States
  const [qrFgColor, setQrFgColor] = useState("#8b5cf6"); // Violet 500
  const [qrBgColor, setQrBgColor] = useState("#ffffff"); // White
  const [qrIncludeMargin, setQrIncludeMargin] = useState(true);

  // Embed Customization States
  const [iframeWidth, setIframeWidth] = useState("100%");
  const [iframeHeight, setIframeHeight] = useState("700");
  const [iframeBorder, setIframeBorder] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const qrContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const publicUrl = getPublicBookingUrl(organizationSlug);
  const embedUrl = getEmbedBookingUrl(organizationSlug);
  const iframeSnippet = generateIframeSnippet({
    organizationSlug,
    width: iframeWidth,
    height: iframeHeight,
    title: `Book an Appointment with ${organizationName}`,
    border: iframeBorder,
  });

  const handleCopyLink = async () => {
    const success = await copyToClipboard(publicUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyEmbedUrl = async () => {
    const success = await copyToClipboard(embedUrl);
    if (success) {
      setCopiedEmbedUrl(true);
      setTimeout(() => setCopiedEmbedUrl(false), 2500);
    }
  };

  const handleCopyIframeSnippet = async () => {
    const success = await copyToClipboard(iframeSnippet);
    if (success) {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2500);
    }
  };

  const handleDownloadQR = (format: "svg" | "png") => {
    if (!qrContainerRef.current) return;
    const svgElement = qrContainerRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });

    if (format === "svg") {
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(svgBlob);
      downloadLink.download = `${organizationSlug}-booking-qr.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      return;
    }

    // Convert SVG to Canvas to download PNG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const svgUrl = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = qrBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1000, 1000);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${organizationSlug}-booking-qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  };

  // Social Share URLs
  const encodedUrl = encodeURIComponent(publicUrl);
  const encodedText = encodeURIComponent(`Book your appointment with ${organizationName} online:`);
  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(`Book an Appointment with ${organizationName}`)}&body=${encodedText}%20${encodedUrl}`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity">
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Share2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white capitalize flex items-center gap-2">
                Share Booking Page
              </h2>
              <p className="text-xs text-slate-400">
                {organizationName} • <span className="font-mono text-violet-400">/book/{organizationSlug}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-4 bg-slate-950/30 border-b border-slate-800/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab("link")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === "link"
                ? "border-violet-500 text-violet-300 bg-violet-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Copy Booking Link</span>
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === "qr"
                ? "border-violet-500 text-violet-300 bg-violet-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>QR Code Generator</span>
          </button>
          <button
            onClick={() => setActiveTab("embed")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === "embed"
                ? "border-violet-500 text-violet-300 bg-violet-500/10"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Embed Widget & Iframe</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: DIRECT BOOKING LINK */}
          {activeTab === "link" && (
            <div className="space-y-6">
              <div className="glass-card p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-slate-900 to-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    Unique Organization Booking URL
                  </label>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live & Active
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-violet-300 focus:outline-none focus:border-violet-500 select-all"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl gap-2 shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Share this link on Instagram bio, Google Business listing, SMS, or emails so clients can schedule directly.
                </p>
              </div>

              {/* Social Share Buttons */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quick Social & Direct Messaging Share
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <a
                    href={shareLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={shareLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-semibold transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Twitter / X</span>
                  </a>
                  <a
                    href={shareLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Facebook</span>
                  </a>
                  <a
                    href={shareLinks.email}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-xs font-semibold transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Email Link</span>
                  </a>
                </div>
              </div>

              {/* Page Test Action */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-white">Preview Public Booking Page</p>
                  <p className="text-[11px] text-slate-400">Test how your page looks to clients in a new tab.</p>
                </div>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs border-slate-700 hover:bg-slate-800 gap-1.5">
                    <span>Open Link</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: QR CODE GENERATOR */}
          {activeTab === "qr" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code Display Card */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-4">
                  <div
                    ref={qrContainerRef}
                    className="p-4 rounded-2xl shadow-xl transition-all"
                    style={{ backgroundColor: qrBgColor }}
                  >
                    <QRCodeSVG
                      value={publicUrl}
                      size={200}
                      fgColor={qrFgColor}
                      bgColor={qrBgColor}
                      level="H"
                      includeMargin={qrIncludeMargin}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white capitalize">{organizationName}</p>
                    <p className="text-[11px] text-slate-400">Scan with smartphone camera to book</p>
                  </div>
                </div>

                {/* QR Styling Controls & Download */}
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                      QR Code Customization
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Module Color (Foreground)</label>
                        <div className="flex items-center gap-2">
                          {["#8b5cf6", "#6366f1", "#06b6d4", "#10b981", "#000000"].map((c) => (
                            <button
                              key={c}
                              onClick={() => setQrFgColor(c)}
                              className={`h-7 w-7 rounded-full border-2 transition-transform ${
                                qrFgColor === c ? "scale-110 border-white" : "border-transparent opacity-80 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <input
                            type="color"
                            value={qrFgColor}
                            onChange={(e) => setQrFgColor(e.target.value)}
                            className="h-7 w-7 rounded-full bg-transparent border-0 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Background Contrast</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQrBgColor("#ffffff")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              qrBgColor === "#ffffff"
                                ? "bg-white text-slate-900 border-white"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            Light (Recommended)
                          </button>
                          <button
                            onClick={() => setQrBgColor("#0f172a")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              qrBgColor === "#0f172a"
                                ? "bg-slate-900 text-white border-violet-500"
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            Dark Mode
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download Buttons */}
                  <div className="pt-2 space-y-2">
                    <label className="block text-[11px] text-slate-400 font-semibold">Download High-Res Assets</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleDownloadQR("png")}
                        className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download PNG</span>
                      </Button>
                      <Button
                        onClick={() => handleDownloadQR("svg")}
                        variant="outline"
                        className="border-slate-700 hover:bg-slate-800 text-xs font-semibold gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Vector SVG</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMBED WIDGET & IFRAME */}
          {activeTab === "embed" && (
            <div className="space-y-6">
              {/* Embed Intro */}
              <div className="glass-card p-4 rounded-2xl border border-violet-500/20 bg-violet-950/20 text-xs text-slate-300 space-y-1">
                <p className="font-bold text-violet-300 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-violet-400" />
                  Embed Booking Experience Directly into Your Website
                </p>
                <p className="text-slate-400 text-[11px]">
                  Copy the code snippet below and paste it into WordPress, Wix, Squarespace, Webflow, or any custom website.
                </p>
              </div>

              {/* Iframe Code Generator Box */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Embed HTML Code Snippet
                  </label>
                  <Button
                    onClick={handleCopyIframeSnippet}
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs gap-1.5"
                  >
                    {copiedEmbed ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedEmbed ? "Snippet Copied!" : "Copy Embed Code"}</span>
                  </Button>
                </div>

                <div className="relative">
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto selection:bg-violet-500/40">
                    {iframeSnippet}
                  </pre>
                </div>
              </div>

              {/* Customization & Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Widget Width</label>
                  <input
                    type="text"
                    value={iframeWidth}
                    onChange={(e) => setIframeWidth(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Widget Height (px)</label>
                  <input
                    type="text"
                    value={iframeHeight}
                    onChange={(e) => setIframeHeight(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 pt-4">
                  <label className="text-[11px] font-semibold text-slate-400 cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={iframeBorder}
                      onChange={(e) => setIframeBorder(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-900 text-violet-600 focus:ring-violet-500"
                    />
                    <span>Border Highlight</span>
                  </label>
                </div>
              </div>

              {/* Direct Embed URL Quick Access */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs">
                <div className="truncate pr-2">
                  <span className="text-slate-400">Direct Embed URL: </span>
                  <span className="font-mono text-violet-300 font-semibold">{embedUrl}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyEmbedUrl}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                  >
                    {copiedEmbedUrl ? "Copied!" : "Copy URL"}
                  </button>
                  <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Live Interactive Preview */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live Iframe Interactive Preview
                  </h3>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-1 rounded text-xs ${
                        previewDevice === "desktop" ? "bg-violet-600 text-white" : "text-slate-400"
                      }`}
                      title="Desktop View"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-1 rounded text-xs ${
                        previewDevice === "mobile" ? "bg-violet-600 text-white" : "text-slate-400"
                      }`}
                      title="Mobile View"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className={`mx-auto transition-all border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl ${
                    previewDevice === "mobile" ? "max-w-[380px]" : "w-full"
                  }`}
                  style={{ height: "420px" }}
                >
                  <iframe
                    src={embedUrl}
                    title="Live Booking Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Organization: <strong className="text-white capitalize">{organizationName}</strong></span>
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-800 hover:bg-slate-900 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
