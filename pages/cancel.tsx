import Layout from "../components/Layout";

export default function Cancel() {
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
