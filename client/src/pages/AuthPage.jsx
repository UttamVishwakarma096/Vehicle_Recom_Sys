import { useState, useEffect } from "react";
import { Link } from "../router/Router.jsx";
import { useLocation, useNavigate } from "../router/hooks.js";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Button } from "../components/ui/Button.jsx";
import { FiCamera, FiZap, FiShield, FiStar, FiLock } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

export function AuthPage({ initialMode = "signin" }) {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toast = useToast();

  // Tab mode override: "signin" | "register"
  const [activeTabOverride, setActiveTabOverride] = useState(null);
  const mode = activeTabOverride ?? (pathname === "/register" ? "register" : initialMode);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginCooldown, setLoginCooldown] = useState(0);

  // Create Account Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");
  const [registerCooldown, setRegisterCooldown] = useState(0);

  // Rate limiter cooldown countdowns
  useEffect(() => {
    if (loginCooldown <= 0) return;
    const timer = setInterval(() => {
      setLoginCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [loginCooldown]);

  useEffect(() => {
    if (registerCooldown <= 0) return;
    const timer = setInterval(() => {
      setRegisterCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [registerCooldown]);

  // Handle Sign In submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (loginCooldown > 0) {
      setLoginError(`Rate limit in effect. Please wait ${loginCooldown}s before trying again.`);
      return;
    }

    if (!loginEmail || !loginPassword) {
      setLoginError("Both email and password are required.");
      return;
    }

    try {
      setLoginSubmitting(true);
      await login({ email: loginEmail, password: loginPassword });
      toast.success("Welcome back!", "Authentication Successful");
      navigate("/");
    } catch (err) {
      setLoginError(err.message || "Invalid credentials.");
      if (err.status === 429 || err.code === "RATE_LIMIT_EXCEEDED") {
        const wait = err.retryAfter || 15;
        setLoginCooldown(wait);
      }
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Handle Create Account submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError("");

    if (registerCooldown > 0) {
      setRegError(`Rate limit in effect. Please wait ${registerCooldown}s before trying again.`);
      return;
    }

    if (!regEmail || !regPassword) {
      setRegError("Email and password are required.");
      return;
    }

    if (regPassword.length < 12) {
      setRegError("Password must be at least 12 characters.");
      return;
    }

    try {
      setRegSubmitting(true);
      await register({
        email: regEmail,
        password: regPassword,
        displayName: regName.trim() || undefined,
      });
      toast.success("Account created successfully!", "Welcome");
      navigate("/");
    } catch (err) {
      const details = err.fieldErrors?.length
        ? err.fieldErrors.map((f) => f.message).join(" ")
        : err.message || "Registration failed.";
      setRegError(details);
      if (err.status === 429 || err.code === "RATE_LIMIT_EXCEEDED") {
        const wait = err.retryAfter || 15;
        setRegisterCooldown(wait);
      }
    } finally {
      setRegSubmitting(false);
    }
  };

  const switchToMode = (newMode) => {
    setActiveTabOverride(newMode);
    if (newMode === "signin") {
      window.history.replaceState({}, "", "/login");
    } else {
      window.history.replaceState({}, "", "/register");
    }
  };

  return (
    <div className="py-6 sm:py-12 flex flex-col items-center justify-center min-h-[calc(100vh-180px)]">
      {/* Top Breadcrumb & Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-3">
          <Badge variant="forest" size="sm">
            Authentication Portal
          </Badge>
          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
            Encrypted & Secure Access
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5]">
          Welcome to <span className="bg-gradient-to-r from-[#1F5A3A] to-[#D8FF2A] dark:from-[#D8FF2A] dark:to-[#85e022] bg-clip-text text-transparent">VehicleWise</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {mode === "signin"
            ? "Sign in to access your saved comparisons, preferences, and Gemini AI vision scanner."
            : "Create an account to unlock deterministic recommendations, garage bookmarks, and AI features."}
        </p>
      </div>

      {/* Main Dual Container: Side-by-Side (Active Form + Platform Description) */}
      <Card className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl border-white/80 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/70 backdrop-blur-2xl">
        {/* Side-by-Side Panels Grid: One side Form, Other side Platform Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 dark:divide-white/10">
          {mode === "signin" ? (
            /* 1. SIGN IN MODE: Left is Login Form, Right is "About VehicleWise" Description */
            <>
              {/* Form Side: Sign In */}
              <div className="p-4 sm:p-8 flex flex-col justify-between bg-white/40 dark:bg-[#2B2B2B]/40 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                        Sign In to Your Account
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Enter your verified email and password
                      </p>
                    </div>
                    <Badge variant="lime" size="sm">
                      Sign In
                    </Badge>
                  </div>

                  {loginCooldown > 0 && (
                    <div
                      role="alert"
                      className="mb-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300 backdrop-blur-sm flex items-center gap-2"
                    >
                      <FiShield className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
                      <span>Security cooldown active. Please wait <strong>{loginCooldown}s</strong> before trying again.</span>
                    </div>
                  )}

                  {loginError && (
                    <div
                      role="alert"
                      className="mb-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/30 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 backdrop-blur-sm"
                    >
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      label="Email Address"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="driver@example.com"
                      autocomplete="username"
                      required
                    />

                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      label="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autocomplete="current-password"
                      required
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={loginSubmitting || loginCooldown > 0}
                      className="mt-2 w-full"
                    >
                      {loginCooldown > 0
                        ? `Rate limited (${loginCooldown}s)`
                        : (loginSubmitting ? "Authenticating..." : "Sign In →")}
                    </Button>
                  </form>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Don't have an account yet?{" "}
                    <button
                      type="button"
                      onClick={() => switchToMode("register")}
                      className="font-bold text-[#1F5A3A] dark:text-[#D8FF2A] hover:underline cursor-pointer"
                    >
                      Create account here
                    </button>
                  </span>
                </div>
              </div>

              {/* Description Side: Why Join VehicleWise */}
              <div className="p-4 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-[#1F5A3A]/10 via-[#2B2B2B]/20 to-transparent">
                <div className="flex flex-col gap-5">
                  <div>
                    <Badge variant="lime" size="sm" className="mb-2.5">
                      About VehicleWise
                    </Badge>
                    <h3 className="text-lg font-bold font-display text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                      The Next-Generation Smart Vehicle Decision System
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      VehicleWise is designed for drivers who want truth in automotive decision making.
                      We reject opaque marketing claims in favor of deterministic mathematics and verified data.
                    </p>
                  </div>

                  {/* Highlights List */}
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-[#2B2B2B]/70 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                      <div className="w-8 h-8 rounded-lg bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] flex items-center justify-center shrink-0">
                        <FiCamera className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5] block">
                          Multimodal Gemini AI Vision
                        </strong>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Spotted a car on the street? Drag-and-drop or paste an image (<kbd className="font-mono text-[10px] bg-slate-100 dark:bg-[#0A0A0A] px-1 rounded">Ctrl+V</kbd>) to identify make, model, generation, and catalog pricing instantly.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-[#2B2B2B]/70 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                      <div className="w-8 h-8 rounded-lg bg-[#D8FF2A]/20 text-[#0A0A0A] dark:text-[#D8FF2A] flex items-center justify-center shrink-0">
                        <FiZap className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5] block">
                          Deterministic Compatibility Matching
                        </strong>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Intelligent matching algorithms score vehicles against your priorities—mileage, power, safety, and maintenance costs—with full transparency.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-[#2B2B2B]/70 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                      <div className="w-8 h-8 rounded-lg bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] flex items-center justify-center shrink-0">
                        <FiShield className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5] block">
                          Zero Fabricated Specifications
                        </strong>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Every specification is backed by verified manufacturer provenance. Missing specifications are transparently disclosed instead of simulated.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Verified Automotive Intelligence</span>
                  <span className="text-[#1F5A3A] dark:text-[#D8FF2A] font-semibold">100% Free Access</span>
                </div>
              </div>
            </>
          ) : (
            /* 2. CREATE ACCOUNT MODE: Left is "What You Get" Description, Right is Registration Form */
            <>
              {/* Description Side: Member Benefits & Site Mission */}
              <div className="order-2 md:order-1 p-4 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-[#1F5A3A]/10 via-[#2B2B2B]/20 to-transparent">
                <div className="flex flex-col gap-5">
                  <div>
                    <Badge variant="forest" size="sm" className="mb-2.5">
                      Why Join VehicleWise
                    </Badge>
                    <h3 className="text-lg font-bold font-display text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                      Unlock Full Access to Automotive Intelligence
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      Creating an account is 100% free and takes less than 30 seconds. Here is what you get when you register:
                    </p>
                  </div>

                  {/* Highlights List */}
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-[#2B2B2B]/70 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                      <div className="w-8 h-8 rounded-lg bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] flex items-center justify-center shrink-0">
                        <FiCamera className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5] block">
                          Unlimited Gemini AI Vision Scans
                        </strong>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Upload or paste photos of vehicles anytime. Our AI vision scanner identifies trims, engines, body types, and cross-references catalog matches.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-[#2B2B2B]/70 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                      <div className="w-8 h-8 rounded-lg bg-[#D8FF2A]/20 text-[#0A0A0A] dark:text-[#D8FF2A] flex items-center justify-center shrink-0">
                        <FiStar className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5] block">
                          Persistent Garage & Comparison Matrices
                        </strong>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Bookmark favorite vehicle candidates and build side-by-side comparison tables with spec-by-spec breakdown across sessions.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-[#2B2B2B]/70 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                      <div className="w-8 h-8 rounded-lg bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] flex items-center justify-center shrink-0">
                        <FiLock className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-[#F5F5F5] block">
                          Bank-Grade Account Privacy
                        </strong>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Your account credentials and activity are safeguarded by modern encryption and strict session security. Zero third-party data tracking.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>No credit card required</span>
                  <span className="text-[#1F5A3A] dark:text-[#D8FF2A] font-semibold">Instant Activation</span>
                </div>
              </div>

              {/* Form Side: Create Account */}
              <div className="order-1 md:order-2 p-4 sm:p-8 flex flex-col justify-between bg-white/40 dark:bg-[#2B2B2B]/40 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                        Create Your Free Account
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Start your smart vehicle discovery journey
                      </p>
                    </div>
                    <Badge variant="lime" size="sm">
                      Register
                    </Badge>
                  </div>

                  {registerCooldown > 0 && (
                    <div
                      role="alert"
                      className="mb-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300 backdrop-blur-sm flex items-center gap-2"
                    >
                      <FiShield className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
                      <span>Too many registration requests. Please wait <strong>{registerCooldown}s</strong> before trying again.</span>
                    </div>
                  )}

                  {regError && (
                    <div
                      role="alert"
                      className="mb-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/30 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 backdrop-blur-sm"
                    >
                      {regError}
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
                    <Input
                      id="reg-name"
                      name="displayName"
                      type="text"
                      label="Display Name (Optional)"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Alex Driver"
                      autocomplete="name"
                    />

                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      label="Email Address"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="driver@example.com"
                      autocomplete="username"
                      required
                    />

                    <Input
                      id="reg-password"
                      name="password"
                      type="password"
                      label="Password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autocomplete="new-password"
                      hint="Minimum 12 characters for safety."
                      required
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={regSubmitting || registerCooldown > 0}
                      className="mt-2 w-full"
                    >
                      {registerCooldown > 0
                        ? `Rate limited (${registerCooldown}s)`
                        : (regSubmitting ? "Creating Account..." : "Register Now →")}
                    </Button>
                  </form>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchToMode("signin")}
                      className="font-bold text-[#1F5A3A] dark:text-[#D8FF2A] hover:underline cursor-pointer"
                    >
                      Sign in here
                    </button>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Feature Highlights Footer Bar */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-[#0A0A0A]/80 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <FiLock className="w-3.5 h-3.5 text-[#1F5A3A] dark:text-[#D8FF2A]" />
            <span>Zero Password Exposure</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <HiSparkles className="w-3.5 h-3.5 text-[#1F5A3A] dark:text-[#D8FF2A]" />
            <span>Gemini AI Vision Access</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <FiStar className="w-3.5 h-3.5 text-[#1F5A3A] dark:text-[#D8FF2A]" />
            <span>Saved Comparison Builds</span>
          </div>
        </div>
      </Card>

      {/* Return to Landing Page Action */}
      <div className="mt-6 text-center">
        <Link
          to="/"
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          ← Return to Landing Page
        </Link>
      </div>
    </div>
  );
}
