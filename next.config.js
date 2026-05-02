/** @type {import('next').NextConfig} */

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : '*.supabase.co';

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for its runtime scripts and hydration.
  // 'unsafe-eval' is needed by Next.js dev mode; safe to remove in a production-only build.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  // Supabase Storage serves uploaded images (logos, KYB docs previews)
  `img-src 'self' blob: data: https://images.unsplash.com https://${supabaseHost}`,
  "font-src 'self' data:",
  // Supabase realtime uses WebSockets (wss:) in addition to HTTPS
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.stripe.com`,
  // Stripe Elements renders inside a sandboxed iframe from js.stripe.com
  "frame-src https://js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  // Prevent the site from being embedded in iframes (clickjacking protection)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send the origin (not the full URL) as the referrer to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unused browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 2 years (only takes effect over HTTPS — safe to ship)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: supabaseHost },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
