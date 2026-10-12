import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      // Plural aliases from TAD §5 routes → canonical sidebar paths
      { source: "/doubts/:path*", destination: "/doubt/:path*", permanent: false },
      { source: "/referrals/:path*", destination: "/referral/:path*", permanent: false },
      { source: "/events/:path*", destination: "/event/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
