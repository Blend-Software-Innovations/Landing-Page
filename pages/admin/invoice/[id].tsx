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
    where: { id },
    include: { items: true }
  });
  if (!order) return { notFound: true };
  return {
    props: {
      order: JSON.parse(JSON.stringify(order))
    }
  };
};

export default function Invoice({ order }: { order: any }) {
  const createdAt = new Date(order.createdAt).toLocaleString();
  const subtotal = (order.items || []).reduce((sum: number, item: any) => sum + Number(item.lineTotal || 0), 0);
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Head>
        <title>Invoice</title>
      </Head>
      <div className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Invoice</h1>
            <div className="text-xs text-slate-500">Order ID: {order.id}</div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Print
          </button>
          <a
            href={`/api/admin/invoice-pdf?id=${order.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Download PDF
          </a>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase text-slate-400">Billed To</div>
            <div className="mt-2 text-sm font-semibold text-slate-800">{order.customerName}</div>
            <div className="text-sm text-slate-600">{order.phone}</div>
            <div className="text-sm text-slate-600">{order.address}</div>
            <div className="text-sm text-slate-600">{order.area ? `${order.area}, ` : ""}{order.city}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-xs uppercase text-slate-400">Invoice Info</div>
            <div className="mt-2 text-sm text-slate-600">Date: {createdAt}</div>
            <div className="text-sm text-slate-600">Status: {order.status}</div>
            <div className="text-sm text-slate-600">Payment: {order.paymentMethod} ({order.paymentStatus})</div>
            {order.transactionId && (
              <div className="text-sm text-slate-600">Transaction: {order.transactionId}</div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-5 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
            <span className="col-span-2">Item</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Total</span>
          </div>
          <div className="divide-y divide-slate-200">
            {(order.items || []).map((item: any) => (
              <div key={item.id} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm">
                <span className="col-span-2">{item.productId || "Product"}</span>
                <span>{item.quantity}</span>
                <span>BDT {item.unitPrice}</span>
                <span>BDT {item.lineTotal}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-slate-500">Subtotal: BDT {subtotal}</span>
          <span className="font-semibold text-slate-900">Total: BDT {order.total}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600">
          {[
            { label: "Placed", value: order.createdAt },
            { label: "Confirmed", value: order.confirmedAt },
            { label: "Packed", value: order.packedAt },
            { label: "Shipped", value: order.shippedAt },
            { label: "Delivered", value: order.deliveredAt },
            { label: "Canceled", value: order.canceledAt },
            { label: "Returned", value: order.returnedAt }
          ]
            .filter((item) => item.value)
            .map((item) => (
              <span key={item.label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {item.label}: {new Date(item.value).toLocaleString()}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
