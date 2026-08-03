import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
    return (
      <Html lang="bn">
        <Head>
          <meta name="theme-color" content="#0b0b0f" />
          {/* Marks the document as JS-capable before first paint. Scroll-reveal
              styles only hide content under `.js`, so setting this in an effect
              instead would flash the content in and back out — and a failed
              hydration would leave the page permanently blank. */}
          <script
            dangerouslySetInnerHTML={{
              __html: "document.documentElement.classList.add('js')"
            }}
          />
        </Head>
        <body>
          {gtmId ? (
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          ) : null}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
