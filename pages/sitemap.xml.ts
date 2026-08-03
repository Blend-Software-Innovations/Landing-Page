import type { GetServerSideProps } from "next";
import { getConfig } from "../lib/siteConfig.server";

function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const config = await getConfig();
  // Fall back to the request host so the sitemap is never empty just because
  // siteUrl has not been filled in yet.
  const host = req.headers.host || "";
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const base = (
    config.siteUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (host ? `${proto}://${host}` : "")
  ).replace(/\/$/, "");
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = base
    ? [
        `  <url>\n    <loc>${base}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`
      ]
    : [];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>"
  ].join("\n");

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();

  return { props: {} };
};

export default Sitemap;
