import type { GetServerSideProps } from "next";
import { getConfig } from "../lib/siteConfig.server";

// Served from a route rather than public/robots.txt because the Sitemap
// directive must be an absolute URL, and the host is only known at runtime.
function Robots() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const config = await getConfig();
  const host = req.headers.host || "";
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const base = (config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : "")).replace(
    /\/$/,
    ""
  );

  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /success",
    "Disallow: /cancel",
    "",
    ...(base ? [`Sitemap: ${base}/sitemap.xml`] : [])
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.write(`${body}\n`);
  res.end();

  return { props: {} };
};

export default Robots;
