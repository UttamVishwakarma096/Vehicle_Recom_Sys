import { useState, useEffect, useRef } from "react";
import { Link } from "../router/Router.jsx";
import { useNavigate } from "../router/hooks.js";
import { recommendationClient } from "../services/recommendationClient.js";
import { authClient } from "../services/authClient.js";
import { addVehicleToCompare, getStoredCompareIds } from "../services/compareStorage.js";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { LongevityDisclaimerModal } from "../components/recommendations/LongevityDisclaimerModal.jsx";
import { FiInfo, FiCheck, FiZap, FiSlash, FiCheckCircle, FiAlertTriangle, FiPlus, FiLock } from "react-icons/fi";
import { FaStar, FaRegStar } from "react-icons/fa6";

const BODY_TYPES = [
  "hatchback",
  "sedan",
  "suv",
  "muv",
  "coupe",
  "convertible",
  "wagon",
  "pickup",
];

const FUEL_TYPES = ["petrol", "diesel", "electric", "hybrid", "cng", "lpg"];
const TRANSMISSIONS = ["manual", "automatic"];
const ENVIRONMENTS = [
  { value: "mixed", label: "Mixed Driving (City + Highway)" },
  { value: "city", label: "Primarily City Driving" },
  { value: "highway", label: "Primarily Highway Commuting" },
];

const DEFAULT_PREFERENCES = {
  budget: {
    min: 500000,
    max: 1500000,
    priceType: "ex_showroom",
    currency: "INR",
  },
  vehicleTypes: ["suv", "sedan"],
  fuelTypes: ["petrol", "hybrid"],
  transmissions: ["manual", "automatic"],
  minimumSeats: 5,
  drivingEnvironment: "mixed",
  annualDistanceKm: 12000,
  priorities: {
    fuelEfficiency: 4,
    performance: 3,
    safety: 4,
    reliability: 4,
    maintenanceCost: 3,
  },
};

export function RecommendationPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [useSavedPreferences, setUseSavedPreferences] = useState(false);
  const [hasSavedPrefs, setHasSavedPrefs] = useState(false);

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [isLongevityModalOpen, setIsLongevityModalOpen] = useState(false);

  const resultsRef = useRef(null);
  const loadingAnchorRef = useRef(null);

  // Smoothly slide down to Ranked Recommendations when calculation results arrive
  useEffect(() => {
    if (!loading && results && resultsRef.current) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading, results]);

  // Check if user has saved preferences
  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      authClient
        .getPreferences()
        .then((saved) => {
          if (active && saved && Object.keys(saved).length > 0) {
            setHasSavedPrefs(true);
          }
        })
        .catch(() => {});

      recommendationClient
        .listFavorites({ limit: 50 })
        .then((data) => {
          if (active) {
            const ids = new Set(data?.items?.map((f) => f.vehicleId) || []);
            setFavoriteIds(ids);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const toggleArrayItem = (key, item) => {
    setPreferences((prev) => {
      const current = prev[key] || [];
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, [key]: updated };
    });
  };

  const handlePriorityChange = (dim, value) => {
    setPreferences((prev) => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [dim]: Number(value),
      },
    }));
  };

  const handleSaveToProfile = async () => {
    if (!isAuthenticated) {
      toast.warning("Sign in to save preferences to your profile.", "Authentication Required");
      return;
    }
    try {
      await authClient.updatePreferences(preferences);
      setHasSavedPrefs(true);
      toast.success("Preferences saved to your user profile!", "Preferences Persisted");
    } catch (err) {
      toast.error(err.message || "Failed to persist preferences.", "Error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.warning("Please sign in to calculate personalized vehicle recommendations.", "Authentication Required");
      navigate("/login");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      // Immediately slide down towards loading area
      setTimeout(() => {
        loadingAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);

      const data = await recommendationClient.getRecommendations({
        useSavedPreferences,
        preferences: useSavedPreferences ? undefined : preferences,
        page: 1,
        limit: 20,
      });
      setResults(data);
    } catch (err) {
      setError(err.message || "Failed to calculate recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (vehicleId) => {
    if (!isAuthenticated) {
      toast.warning("Sign in to favorite vehicles.", "Authentication Required");
      return;
    }
    try {
      if (favoriteIds.has(vehicleId)) {
        await recommendationClient.removeFavorite(vehicleId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(vehicleId);
          return next;
        });
        toast.info("Removed from favorites.", "Favorite Updated");
      } else {
        await recommendationClient.addFavorite(vehicleId);
        setFavoriteIds((prev) => new Set(prev).add(vehicleId));
        toast.success("Added to favorites!", "Favorite Saved");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update favorite.", "Error");
    }
  };

  return (
    <div className="py-4">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="forest" size="sm">Rule-Based v1</Badge>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deterministic Matching</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] sm:text-4xl font-display">
            Vehicle Recommendation Engine
          </h1>
          <p className="mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">
            Submit your driving constraints and priorities. Matches are ranked purely on verified
            catalog attributes with full explainability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLongevityModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-[#2B2B2B]/80 border border-slate-200/80 dark:border-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#F5F5F5] shadow-xs hover:bg-white dark:hover:bg-[#2B2B2B] backdrop-blur-sm cursor-pointer transition-all"
        >
          <FiInfo className="w-3.5 h-3.5 text-[#1F5A3A] dark:text-[#D8FF2A]" />
          <span>Longevity Gate Policy</span>
        </button>
      </div>

      {/* Unauthenticated Protection Gate */}
      {!isAuthenticated && (
        <Card className="mb-6 sm:mb-8 border-[#1F5A3A]/30 dark:border-[#D8FF2A]/20 bg-gradient-to-br from-[#1F5A3A]/10 via-[#2B2B2B]/30 to-transparent p-6 text-center">
          <div className="max-w-md mx-auto py-6">
            <FiLock className="w-12 h-12 mb-3 text-[#1F5A3A] dark:text-[#D8FF2A] mx-auto block" />
            <h2 className="text-xl font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
              Sign In to Calculate Recommendations
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Vehicle matching utilizes personalized preference scoring and saved constraints.
              Please sign in or create an account to run the engine.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/login"
                className="rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-5 py-2.5 text-xs shadow-md shadow-[#D8FF2A]/20 transition-all"
              >
                Sign In →
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-white/80 dark:bg-[#2B2B2B]/80 text-[#0A0A0A] dark:text-[#F5F5F5] border border-slate-200/80 dark:border-white/10 px-5 py-2.5 text-xs font-semibold shadow-xs hover:bg-white dark:hover:bg-[#2B2B2B]"
              >
                Create Account
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Questionnaire Form */}
      <Card className="mb-6 sm:mb-10 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Saved Preferences Option */}
          {isAuthenticated && hasSavedPrefs && (
            <div className="rounded-2xl border border-[#1F5A3A]/30 dark:border-[#D8FF2A]/20 bg-[#1F5A3A]/5 dark:bg-[#2B2B2B]/60 p-3.5 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]">
                <input
                  type="checkbox"
                  checked={useSavedPreferences}
                  onChange={(e) => setUseSavedPreferences(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#1F5A3A] dark:accent-[#D8FF2A]"
                />
                Use My Saved Profile Preferences
              </label>
              <span className="text-xs text-[#1F5A3A] dark:text-[#D8FF2A] font-medium">
                Bypasses custom form inputs below
              </span>
            </div>
          )}

          {!useSavedPreferences && (
            <>
              {/* Section 1: Budget */}
              <div className="border-b border-slate-200/60 dark:border-white/10 pb-6">
                <h2 className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight mb-3 font-display">
                  1. Budget Constraints (INR)
                </h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    id="pref-min-budget"
                    name="minBudget"
                    type="number"
                    label="Minimum Budget"
                    value={preferences.budget.min || ""}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        budget: { ...preferences.budget, min: Number(e.target.value) },
                      })
                    }
                    placeholder="e.g. 500000"
                    required
                  />

                  <Input
                    id="pref-max-budget"
                    name="maxBudget"
                    type="number"
                    label="Maximum Budget"
                    value={preferences.budget.max || ""}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        budget: { ...preferences.budget, max: Number(e.target.value) },
                      })
                    }
                    placeholder="e.g. 1500000"
                    required
                  />

                  <Select
                    id="pref-price-type"
                    name="priceType"
                    label="Price Benchmark"
                    value={preferences.budget.priceType}
                    options={[
                      { value: "ex_showroom", label: "Ex-Showroom Price" },
                      { value: "on_road", label: "On-Road Estimated Price" },
                    ]}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        budget: { ...preferences.budget, priceType: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {/* Section 2: Body Types & Powertrain */}
              <div className="border-b border-slate-200/60 dark:border-white/10 pb-6">
                <h2 className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight mb-3 font-display">
                  2. Vehicle Types & Powertrain
                </h2>

                <div className="flex flex-col gap-3.5">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Acceptable Body Types:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {BODY_TYPES.map((bt) => {
                        const selected = preferences.vehicleTypes?.includes(bt);
                        return (
                          <button
                            key={bt}
                            type="button"
                            onClick={() => toggleArrayItem("vehicleTypes", bt)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              selected
                                ? "bg-[#D8FF2A] text-[#0A0A0A] font-bold shadow-sm shadow-[#D8FF2A]/25"
                                : "bg-white/70 dark:bg-[#2B2B2B]/60 hover:bg-white dark:hover:bg-[#2B2B2B] text-slate-600 dark:text-[#F5F5F5] border border-slate-200/70 dark:border-white/10"
                            }`}
                          >
                            {selected && <FiCheck className="w-3 h-3 text-[#0A0A0A]" />}
                            <span>{bt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Fuel Types:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {FUEL_TYPES.map((ft) => {
                        const selected = preferences.fuelTypes?.includes(ft);
                        return (
                          <button
                            key={ft}
                            type="button"
                            onClick={() => toggleArrayItem("fuelTypes", ft)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                              selected
                                ? "bg-[#1F5A3A] text-white font-bold shadow-sm shadow-[#1F5A3A]/25"
                                : "bg-white/70 dark:bg-[#2B2B2B]/60 hover:bg-white dark:hover:bg-[#2B2B2B] text-slate-600 dark:text-[#F5F5F5] border border-slate-200/70 dark:border-white/10"
                            }`}
                          >
                            {selected && <FiCheck className="w-3 h-3 text-white" />}
                            <span>{ft}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                      Transmissions:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TRANSMISSIONS.map((t) => {
                        const selected = preferences.transmissions?.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleArrayItem("transmissions", t)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                              selected
                                ? "bg-[#2B2B2B] text-[#F5F5F5] dark:bg-[#F5F5F5] dark:text-[#0A0A0A] font-bold shadow-sm"
                                : "bg-white/70 dark:bg-[#2B2B2B]/60 hover:bg-white dark:hover:bg-[#2B2B2B] text-slate-600 dark:text-[#F5F5F5] border border-slate-200/70 dark:border-white/10"
                            }`}
                          >
                            {selected && <FiCheck className="w-3 h-3" />}
                            <span>{t}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Driving Needs */}
              <div className="border-b border-slate-200/60 dark:border-white/10 pb-6">
                <h2 className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight mb-3 font-display">
                  3. Practical Requirements
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Select
                    id="pref-seats"
                    name="minimumSeats"
                    label="Minimum Seats Required"
                    value={preferences.minimumSeats}
                    options={[
                      { value: 2, label: "2+ Seater" },
                      { value: 4, label: "4+ Seater" },
                      { value: 5, label: "5+ Seater (Standard)" },
                      { value: 7, label: "7+ Seater (Family)" },
                      { value: 8, label: "8+ Seater (Large)" },
                    ]}
                    onChange={(e) =>
                      setPreferences({ ...preferences, minimumSeats: Number(e.target.value) })
                    }
                  />

                  <Select
                    id="pref-env"
                    name="drivingEnvironment"
                    label="Driving Environment"
                    value={preferences.drivingEnvironment}
                    options={ENVIRONMENTS}
                    onChange={(e) =>
                      setPreferences({ ...preferences, drivingEnvironment: e.target.value })
                    }
                  />

                  <Input
                    id="pref-km"
                    name="annualDistanceKm"
                    type="number"
                    label="Estimated Annual Distance (km)"
                    value={preferences.annualDistanceKm || ""}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        annualDistanceKm: Number(e.target.value),
                      })
                    }
                    placeholder="e.g. 12000"
                  />
                </div>
              </div>

              {/* Section 4: Attribute Priorities (1-5) */}
              <div>
                <h2 className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight mb-2 font-display">
                  4. Your Priorities (Scale 1 to 5)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mb-4">
                  Priorities determine component score weights in the engine. Dimensions without
                  verified evaluation data will be reported honestly as missing data.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { key: "fuelEfficiency", label: "Fuel Efficiency" },
                    { key: "performance", label: "Performance" },
                    { key: "safety", label: "Safety" },
                    { key: "reliability", label: "Reliability" },
                    { key: "maintenanceCost", label: "Low Maintenance" },
                  ].map((p) => (
                    <div
                      key={p.key}
                      className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-[#2B2B2B]/60 p-3.5 backdrop-blur-md shadow-xs"
                    >
                      <span className="text-xs font-semibold text-slate-800 dark:text-[#F5F5F5] block mb-2">
                        {p.label}
                      </span>
                      <div className="flex items-center justify-between gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => {
                          const isSelected = preferences.priorities[p.key] === lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handlePriorityChange(p.key, lvl)}
                              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-[#D8FF2A] text-[#0A0A0A] font-bold shadow-xs"
                                  : "bg-slate-100/80 dark:bg-[#0A0A0A]/60 hover:bg-slate-200 dark:hover:bg-[#0A0A0A] text-slate-600 dark:text-[#F5F5F5]"
                              }`}
                            >
                              {lvl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {isAuthenticated && !useSavedPreferences && (
              <Button variant="secondary" size="sm" onClick={handleSaveToProfile} className="w-full sm:w-auto">
                <span className="inline-flex items-center justify-center gap-1.5 w-full">
                  <FaStar className="w-3.5 h-3.5 text-[#1F5A3A] dark:text-[#D8FF2A]" />
                  <span>Save to Profile</span>
                </span>
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !isAuthenticated}
              className="w-full sm:w-auto sm:ml-auto"
            >
              {loading ? (
                "Calculating Matches..."
              ) : !isAuthenticated ? (
                <span className="inline-flex items-center justify-center gap-1.5 w-full">
                  <FiLock className="w-4 h-4" />
                  <span>Sign In to Calculate Matches</span>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-1.5 w-full">
                  <span>Calculate Ranked Matches</span>
                  <FiZap className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Loading Anchor */}
      <div ref={loadingAnchorRef} className="scroll-mt-24" />

      {/* Loading Indicator */}
      {loading && <LoadingSpinner label="Running deterministic scoring engine..." size="lg" className="py-16" />}

      {/* Error Banner */}
      {error && !loading && (
        <Alert title="Recommendation Execution Error" variant="error">
          {error}
        </Alert>
      )}

      {/* Results Section */}
      {!loading && !error && results && (
        <section ref={resultsRef} id="ranked-recommendations-section" className="my-8 scroll-mt-24">
          {/* Disclaimer Alert */}
          <Alert title="Score Transparency & Non-Prediction Disclaimer" variant="warning" className="mb-6">
            {results.scoreDisclaimer}
          </Alert>

          {/* Result Count Summary */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
                Ranked Recommendations ({results.pagination?.totalItems || 0} Matches)
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Engine Version: <code className="font-mono font-semibold text-slate-700 dark:text-slate-300">{results.ruleVersion}</code>
              </span>
            </div>
          </div>

          {/* Empty Result State */}
          {results.items.length === 0 ? (
            <Card className="my-6 text-center py-12">
              <FiSlash className="w-12 h-12 mb-3 text-slate-400 mx-auto block" />
              <h3 className="text-xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
                No Vehicles Satisfy All Constraints
              </h3>
              <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No published vehicles in the catalog met all of your hard constraints (budget,
                minimum seats, body type). Hard constraints are never relaxed silently. Try
                broadening your criteria.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {results.items.map((item) => {
                const vehicle = item.vehicle;
                const isInsufficient = item.scoreStatus === "insufficient_data";
                const isFav = favoriteIds.has(vehicle.id);

                return (
                  <Card key={vehicle.id} className="p-4 sm:p-6">
                    {/* Top Row: Rank & Match Score */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 border-b border-slate-200/60 dark:border-white/10 pb-4 mb-4">
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="shrink-0 rounded-full bg-[#1F5A3A] text-white px-3.5 py-1 text-xs font-mono font-bold shadow-xs">
                          #{item.rank} Match
                        </span>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight font-display">
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {vehicle.variant} • {vehicle.modelYear} • {vehicle.bodyType}
                          </span>
                        </div>
                      </div>

                      {/* Score Gauge */}
                      <div className="sm:text-right">
                        {isInsufficient ? (
                          <div className="inline-block rounded-full border border-rose-200/80 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                            Insufficient Ground Truth Data
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#1F5A3A]/40 dark:border-[#D8FF2A]/30 bg-[#1F5A3A]/15 dark:bg-[#D8FF2A]/15 px-3.5 sm:px-4 py-1.5 text-sm sm:text-base font-extrabold text-[#1F5A3A] dark:text-[#D8FF2A] backdrop-blur-md">
                            <span className="font-mono">{item.matchScore}%</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#1F5A3A] dark:text-[#D8FF2A]">Match Score</span>
                          </div>
                        )}
                        <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 block mt-1">
                          Evidence Coverage: {Math.round((item.evidenceCoverage || 0) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Component Scores Breakdown */}
                    {item.componentScores && Object.keys(item.componentScores).length > 0 && (
                      <div className="mb-4 p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#2B2B2B]/60 border border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                          Component Score Breakdown
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {Object.entries(item.componentScores).map(([k, score]) => (
                            <div key={k} className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-[#0A0A0A]/80 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] shadow-xs">
                              <span className="capitalize text-slate-500 dark:text-slate-400 mr-1.5">{k}:</span>
                              <strong className="font-mono font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">{score}/100</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explanations Grid: Reasons & Trade-offs */}
                    <div className="grid gap-4 md:grid-cols-2 text-xs mb-4">
                      {/* Positive Reasons */}
                      <div className="rounded-xl border border-[#1F5A3A]/30 dark:border-[#1F5A3A]/40 bg-[#1F5A3A]/10 dark:bg-[#1F5A3A]/15 p-4 backdrop-blur-md">
                        <strong className="font-bold uppercase text-xs text-[#1F5A3A] dark:text-[#D8FF2A] mb-2 font-display flex items-center gap-1.5">
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>Match Strengths</span>
                        </strong>
                        <ul className="flex flex-col gap-1.5">
                          {item.reasons?.map((r, idx) => (
                            <li key={idx} className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                              <span className="text-[#1F5A3A] dark:text-[#D8FF2A] font-bold">•</span>
                              {r.label || r.code}
                            </li>
                          ))}
                          {(!item.reasons || item.reasons.length === 0) && (
                            <li className="text-slate-400 dark:text-slate-500 italic">No specific positive highlights recorded.</li>
                          )}
                        </ul>
                      </div>

                      {/* Trade-offs & Missing Data */}
                      <div className="rounded-xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-4 backdrop-blur-md">
                        <strong className="font-bold uppercase text-xs text-amber-800 dark:text-amber-300 mb-2 font-display flex items-center gap-1.5">
                          <FiAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Trade-Offs & Missing Evidence</span>
                        </strong>
                        <ul className="flex flex-col gap-1.5">
                          {item.tradeoffs?.map((t, idx) => (
                            <li key={idx} className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                              {t.label || t.code}
                            </li>
                          ))}
                          {item.missingData?.map((m, idx) => (
                            <li key={`m-${idx}`} className="font-medium text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                              <span className="text-slate-400 dark:text-slate-500">•</span>
                              <span className="italic">[{m.dimension}] {m.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant={isFav ? "danger" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleFavorite(vehicle.id)}
                          className="flex-1 sm:flex-initial"
                        >
                          {isFav ? (
                            <span className="inline-flex items-center justify-center gap-1 w-full">
                              <FaStar className="w-3 h-3" />
                              <span>Favorited</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1 w-full">
                              <FaRegStar className="w-3 h-3" />
                              <span>Add Favorite</span>
                            </span>
                          )}
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAuthenticated) {
                              toast.warning("Please sign in to compare vehicles.", "Authentication Required");
                              navigate("/login");
                              return;
                            }
                            const current = getStoredCompareIds();
                            if (current.includes(vehicle.id)) {
                              navigate(`/compare?ids=${current.join(",")}`);
                              return;
                            }
                            if (current.length >= 4) {
                              toast.warning("Comparison is capped at 4 vehicles maximum.", "Cap Reached");
                              navigate(`/compare?ids=${current.join(",")}`);
                              return;
                            }
                            const next = addVehicleToCompare(vehicle.id);
                            toast.success(`${vehicle.year} ${vehicle.make} ${vehicle.model} added to comparison.`, "Added to Compare");
                            navigate(`/compare?ids=${next.join(",")}`);
                          }}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#2B2B2B]/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#F5F5F5] shadow-xs hover:bg-white dark:hover:bg-[#2B2B2B] transition-colors cursor-pointer"
                        >
                          <FiPlus className="w-3 h-3" />
                          <span>Compare</span>
                        </button>
                      </div>

                      <Link
                        to={`/vehicles/${vehicle.id}`}
                        className="w-full sm:w-auto text-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-4 py-2 text-xs shadow-md shadow-[#D8FF2A]/20 transition-all"
                      >
                        Inspect Full Specs →
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Longevity Gate Policy Modal */}
      <LongevityDisclaimerModal
        isOpen={isLongevityModalOpen}
        onClose={() => setIsLongevityModalOpen(false)}
      />
    </div>
  );
}
