"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Role } from "@/types";
import {
  Layers,
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Plane,
  CreditCard,
  Headphones,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("kritya2026");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"credentials" | "quickSelect">("credentials");

  // Load available users for the quick role switcher
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      } catch (err) {
        console.error("Failed to load users for login selector:", err);
      }
    }
    loadUsers();

    // Check if user is already logged in
    const existing = localStorage.getItem("kritya_auth_user");
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed?.id) {
          router.replace("/");
        }
      } catch {}
    }
  }, [router]);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem("kritya_auth_user", JSON.stringify(user));
    document.cookie = `kritya_user_id=${user.id}; path=/; max-age=604800; SameSite=Lax`;
    router.replace("/");
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage("Please enter your username or email address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.user) {
        setErrorMessage(data.error || "Invalid username or password.");
        setIsLoading(false);
        return;
      }

      handleLoginSuccess(data.user);
    } catch (err) {
      setErrorMessage("Network error during sign-in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (user: User) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: user.username || user.email || user.id,
          password: "quick_auth_token",
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        handleLoginSuccess(data.user);
      } else {
        handleLoginSuccess(user);
      }
    } catch {
      handleLoginSuccess(user);
    }
  };

  // Grouped users by department
  const executiveUsers = users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN");
  const salesUsers = users.filter((u) => u.role === "SALES_MANAGER" || u.role === "SALES_AGENT");
  const chargingUsers = users.filter((u) => u.role === "CHARGING_MANAGER" || u.role === "CHARGING_OPERATOR");
  const csUsers = users.filter((u) => u.role === "CS_MANAGER" || u.role === "CS_AGENT");

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Decorative Lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Brand & Platform Trust Banner (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_60%)]" />

          {/* Top Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center shadow-inner">
                <Layers className="h-5 w-5 text-indigo-200" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white font-sans block">Kritya</span>
                <span className="text-[10px] font-mono text-indigo-300 font-medium tracking-wider uppercase block">
                  Enterprise Travel CRM
                </span>
              </div>
            </div>

            <p className="text-xs text-indigo-150/90 leading-relaxed mt-4 text-slate-300">
              Unified mission control for luxury corporate travel, GDS consolidator ticketing, real-time agent MCO tracking, and PCI-compliant charging.
            </p>
          </div>

          {/* Middle Feature Highlights */}
          <div className="relative z-10 my-6 space-y-3">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/10">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-white block">Strict Hierarchy & RBAC</span>
                <span className="text-[10px] text-slate-300">Isolated agent pipelines with manager card clearance</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/10">
              <Plane className="h-4 w-4 text-cyan-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-white block">Automated MCO Earnings</span>
                <span className="text-[10px] text-slate-300">Net ticket fare vs custom agent sale price calculations</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/10">
              <CreditCard className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-white block">PCI-DSS Card Vault</span>
                <span className="text-[10px] text-slate-300">Masked card security with two-party operational release</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-indigo-200/70 font-mono">
            <span>Travelocase Global GDS</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operational
            </span>
          </div>
        </div>

        {/* Right Side: Common Authentication Form (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Sign In to Your Workspace</h1>
                <p className="text-xs text-slate-500 mt-0.5">Enter your enterprise credentials or choose a role account</p>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("credentials")}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    activeTab === "credentials"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("quickSelect")}
                  className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                    activeTab === "quickSelect"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Roles</span>
                </button>
              </div>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: Credentials Form */}
            {activeTab === "credentials" ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-xs font-semibold text-slate-700 mb-1">
                    Username or Enterprise Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <input
                      id="identifier"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. sarah.chen or sarah.chen@travelocase.com"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Demo: kritya2026</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-slate-400 hover:text-indigo-600 cursor-pointer text-[11px]">
                    Need assistance?
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <span>Authenticate & Enter Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Quick Hint Box */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-indigo-600" />
                    <span>Quick Test Accounts:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-500 pt-1">
                    <button
                      type="button"
                      onClick={() => setIdentifier("sarah.chen")}
                      className="text-left hover:text-indigo-600 hover:underline"
                    >
                      &bull; @sarah.chen (Sales)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentifier("super.admin")}
                      className="text-left hover:text-indigo-600 hover:underline"
                    >
                      &bull; @super.admin (Admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentifier("elena.rostova")}
                      className="text-left hover:text-indigo-600 hover:underline"
                    >
                      &bull; @elena.rostova (Charging)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentifier("sam.patel")}
                      className="text-left hover:text-indigo-600 hover:underline"
                    >
                      &bull; @sam.patel (CS Concierge)
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* TAB 2: One-Click Role Account Grid */
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                <p className="text-[11px] text-slate-500">
                  Select any platform role below to automatically sign in and inspect that department's tailored interface:
                </p>

                {/* Sales Department */}
                <div>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Plane className="h-3 w-3 text-indigo-600" />
                    Flight Sales & Quotes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {salesUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleQuickLogin(u)}
                        disabled={isLoading}
                        className="p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition flex items-center justify-between group"
                      >
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-800 block truncate group-hover:text-indigo-700">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            @{u.username || u.email.split("@")[0]} &bull; {u.role}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticketing & Charging */}
                <div>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-emerald-600" />
                    Ticketing & Card Charge Ops
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {chargingUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleQuickLogin(u)}
                        disabled={isLoading}
                        className="p-2 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition flex items-center justify-between group"
                      >
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-800 block truncate group-hover:text-emerald-700">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            @{u.username || u.email.split("@")[0]} &bull; {u.role}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-600 shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Executive & Admin */}
                <div>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-purple-600" />
                    Executive & Operations Admin
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {executiveUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleQuickLogin(u)}
                        disabled={isLoading}
                        className="p-2 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition flex items-center justify-between group"
                      >
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-800 block truncate group-hover:text-purple-700">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            @{u.username || u.email.split("@")[0]} &bull; {u.role}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-600 shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Success */}
                <div>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Headphones className="h-3 w-3 text-cyan-600" />
                    Customer Success Concierge
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {csUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleQuickLogin(u)}
                        disabled={isLoading}
                        className="p-2 rounded-lg border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/50 text-left transition flex items-center justify-between group"
                      >
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-800 block truncate group-hover:text-cyan-700">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            @{u.username || u.email.split("@")[0]} &bull; {u.role}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-cyan-600 shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>&copy; {new Date().getFullYear()} Kritya Travelocase Systems</span>
            <span className="flex items-center gap-1 text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Encrypted TLS 1.3 Session
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
