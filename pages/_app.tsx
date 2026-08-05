import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import "../styles/globals.css";

type ConsentState = "granted" | "denied";

export default function App({ Component, pageProps }: AppProps) {
  const [consent, setConsent] = useState<ConsentState>("denied");
  const router = useRouter();

  // The inline snippets above only fire on a full page load. Client-side
  // navigation (order -> success, for example) would otherwise go unrecorded.
  useEffect(() => {
    const onRouteChange = (url: string) => {
      const w = window as any;
      if (typeof w.fbq === "function") w.fbq("track", "PageView");
      if (typeof w.gtag === "function" && process.env.NEXT_PUBLIC_GA4_ID) {
        w.gtag("config", process.env.NEXT_PUBLIC_GA4_ID, { page_path: url });
      }
    };
    router.events.on("routeChangeComplete", onRouteChange);
    return () => router.events.off("routeChangeComplete", onRouteChange);
  }, [router.events]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("marketing_consent") as ConsentState | null;
    if (saved === "granted" || saved === "denied") {
      setConsent(saved);
      return;
    }

    const w = window as any;
    if (typeof w.__tcfapi === "function") {
      try {
        w.__tcfapi("getTCData", 2, (tcData: any, success: boolean) => {
          if (!success || !tcData) return;
          const purposeConsents = tcData.purpose?.consents || {};
          const granted = purposeConsents[1] && purposeConsents[4];
          const next: ConsentState = granted ? "granted" : "denied";
          window.localStorage.setItem("marketing_consent", next);
          setConsent(next);
        });
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const gtag = (window as any).gtag;
    if (typeof gtag === "function") {
      gtag("consent", "update", {
        ad_storage: consent === "granted" ? "granted" : "denied",
        analytics_storage: consent === "granted" ? "granted" : "denied",
        ad_user_data: consent === "granted" ? "granted" : "denied",
        ad_personalization: consent === "granted" ? "granted" : "denied"
      });
    }
  }, [consent]);

  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const gaId = process.env.NEXT_PUBLIC_GA4_ID;
  const fbPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  return (
    <>
      <Script id="consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
        `}
      </Script>
      {gtmId && (
        <Script id="gtm-base" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      )}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);} 
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}
      {fbPixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
      <Component {...pageProps} consent={consent} setConsent={setConsent} />
    </>
  );
}
