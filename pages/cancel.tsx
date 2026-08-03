import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";

export default function Cancel() {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    const reservationId = String(router.query.reservation_id || "");
    const reservationIds = String(router.query.reservation_ids || "");
    if (reservationId || reservationIds) {
      const ids = reservationIds ? reservationIds.split(",").filter(Boolean) : reservationId ? [reservationId] : [];
      const rsig = String(router.query.rsig || "");
      fetch("/api/inventory/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, reservationIds: ids, rsig })
      }).catch(() => undefined);
    }
  }, [router.isReady, router.query.reservation_id]);
  return (
    <Layout title="Payment canceled" description="Payment canceled">
      <section className="section py-20">
        <div className="card p-10 text-center space-y-4">
          <h1 className="text-3xl font-semibold text-ink">Payment canceled</h1>
          <p className="text-slate-600">No worries — your payment was not completed.</p>
          <a href="/#order" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-white font-semibold">
            Return to checkout
          </a>
        </div>
      </section>
    </Layout>
  );
}
