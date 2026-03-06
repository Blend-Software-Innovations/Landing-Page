import type { GetServerSideProps } from "next";
import Head from "next/head";
import { canRead, resolveRole } from "../../../lib/adminAuth";
import { getPrisma } from "../../../lib/prisma";
import { isDbAvailable } from "../../../lib/db";

export const getServerSideProps: GetServerSideProps = async ({ req, params }) => {
  const role = await resolveRole(req as any);
  if (!canRead(role)) {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false
      }
    };
  }
  if (!isDbAvailable()) {
    return { notFound: true };
  }

  const id = String(params?.id || "");
  if (!id) return { notFound: true };
  const prisma = getPrisma() as any;
  const order = await prisma.order.findUnique({
    where: { id }
  });
  if (!order) return { notFound: true };
  return {
    props: {
      order: JSON.parse(JSON.stringify(order))
    }
  };
};

export default function ShippingLabel({ order }: { order: any }) {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Head>
        <title>Shipping Label</title>
      </Head>
      <div className="max-w-xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Shipping Label</h1>
            <div className="text-xs text-slate-500">Order ID: {order.id}</div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Print
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <div className="text-xs uppercase text-slate-400">Ship To</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{order.customerName}</div>
          <div className="text-sm text-slate-600">{order.phone}</div>
          <div className="text-sm text-slate-600">{order.address}</div>
          <div className="text-sm text-slate-600">{order.area ? `${order.area}, ` : ""}{order.city}</div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-3 text-sm">
            <div className="text-xs uppercase text-slate-400">Courier</div>
            <div className="mt-1 font-semibold text-slate-800">
              {order.shippingPartner || "Not set"}
            </div>
            <div className="text-xs text-slate-500">Tracking: {order.trackingCode || "—"}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3 text-sm">
            <div className="text-xs uppercase text-slate-400">Payment</div>
            <div className="mt-1 font-semibold text-slate-800">{order.paymentMethod}</div>
            <div className="text-xs text-slate-500">Total: BDT {order.total}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
