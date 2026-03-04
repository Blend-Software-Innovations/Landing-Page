import { useState } from "react";
import Layout from "../components/Layout";

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone })
      });
      if (!response.ok) {
        setError("Order not found. Please check your details.");
      } else {
        const data = (await response.json()) as { order: any };
        setResult(data.order);
      }
    } catch {
      setError("Unable to check order status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Track Order" description="Track your order status">
      <section className="section py-20">
        <div className="card p-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-semibold text-ink">Track your order</h1>
          <p className="text-slate-600 mt-2">Enter your order ID and phone number to see status.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              placeholder="Order ID"
              required
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              placeholder="Phone number"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-slate-900 px-6 py-3 text-white font-semibold"
            >
              {loading ? "Checking..." : "Check status"}
            </button>
          </form>
          {error && <div className="mt-4 text-sm text-rose-600">{error}</div>}
          {result && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
              <div><strong>Status:</strong> {result.status}</div>
              {result.trackingCode && <div><strong>Tracking:</strong> {result.trackingCode}</div>}
              {result.shippingPartner && <div><strong>Courier:</strong> {result.shippingPartner}</div>}
              <div><strong>Placed:</strong> {new Date(result.createdAt).toLocaleString()}</div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
