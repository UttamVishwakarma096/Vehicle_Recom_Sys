import { useState, useEffect, useMemo } from "react";
import { Link } from "../router/Router.jsx";
import { useLocation, useNavigate } from "../router/hooks.js";
import { recommendationClient } from "../services/recommendationClient.js";
import { catalogClient } from "../services/catalogClient.js";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { FaScaleBalanced, FaTrophy, FaLightbulb } from "react-icons/fa6";
import { FiX, FiLock, FiZap, FiCheck, FiAlertCircle } from "react-icons/fi";

export function ComparePage() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const vehicleIds = useMemo(() => {
    const params = new URLSearchParams(
      search || (typeof window !== "undefined" ? window.location.search : "")
    );
    const ids = params.get("ids");
    return ids ? ids.split(",").filter(Boolean) : [];
  }, [search]);

  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(() => vehicleIds.length >= 2);
  const [error, setError] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [catalogVehicles, setCatalogVehicles] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // AI Conclusion state
  const [conclusionData, setConclusionData] = useState(null);
  const [conclusionLoading, setConclusionLoading] = useState(false);
  const [conclusionError, setConclusionError] = useState(null);
  const [conclusionCooldown, setConclusionCooldown] = useState(0);

  // Rate limiter cooldown countdown timer
  useEffect(() => {
    if (conclusionCooldown <= 0) return;
    const timer = setInterval(() => {
      setConclusionCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [conclusionCooldown]);

  useEffect(() => {
    if (vehicleIds.length < 2 || !isAuthenticated) {
      return;
    }
    let active = true;

    recommendationClient
      .compareVehicles(vehicleIds)
      .then((data) => {
        if (active) {
          setCompareData(data);
          setError(null);
          setLoading(false);
          setConclusionData(null);
          setConclusionError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to compare vehicles.");
          setCompareData(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [vehicleIds, isAuthenticated]);

  const updateUrlIds = (newIds) => {
    setConclusionData(null);
    setConclusionError(null);
    if (newIds.length >= 2) {
      setLoading(true);
    }
    if (newIds.length > 0) {
      navigate(`${pathname}?ids=${newIds.join(",")}`);
    } else {
      navigate(pathname);
    }
  };

  const handleRemoveVehicle = (idToRemove) => {
    const next = vehicleIds.filter((id) => id !== idToRemove);
    updateUrlIds(next);
    toast.info("Vehicle removed from comparison.", "Comparison Updated");
  };

  const handleRetry = () => {
    if (vehicleIds.length < 2) return;
    setLoading(true);
    setError(null);
    recommendationClient
      .compareVehicles(vehicleIds)
      .then((data) => {
        setCompareData(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to compare vehicles.");
        setCompareData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleGenerateAiConclusion = async () => {
    if (vehicleIds.length < 2 || conclusionCooldown > 0) return;

    try {
      setConclusionLoading(true);
      setConclusionError(null);

      const res = await recommendationClient.getAiComparisonConclusion(vehicleIds);

      if (res?.conclusion) {
        setConclusionData(res.conclusion);
        toast.success("AI comparative conclusion generated successfully!", "Verdict Ready");
      }
    } catch (err) {
      if (err.status === 429) {
        setConclusionCooldown(15);
        setConclusionError(
          err.message || "AI comparison rate limit reached. Please wait a few seconds before trying again.",
        );
        toast.warning(
          "Rate limit reached. Please wait a few seconds before trying again.",
          "Rate Limit",
        );
      } else {
        const rawMsg = err.message || "";
        const isInternalError =
          rawMsg.startsWith("{") ||
          rawMsg.includes("Consumer") ||
          rawMsg.includes("PERMISSION_DENIED") ||
          rawMsg.includes("api_key") ||
          rawMsg.includes("Gemini AI processing failed") ||
          rawMsg.includes("Gemini AI comparison failed");
        const displayMsg = isInternalError
          ? "Gemini AI processing failed."
          : (rawMsg || "Gemini AI processing failed.");
        setConclusionError(displayMsg);
        toast.error(displayMsg, "AI Analysis Error");
      }
    } finally {
      setConclusionLoading(false);
    }
  };

  const handleAddVehicle = (idToAdd) => {
    if (vehicleIds.includes(idToAdd)) {
      toast.warning("Vehicle is already in the comparison.", "Duplicate");
      return;
    }
    if (vehicleIds.length >= 4) {
      toast.warning("Maximum of 4 vehicles can be compared simultaneously.", "Cap Reached");
      return;
    }
    const next = [...vehicleIds, idToAdd];
    updateUrlIds(next);
    setIsAddModalOpen(false);
    toast.success("Vehicle added to comparison.", "Added");
  };

  const openAddModal = async () => {
    if (!isAuthenticated) {
      toast.warning("Please sign in to compare vehicles.", "Authentication Required");
      navigate("/login");
      return;
    }
    setIsAddModalOpen(true);
    try {
      setCatalogLoading(true);
      const data = await catalogClient.listVehicles({ limit: 50 });
      setCatalogVehicles(data?.items || []);
    } catch {
      toast.error("Failed to load catalog vehicles for picker.", "Error");
    } finally {
      setCatalogLoading(false);
    }
  };

  if (isAuthLoading) {
    return <LoadingSpinner label="Checking session..." size="lg" className="py-20" />;
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="lime" size="sm">Side-by-Side Matrix</Badge>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {vehicleIds.length}/4 Vehicles Selected
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] sm:text-4xl font-display">
            Compare Vehicles
          </h1>
          <p className="mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">
            Compare verified technical specifications and pricing side by side without fabricated data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {vehicleIds.length < 4 && (
            <Button
              variant="primary"
              size="sm"
              onClick={openAddModal}
              disabled={!isAuthenticated}
            >
              {!isAuthenticated ? (
                <span className="inline-flex items-center gap-1.5">
                  <FiLock className="w-3.5 h-3.5" />
                  <span>Sign In to Add</span>
                </span>
              ) : (
                `+ Add Vehicle (${vehicleIds.length}/4)`
              )}
            </Button>
          )}
          {vehicleIds.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => updateUrlIds([])}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Unauthenticated Protection Gate */}
      {!isAuthenticated && (
        <Card className="mb-6 sm:mb-8 border-[#1F5A3A]/30 dark:border-[#D8FF2A]/20 bg-gradient-to-br from-[#1F5A3A]/10 via-[#2B2B2B]/30 to-transparent p-6 text-center">
          <div className="max-w-md mx-auto py-6">
            <FiLock className="w-12 h-12 mb-3 text-[#1F5A3A] dark:text-[#D8FF2A] mx-auto block" />
            <h2 className="text-xl font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
              Sign In to Compare Vehicles Side-by-Side
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Side-by-side vehicle comparison and specification matrices require user membership.
              Please sign in or create an account to view and customize vehicle comparisons.
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

      {/* Under minimum warning */}
      {isAuthenticated && vehicleIds.length < 2 && (
        <Card className="my-8 p-6">
          <div className="flex flex-col items-center justify-center text-center py-10">
            <FaScaleBalanced className="w-12 h-12 mb-3 text-[#1F5A3A] dark:text-[#D8FF2A]" />
            <h2 className="text-xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
              Select at Least 2 Vehicles to Compare
            </h2>
            <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400 max-w-md">
              A valid comparison requires between 2 and 4 vehicles. Choose vehicles from the catalog
              or use the picker below.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Button variant="primary" onClick={openAddModal}>
                Select Vehicles from Catalog +
              </Button>
              <Link
                to="/vehicles"
                className="inline-flex items-center rounded-xl bg-white/80 dark:bg-[#2B2B2B]/80 hover:bg-white dark:hover:bg-[#2B2B2B] text-slate-700 dark:text-[#F5F5F5] border border-slate-200/80 dark:border-white/10 px-4 py-2 text-xs font-semibold shadow-xs backdrop-blur-md transition-all"
              >
                Browse Full Catalog →
              </Link>
            </div>
          </div>
        </Card>
      )}

      {loading && <LoadingSpinner label="Formatting comparison table..." size="lg" className="py-20" />}

      {error && !loading && (
        <div className="my-8">
          <Alert title="Comparison Error" variant="error">
            {error}
          </Alert>
          <div className="mt-4">
            <Button variant="primary" onClick={handleRetry}>
              Retry Comparison
            </Button>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {!loading && !error && compareData && compareData.vehicles?.length >= 2 && (
        <div className="my-6">
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-2 md:hidden flex items-center justify-between">
            <span>← Scroll horizontally to inspect matrix →</span>
            <span className="font-semibold text-[#1F5A3A] dark:text-[#D8FF2A]">{compareData.vehicles.length} vehicles</span>
          </div>

          <Card className="overflow-x-auto p-0 border border-white/80 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/80 backdrop-blur-xl rounded-2xl shadow-sm overscroll-x-contain">
            <table className="w-full text-left text-xs border-collapse">
              {/* Table Header: Vehicle Cards */}
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-white/10 bg-[#1F5A3A]/10 dark:bg-[#2B2B2B] backdrop-blur-md">
                  <th className="sticky left-0 z-20 bg-slate-100/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md p-3 sm:p-4 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 min-w-[130px] sm:min-w-[180px] border-r border-slate-200/70 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                    Specification
                  </th>
                  {compareData.vehicles.map((v) => (
                    <th
                      key={v.id}
                      className="p-3.5 sm:p-4 font-bold min-w-[160px] sm:min-w-[200px] border-r border-slate-200/60 dark:border-white/10 last:border-r-0 align-top"
                    >
                      {(() => {
                        const img = v.imageUrl || (Array.isArray(v.images) && v.images[0]) || null;
                        return img ? (
                          <div className="w-full h-24 mb-2.5 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200/50 dark:border-white/5">
                            <img
                              src={img}
                              alt={`${v.make} ${v.model}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.parentElement.style.display = "none";
                              }}
                            />
                          </div>
                        ) : null;
                      })()}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
                            {v.make} {v.model}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {v.variant} • {v.modelYear}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(v.id)}
                          aria-label={`Remove ${v.make} ${v.model} from comparison`}
                          className="rounded-full w-5 h-5 flex items-center justify-center bg-slate-100 dark:bg-[#0A0A0A]/60 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors cursor-pointer shrink-0"
                        >
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Link
                        to={`/vehicles/${v.id}`}
                        className="inline-block mt-2 text-xs font-semibold text-[#1F5A3A] dark:text-[#D8FF2A] hover:text-[#16422a] dark:hover:text-[#cbf520]"
                      >
                        View Full Details →
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {compareData.comparison?.map((row) => (
                  <tr key={row.key} className="hover:bg-[#1F5A3A]/5 dark:hover:bg-[#0A0A0A]/40 transition-colors">
                    <td className="sticky left-0 z-10 bg-slate-50/95 dark:bg-[#202020]/95 backdrop-blur-md p-3 sm:p-3.5 font-semibold text-slate-700 dark:text-[#F5F5F5] border-r border-slate-200/60 dark:border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {row.label}
                    </td>
                    {compareData.vehicles.map((v) => {
                      const val = row.values[v.id];
                      let formatted = val;

                      if (val === null || val === undefined) {
                        formatted = <span className="text-slate-400 dark:text-slate-500 italic">— Unreported</span>;
                      } else if (row.key.includes("Price")) {
                        formatted = `₹${Number(val).toLocaleString("en-IN")}`;
                      }

                      return (
                        <td
                          key={v.id}
                          className="p-3 sm:p-3.5 border-r border-slate-200/60 dark:border-white/10 last:border-r-0 text-slate-800 dark:text-[#F5F5F5] text-xs font-mono font-semibold"
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* AI Comparison Verdict & Conclusion Section */}
      {!loading && !error && compareData && compareData.vehicles?.length >= 2 && (
        <div className="my-8">
          <Card className="p-5 sm:p-6 border-[#1F5A3A]/30 dark:border-[#D8FF2A]/20 bg-gradient-to-br from-[#1F5A3A]/5 via-white/80 dark:via-[#2B2B2B]/90 to-transparent">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/10 pb-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="lime" size="sm">Gemini AI</Badge>
                </div>
                <h3 className="text-xl font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight flex items-center gap-2">
                  <FaScaleBalanced className="w-5 h-5 text-[#1F5A3A] dark:text-[#D8FF2A]" />
                  <span>AI Comparative Verdict & Buying Conclusion</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed analysis explaining why one vehicle is better suited for specific driving priorities than the other.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                disabled={conclusionLoading || conclusionCooldown > 0}
                onClick={handleGenerateAiConclusion}
                className="shadow-md shadow-[#D8FF2A]/20 shrink-0 cursor-pointer"
              >
                {conclusionLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-1.5" />
                    <span>Analyzing...</span>
                  </>
                ) : conclusionCooldown > 0 ? (
                  <span className="font-mono">Please wait ({conclusionCooldown}s)...</span>
                ) : conclusionData ? (
                  <>
                    <FiZap className="w-3.5 h-3.5 mr-1.5" />
                    <span>Regenerate Verdict</span>
                  </>
                ) : (
                  <>
                    <FiZap className="w-3.5 h-3.5 mr-1.5" />
                    <span>Generate AI Verdict</span>
                  </>
                )}
              </Button>
            </div>

            {conclusionError && (
              <Alert variant="danger" className="mb-4">
                {conclusionError}
              </Alert>
            )}

            {!conclusionData && !conclusionLoading && (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
                <FaLightbulb className="w-8 h-8 text-[#1F5A3A] dark:text-[#D8FF2A] mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5]">
                  Ready to Generate Comparative Verdict
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                  Let Gemini AI compare specs, pricing, mileage, power, and real-world ownership factors to tell you which vehicle is the better choice for your needs.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={conclusionCooldown > 0}
                  onClick={handleGenerateAiConclusion}
                  className="cursor-pointer"
                >
                  {conclusionCooldown > 0 ? `Please wait (${conclusionCooldown}s)...` : "Analyze with Gemini AI"}
                </Button>
              </div>
            )}

            {conclusionLoading && (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <LoadingSpinner size="lg" />
                <span className="mt-3 text-xs font-mono font-bold text-[#1F5A3A] dark:text-[#D8FF2A] tracking-wider">
                  ANALYZING VEHICLE SPECIFICATIONS & MARKET FIT...
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Evaluating performance, fuel efficiency trade-offs, and value proposition
                </span>
              </div>
            )}

            {conclusionData && !conclusionLoading && (
              <div className="flex flex-col gap-6">
                {/* Executive Summary */}
                <div className="p-4 rounded-xl bg-white/90 dark:bg-[#1A1A1A]/90 border border-slate-200/70 dark:border-white/10 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5A3A] dark:text-[#D8FF2A] block mb-1">
                    Executive Summary
                  </span>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {conclusionData.summary}
                  </p>
                </div>

                {/* Category Champions */}
                {conclusionData.categoryWinners?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 font-display">
                      <FaTrophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>Category Champions</span>
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {conclusionData.categoryWinners.map((w, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                {w.category}
                              </span>
                              <FaTrophy className="w-3 h-3 text-amber-500" />
                            </div>
                            <strong className="text-sm font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] block">
                              {w.winnerName}
                            </strong>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                            {w.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side-by-Side Breakdown */}
                {conclusionData.verdicts?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 font-display">
                      Vehicle-by-Vehicle Strengths & Trade-offs
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {conclusionData.verdicts.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#1f1f1f]/90 shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2.5 mb-3">
                              <h5 className="text-base font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5]">
                                {item.vehicleName}
                              </h5>
                              {item.bestFor && (
                                <Badge variant="lime" size="sm">
                                  {item.bestFor}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                              {item.verdict}
                            </p>

                            {/* Pros & Cons */}
                            <div className="grid gap-2 text-xs">
                              {item.pros?.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                                    Key Advantages
                                  </span>
                                  <ul className="space-y-1">
                                    {item.pros.map((p, pIdx) => (
                                      <li key={pIdx} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                                        <FiCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{p}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {item.cons?.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                                    Trade-offs to Consider
                                  </span>
                                  <ul className="space-y-1">
                                    {item.cons.map((c, cIdx) => (
                                      <li key={cIdx} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                                        <FiAlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final Recommendation */}
                {conclusionData.finalTakeaway && (
                  <div className="p-4 rounded-xl border border-[#1F5A3A]/40 dark:border-[#D8FF2A]/30 bg-[#1F5A3A]/10 dark:bg-[#D8FF2A]/10 backdrop-blur-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5A3A] dark:text-[#D8FF2A] block mb-1">
                      Final Buying Recommendation
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] leading-relaxed">
                      {conclusionData.finalTakeaway}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Vehicle Picker Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Select Vehicle to Compare"
        maxWidth="max-w-2xl"
      >
        {catalogLoading ? (
          <LoadingSpinner label="Loading catalog vehicles..." />
        ) : (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
            {catalogVehicles
              .filter((v) => !vehicleIds.includes(v.id))
              .map((v) => {
                const price = v.prices?.find((p) => p.type === "ex_showroom");
                const priceStr = price
                  ? `₹${Number(price.amount).toLocaleString("en-IN")}`
                  : "Price N/A";

                return (
                  <div
                    key={v.id}
                    className="rounded-xl border border-white/80 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/80 p-3.5 backdrop-blur-md flex items-center justify-between gap-3 hover:bg-white/95 dark:hover:bg-[#2B2B2B] transition-all shadow-xs"
                  >
                    <div>
                      <strong className="font-bold text-[#0A0A0A] dark:text-[#F5F5F5] font-display text-sm block">
                        {v.make} {v.model}
                      </strong>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono">
                        {v.variant} • {v.modelYear} • {v.bodyType} • {priceStr}
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddVehicle(v.id)}
                    >
                      + Add to Compare
                    </Button>
                  </div>
                );
              })}

            {catalogVehicles.length === 0 && (
              <p className="text-xs font-normal text-center py-6 text-slate-400 dark:text-slate-500">
                No catalog vehicles available.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
