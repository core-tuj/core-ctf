/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions sudah stabil (default) di Next 14 — tidak perlu flag experimental.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // avatar Google OAuth
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Supabase Storage (file soal / attachment)
      },
    ],
  },
};

export default nextConfig;
