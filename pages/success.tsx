import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";

export default function Success() {
  const router = useRouter();
  const [status, setStatus] = useState("Sending SMS confirmation...");

  useEffect(() => {
    if (!router.isReady) return;
    const sessionId = String(router.query.session_id || "");
    const reservationId = String(router.query.reservation_id || "");
    const reservationIds = String(router.query.reservation_ids || "");
    if (!sessionId) {
      setStatus("Order confirmed. SMS will be sent shortly.");
      return;
    }
    fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    })
      .then((res) => {
        if (!res.ok) throw new Error("SMS failed");
        setStatus("Order confirmed. SMS sent successfully.");
      })
      .catch(() => setStatus("Order confirmed. SMS may arrive shortly."));

    if (reservationId || reservationIds) {
      const ids = reservationIds ? reservationIds.split(",").filter(Boolean) : reservationId ? [reservationId] : [];
      fetch("/api/inventory/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, reservationIds: ids })
      }).catch(() => undefined);
    }

    if (typeof window !== "undefined") {
      const last = window.localStorage.getItem("last_checkout");
      if (last) {
        try {
          const parsed = JSON.parse(last) as { value?: number; items?: any[] };
          if (window.localStorage.getItem("marketing_consent") === "granted") {
            const gtag = (window as any).gtag;
            if (typeof gtag === "function") {
              gtag("event", "purchase", { currency: "BDT", value: parsed.value || 0 });
            }
            const fbq = (window as any).fbq;
            if (typeof fbq === "function") {
              fbq("track", "Purchase", { currency: "BDT", value: parsed.value || 0 });
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }, [router.isReady, router.query.session_id]);

  return (
    <Layout title="Payment Success" description="Payment succeeded">
      <section className="section py-20">
        <div className="card p-10 text-center space-y-4">
          <h1 className="text-3xl font-semibold text-ink">Payment successful</h1>
          <p className="text-slate-600">Thank you! Your order has been received.</p>
          <p className="text-sm text-slate-500">{status}</p>
          <a href="/" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-white font-semibold">
            Back to home
          </a>
        </div>
      </section>
    </Layout>
  );
}
