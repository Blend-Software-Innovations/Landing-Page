import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      if (!response.ok) {
        setStatus("Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/admin");
    } catch {
      setStatus("Unable to sign in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl border border-white/40">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-semibold">A</div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Control Center</h1>
          <p className="text-sm text-slate-500">Secure access required. Use your admin email and password.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <label className="text-xs font-semibold text-slate-500">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              placeholder="admin@example.com"
              type="email"
              required
            />
            <label className="text-xs font-semibold text-slate-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              placeholder="Admin password"
              required
            />
          </div>
          {status && <div className="text-sm text-rose-600">{status}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-slate-900 px-6 py-3 text-white font-semibold shadow-lg"
          >
            {loading ? "Signing in..." : "Open Admin Dashboard"}
          </button>
        </form>
        <div className="mt-4 text-xs text-slate-500 text-center">Set AUTH_ADMIN_EMAIL + AUTH_ADMIN_PASSWORD in .env.local.</div>
      </div>
    </div>
  );
}
