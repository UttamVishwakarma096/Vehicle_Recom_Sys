import { useState, useEffect, useRef } from "react";
import { Link } from "../router/Router.jsx";
import { useNavigate } from "../router/hooks.js";
import { useAuth } from "../context/useAuth.js";
import { catalogClient } from "../services/catalogClient.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { FiSearch, FiX, FiCamera, FiZap, FiCheck, FiShield, FiLayers, FiArrowRight } from "react-icons/fi";
import { FaCar, FaCarSide, FaScaleBalanced } from "react-icons/fa6";
import { HiSparkles } from "react-icons/hi2";

export function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Interactive quick search input with debouncing
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Quick live search results based on debounced search query
  const [liveSearchState, setLiveSearchState] = useState({ query: "", items: [] });
  const isSearchingLive = Boolean(searchQuery.trim()) && (searchQuery.trim() !== debouncedQuery.trim() || liveSearchState.query !== debouncedQuery.trim());
  const liveResults = (debouncedQuery.trim() && liveSearchState.query === debouncedQuery.trim()) ? liveSearchState.items : [];
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Quick vehicle category filter preview
  const [selectedCategory, setSelectedCategory] = useState("all");
  // Catalog preview items
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const isCatalogLoading = loadingVehicles || (debouncedQuery.trim() !== "" && searchQuery.trim() !== debouncedQuery.trim());

  const categories = [
    { id: "all", label: "All Vehicles", icon: HiSparkles },
    { id: "suv", label: "SUVs & Compacts", icon: FaCarSide },
    { id: "sedan", label: "Sedans", icon: FaCar },
    { id: "hatchback", label: "Hatchbacks", icon: FaCar },
    { id: "muv", label: "MUVs & Family", icon: FaCarSide },
    { id: "electric", label: "Electric Vehicles (EV)", icon: FiZap },
  ];

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setLoadingVehicles(true);
  };

  // Fetch live quick matches as user types with debounce
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return;

    let active = true;

    catalogClient
      .listVehicles({ q: trimmed, limit: 5 })
      .then((data) => {
        if (active) {
          setLiveSearchState({ query: trimmed, items: data?.items || [] });
        }
      })
      .catch(() => {
        if (active) {
          setLiveSearchState({ query: trimmed, items: [] });
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Dismiss live search dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSearchDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Fetch verified catalog sample based on selected category & debounced search
  useEffect(() => {
    let active = true;

    const queryParams = { limit: 8 };
    if (selectedCategory === "electric") {
      queryParams.fuelType = "electric";
    } else if (selectedCategory !== "all") {
      queryParams.bodyType = selectedCategory;
    }
    if (debouncedQuery.trim()) {
      queryParams.q = debouncedQuery.trim();
    }

    catalogClient
      .listVehicles(queryParams)
      .then((data) => {
        if (active && data?.items) {
          setFeaturedVehicles(data.items);
        }
      })
      .catch(() => {
        if (active) setFeaturedVehicles([]);
      })
      .finally(() => {
        if (active) setLoadingVehicles(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCategory, debouncedQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsSearchDropdownOpen(false);
    if (searchQuery.trim()) {
      navigate(`/vehicles?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/vehicles");
    }
  };

  const filteredVehicles = featuredVehicles.filter((v) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "electric") return v.fuelType?.toLowerCase() === "electric";
    return v.bodyType?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const formatPrice = (val) => {
    if (!val) return "Price on inquiry";
    const num = Number(val);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="py-4 sm:py-8 flex flex-col gap-12 sm:gap-20">
      {/* 1. Hero Section */}
      <section className="relative flex flex-col items-start pt-2 sm:pt-6">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Badge variant="blue" size="md">
            <span className="inline-flex items-center gap-1.5">
              <HiSparkles className="w-3.5 h-3.5 text-[#1F5A3A] dark:text-[#D8FF2A]" />
              <span>Gemini Multimodal AI Vision</span>
            </span>
          </Badge>
          <Badge variant="lemon" size="md">
            100% Verified Specs
          </Badge>
          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
            Deterministic Decision Engine
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-[1.15] text-[#0A0A0A] dark:text-[#F5F5F5]">
          Intelligent vehicle discovery,{" "}
          <span className="bg-gradient-to-r from-[#1F5A3A] to-[#D8FF2A] dark:from-[#D8FF2A] dark:to-[#85e022] bg-clip-text text-transparent">
            grounded in real data.
          </span>
        </h1>

        <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base lg:text-lg font-normal leading-relaxed text-slate-600 dark:text-slate-300">
          Identify any car instantly with free Gemini AI vision, explore verified manufacturer
          specifications, and match your driving priorities using transparent, deterministic scoring.
        </p>

        {/* Quick Search Bar directly in Hero with Debounced Live Suggestions */}
        <div className="mt-6 sm:mt-8 w-full max-w-2xl relative" ref={searchContainerRef}>
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-2xl bg-white/80 dark:bg-[#2B2B2B]/80 backdrop-blur-xl border border-[#2B2B2B]/15 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/30 relative z-20"
          >
            <div className="relative flex-1 flex items-center min-h-[44px]">
              <FiSearch className="absolute left-3.5 sm:left-4 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchDropdownOpen(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                placeholder="Search car name (e.g. Nexon, Creta, Swift)..."
                className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-transparent text-sm font-medium text-[#0A0A0A] dark:text-[#F5F5F5] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchDropdownOpen(false);
                  }}
                  aria-label="Clear search"
                  className="mr-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer flex items-center justify-center p-1"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold shadow-md shadow-[#D8FF2A]/20 transition-all cursor-pointer w-full sm:w-auto min-h-[44px]"
            >
              Search Vehicles
            </button>
          </form>

          {/* Debounced Live Search Suggestions Dropdown */}
          {isSearchDropdownOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in duration-150">
              <div className="p-2 sm:p-2.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 px-3">
                <span>
                  {isSearchingLive
                    ? "Searching verified models..."
                    : `Live matches (${liveResults.length})`}
                </span>
                {isSearchingLive && (
                  <span className="w-3.5 h-3.5 border-2 border-[#1F5A3A] dark:border-[#D8FF2A] border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {liveResults.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-72 overflow-y-auto">
                  {liveResults.map((vehicle) => {
                    const exShowroom = vehicle.prices?.find(
                      (p) => p.type === "ex_showroom" && p.currency === "INR",
                    );
                    return (
                      <Link
                        key={vehicle.id}
                        to={`/vehicles/${vehicle.id}`}
                        onClick={() => setIsSearchDropdownOpen(false)}
                        className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-[#2B2B2B]/70 transition-colors group cursor-pointer"
                      >
                        <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-black/40 flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-white/5">
                          {(() => {
                            const img = vehicle.imageUrl || (Array.isArray(vehicle.images) && vehicle.images[0]) || null;
                            return img ? (
                              <img
                                src={img}
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <FaCarSide className="w-5 h-5 text-slate-400 opacity-60" />
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-[#0A0A0A] dark:text-[#F5F5F5] truncate group-hover:text-[#1F5A3A] dark:group-hover:text-[#D8FF2A] transition-colors">
                              {vehicle.make} {vehicle.model}
                            </span>
                            {vehicle.bodyType && (
                              <Badge variant="forest" size="sm" className="hidden sm:inline-flex">
                                {vehicle.bodyType}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {vehicle.variant || "Standard"} • {vehicle.fuelType}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-xs font-bold text-[#1F5A3A] dark:text-[#D8FF2A]">
                            {formatPrice(exShowroom?.amount)}
                          </div>
                          <span className="text-[10px] text-slate-400">ex-showroom</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : !isSearchingLive ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  No verified vehicles found matching &ldquo;{debouncedQuery}&rdquo;.
                </div>
              ) : null}

              <div className="p-2 sm:p-2.5 bg-slate-50/80 dark:bg-[#161616]/80 border-t border-slate-100 dark:border-white/5 flex items-center justify-between px-3">
                <Link
                  to={`/vehicles?search=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={() => setIsSearchDropdownOpen(false)}
                  className="text-xs font-semibold text-[#1F5A3A] dark:text-[#D8FF2A] hover:underline inline-flex items-center gap-1.5"
                >
                  <span>View all results in Catalog</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[10px] font-mono text-slate-400">Press Enter ↵</span>
              </div>
            </div>
          )}

          {/* Quick Search Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs">Popular:</span>
            {["Compact SUV", "Electric", "Under ₹10 Lakh", "Automatic"].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchQuery(term);
                  setIsSearchDropdownOpen(true);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-[#2B2B2B]/80 hover:bg-[#D8FF2A]/20 hover:text-[#0A0A0A] dark:hover:text-[#D8FF2A] border border-[#2B2B2B]/15 dark:border-white/10 transition-colors cursor-pointer text-[11px] sm:text-xs"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Quick Action Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3.5 w-full sm:w-auto">
          <Link
            to="/ai-scanner"
            className="inline-flex items-center gap-2 justify-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-5 sm:px-6 py-3 sm:py-3.5 text-sm font-bold shadow-lg shadow-[#D8FF2A]/20 hover:shadow-[#D8FF2A]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer w-full sm:w-auto"
          >
            <FiCamera className="w-4 h-4" />
            <span>Scan Any Car (AI) →</span>
          </Link>

          <Link
            to="/recommendations"
            className="inline-flex items-center gap-2 justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 px-5 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold shadow-xs hover:shadow-md backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer w-full sm:w-auto"
          >
            <FiZap className="w-4 h-4 text-[#1F5A3A] dark:text-[#D8FF2A]" />
            <span>Match Driving Needs</span>
          </Link>

          <Link
            to="/compare"
            className="inline-flex items-center gap-2 justify-center rounded-xl bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/80 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 px-5 sm:px-6 py-3 sm:py-3.5 text-sm font-semibold backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer w-full sm:w-auto"
          >
            <FaScaleBalanced className="w-3.5 h-3.5" />
            <span>Compare Matrix</span>
          </Link>
        </div>
      </section>

      {/* 2. Key Metrics Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-5 rounded-2xl bg-white/60 dark:bg-[#2B2B2B]/60 backdrop-blur-xl border border-[#2B2B2B]/10 dark:border-white/10 text-center">
          <div className="text-xl sm:text-3xl font-mono font-bold text-[#1F5A3A] dark:text-[#D8FF2A]">
            0%
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
            Zero Fabricated Specs
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            100% verified provenance
          </div>
        </div>

        <div className="p-3 sm:p-5 rounded-2xl bg-white/60 dark:bg-[#2B2B2B]/60 backdrop-blur-xl border border-[#2B2B2B]/10 dark:border-white/10 text-center">
          <div className="text-xl sm:text-3xl font-mono font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">
            &lt; 2s
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
            Gemini Vision Scan
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Instant car identification
          </div>
        </div>

        <div className="p-3 sm:p-5 rounded-2xl bg-white/60 dark:bg-[#2B2B2B]/60 backdrop-blur-xl border border-[#2B2B2B]/10 dark:border-white/10 text-center">
          <div className="text-xl sm:text-3xl font-mono font-bold text-[#1F5A3A] dark:text-[#D8FF2A]">
            100%
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
            Deterministic Engine
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Explainable score weighting
          </div>
        </div>

        <div className="p-3 sm:p-5 rounded-2xl bg-white/60 dark:bg-[#2B2B2B]/60 backdrop-blur-xl border border-[#2B2B2B]/10 dark:border-white/10 text-center">
          <div className="text-xl sm:text-3xl font-mono font-bold text-[#1F5A3A] dark:text-[#D8FF2A]">
            0
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
            Commercial Bias
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Objective buyer-first advice
          </div>
        </div>
      </section>

      {/* 3. Featured AI Scanner Interactive Showcase Banner */}
      <section>
        <Card className="p-4 sm:p-8 bg-gradient-to-br from-[#1F5A3A]/15 via-[#2B2B2B]/20 to-[#D8FF2A]/10 border-[#1F5A3A]/30 dark:border-[#D8FF2A]/25 overflow-hidden relative">
          <div className="grid gap-6 md:gap-8 md:grid-cols-12 items-center">
            <div className="md:col-span-7 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D8FF2A] animate-ping" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1F5A3A] dark:text-[#D8FF2A]">
                  Multimodal AI Spotlight
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
                Spotted a car you like? Let Gemini AI identify it.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Just drag-and-drop a photo or press{" "}
                <kbd className="font-mono bg-white dark:bg-[#2B2B2B] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 text-xs">
                  Ctrl+V
                </kbd>{" "}
                anywhere to paste an image. Our multimodal vision engine identifies the make, model,
                year, body type, and immediately cross-references verified vehicles in our catalog.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                <Link
                  to="/ai-scanner"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-5 py-2.5 text-xs font-bold shadow-md shadow-[#D8FF2A]/20 transition-all cursor-pointer w-full sm:w-auto"
                >
                  <span>Try AI Car Scanner Now</span>
                  <FiCamera className="w-3.5 h-3.5" />
                </Link>
                {!isAuthenticated ? (
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-[#1F5A3A] dark:text-[#D8FF2A] hover:underline"
                  >
                    Sign in to unlock AI features →
                  </Link>
                ) : (
                  <span className="text-xs text-[#1F5A3A] dark:text-[#D8FF2A] font-semibold flex items-center gap-1.5">
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>Signed in as {user?.email}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Visual AI Preview Graphic */}
            <div className="md:col-span-5 flex justify-center w-full">
              <div className="w-full max-w-sm rounded-2xl border border-white/80 dark:border-white/15 bg-white/70 dark:bg-[#2B2B2B]/80 p-3.5 sm:p-4 shadow-xl backdrop-blur-xl flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#2B2B2B]/10 dark:border-white/10 pb-2">
                  <span className="text-xs font-bold font-display text-slate-800 dark:text-slate-200">
                    Live Vision Detection
                  </span>
                  <Badge variant="lime" size="sm">
                    96% CONFIDENCE
                  </Badge>
                </div>
                <div className="h-28 sm:h-32 rounded-xl bg-gradient-to-tr from-[#0A0A0A] via-[#1F5A3A]/40 to-[#2B2B2B] flex items-center justify-center text-4xl shadow-inner relative overflow-hidden">
                  <FaCar className="w-10 sm:w-12 h-10 sm:h-12 text-[#D8FF2A] animate-pulse" />
                  <div className="absolute inset-x-0 bottom-0 py-1 bg-black/70 backdrop-blur-xs text-center text-[10px] font-mono text-[#D8FF2A]">
                    SCANNING: FRONT FASCIA & BODY PROFILE
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-[#0A0A0A] dark:text-[#F5F5F5] font-bold block">
                      Tata Nexon
                    </strong>
                    <span className="text-[11px] text-slate-500">Compact SUV • 2023-2024</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#1F5A3A] dark:text-[#D8FF2A]">
                    ₹8,15,000+
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. Verified Catalog Preview Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <Badge variant="blue" size="sm">
              Live Catalog
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight mt-1">
              Explore Verified Vehicles
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real manufacturer specifications verified by Catalog administrators.
            </p>
          </div>
          <Link
            to="/vehicles"
            className="text-xs font-semibold text-[#1F5A3A] dark:text-[#D8FF2A] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            View all vehicles in catalog →
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-[#D8FF2A] text-[#0A0A0A] shadow-sm shadow-[#D8FF2A]/20 font-bold"
                    : "bg-white/70 dark:bg-[#2B2B2B]/70 text-slate-700 dark:text-[#F5F5F5] hover:bg-slate-100 dark:hover:bg-[#2B2B2B] border border-[#2B2B2B]/15 dark:border-white/10"
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Debounced Search Query Filter Indicator */}
        {debouncedQuery.trim() && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:px-4 rounded-xl bg-white/70 dark:bg-[#2B2B2B]/60 border border-[#2B2B2B]/10 dark:border-white/10 text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Live results for search query: <strong className="text-[#0A0A0A] dark:text-[#F5F5F5]">&ldquo;{debouncedQuery.trim()}&rdquo;</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setIsSearchDropdownOpen(false);
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
            >
              <FiX className="w-3.5 h-3.5" /> Clear search
            </button>
          </div>
        )}

        {/* Catalog Grid */}
        {isCatalogLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/40 dark:bg-[#2B2B2B]/40 animate-pulse border border-[#2B2B2B]/10 dark:border-white/5"
              />
            ))}
          </div>
        ) : filteredVehicles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredVehicles.map((vehicle) => {
              const exShowroom = vehicle.prices?.find(
                (p) => p.type === "ex_showroom" && p.currency === "INR",
              );
              return (
                <Link
                  key={vehicle.id}
                  to={`/vehicles/${vehicle.id}`}
                  className="group rounded-2xl border border-[#2B2B2B]/10 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/60 p-4 shadow-[0_8px_30px_rgb(10,10,10,0.04)] dark:shadow-[0_10px_30px_rgb(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#1F5A3A]/40 dark:hover:border-[#D8FF2A]/40 hover:shadow-lg flex flex-col justify-between"
                >
                  <div>
                    {/* Vehicle Preview Image */}
                    {(() => {
                      const img = vehicle.imageUrl || (Array.isArray(vehicle.images) && vehicle.images[0]) || null;
                      return (
                        <div className="relative w-full h-36 mb-3 rounded-xl overflow-hidden bg-slate-100/80 dark:bg-[#1E1E1E]/80 border border-slate-200/50 dark:border-white/5">
                          {img ? (
                            <img
                              src={img}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = "flex";
                                }
                              }}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#252525] dark:to-[#1a1a1a] ${
                              img ? "hidden" : "flex"
                            }`}
                          >
                            <FaCarSide className="w-8 h-8 mb-1 opacity-50" />
                            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
                              {vehicle.make} {vehicle.model}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between gap-1 mb-2">
                      <Badge variant="forest" size="sm">
                        {vehicle.bodyType || "Vehicle"}
                      </Badge>
                      <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
                        {vehicle.fuelType}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-base text-[#0A0A0A] dark:text-[#F5F5F5] group-hover:text-[#1F5A3A] dark:group-hover:text-[#D8FF2A] transition-colors">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {vehicle.variant || "Standard Edition"}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#2B2B2B]/10 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Ex-Showroom
                      </span>
                      <span className="font-mono font-bold text-sm text-[#1F5A3A] dark:text-[#D8FF2A]">
                        {formatPrice(exShowroom?.amount)}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 group-hover:translate-x-1 group-hover:text-[#1F5A3A] dark:group-hover:text-[#D8FF2A] transition-all">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#2B2B2B]/20 dark:border-white/15 p-8 text-center bg-white/30 dark:bg-[#2B2B2B]/30">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {debouncedQuery.trim()
                ? `No vehicles found matching "${debouncedQuery.trim()}" in ${
                    categories.find((c) => c.id === selectedCategory)?.label || "selected category"
                  }.`
                : `No vehicles found in ${selectedCategory}. Explore the full catalog to filter all vehicles.`}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              {debouncedQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchDropdownOpen(false);
                  }}
                  className="text-xs font-semibold text-[#1F5A3A] dark:text-[#D8FF2A] hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
              <Link
                to="/vehicles"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
              >
                Browse Full Catalog →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 5. 3 Steps: How It Works */}
      <section>
        <div className="text-center mb-8">
          <Badge variant="lime" size="sm">
            Simple 3-Step Flow
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight mt-2">
            How VehicleWise Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
            From discovering vehicles to calculating ranked matches, everything is built for
            transparency and clarity.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="p-6 relative">
            <span className="w-8 h-8 rounded-full bg-[#D8FF2A] text-[#0A0A0A] font-mono font-bold text-xs flex items-center justify-center mb-4 shadow-md shadow-[#D8FF2A]/20">
              01
            </span>
            <h3 className="text-base font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
              Snap, Paste, or Search
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Drag-and-drop a car photo into our Gemini AI scanner or explore verified catalog
              filters by budget, fuel type, transmission, and seat count.
            </p>
          </Card>

          <Card className="p-6 relative">
            <span className="w-8 h-8 rounded-full bg-[#D8FF2A] text-[#0A0A0A] font-mono font-bold text-xs flex items-center justify-center mb-4 shadow-md shadow-[#D8FF2A]/20">
              02
            </span>
            <h3 className="text-base font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
              Set Your Priorities
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Scale your preferences for fuel efficiency, power performance, safety ratings, and
              maintenance costs from 1 to 5 to generate custom component weights.
            </p>
          </Card>

          <Card className="p-6 relative">
            <span className="w-8 h-8 rounded-full bg-[#D8FF2A] text-[#0A0A0A] font-mono font-bold text-xs flex items-center justify-center mb-4 shadow-md shadow-[#D8FF2A]/20">
              03
            </span>
            <h3 className="text-base font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
              Inspect Ranked Evidence
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Receive deterministic match scores, positive strengths, and clear trade-off
              disclosures before comparing vehicles side-by-side.
            </p>
          </Card>
        </div>
      </section>

      {/* 6. Core Architectural Pillars */}
      <section className="grid gap-6 sm:grid-cols-3">
        <Card hoverEffect className="p-6">
          <div className="w-10 h-10 rounded-xl bg-[#1F5A3A]/15 border border-[#1F5A3A]/30 flex items-center justify-center text-[#1F5A3A] dark:text-[#D8FF2A] mb-4">
            <FiZap className="w-5 h-5" />
          </div>
          <Badge variant="forest" size="sm">
            Rule-Based v1
          </Badge>
          <h2 className="mt-3 text-lg font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
            Deterministic Scoring
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-normal">
            Transparent, repeatable mathematical compatibility calculated directly against verified
            vehicle specifications. We never generate opaque black-box estimates or uncalibrated probabilities.
          </p>
        </Card>

        <Card hoverEffect className="p-6">
          <div className="w-10 h-10 rounded-xl bg-[#D8FF2A]/15 border border-[#D8FF2A]/30 flex items-center justify-center text-[#0A0A0A] dark:text-[#D8FF2A] mb-4">
            <FiShield className="w-5 h-5" />
          </div>
          <Badge variant="lime" size="sm">
            Traceable Truth
          </Badge>
          <h2 className="mt-3 text-lg font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
            Zero Invented Specs
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-normal">
            Missing, unknown, or unverified vehicle specifications are explicitly disclosed under
            missing-data warnings and never populated with synthetic estimates.
          </p>
        </Card>

        <Card hoverEffect className="p-6">
          <div className="w-10 h-10 rounded-xl bg-[#2B2B2B]/15 border border-[#2B2B2B]/30 flex items-center justify-center text-[#2B2B2B] dark:text-[#F5F5F5] mb-4">
            <FiLayers className="w-5 h-5" />
          </div>
          <Badge variant="charcoal" size="sm">
            Buyer First
          </Badge>
          <h2 className="mt-3 text-lg font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
            Zero Commercial Bias
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-normal">
            No sponsored rankings, dealer kickbacks, or promotional boosting. Every match is
            ranked strictly on merit and your personal criteria.
          </p>
        </Card>
      </section>

      {/* 7. Catalog Integrity Notice */}
      <section>
        <Alert title="Catalog Data Integrity Guarantee" variant="warning">
          Every vehicle specification, price point, and trim feature on VehicleWise is
          independently verified against official manufacturer documentation before being published.
        </Alert>
      </section>

      {/* 8. Final Call to Action */}
      <section>
        <Card className="p-5 sm:p-10 text-center bg-gradient-to-r from-[#1F5A3A]/15 via-[#2B2B2B]/20 to-[#D8FF2A]/10 border-[#1F5A3A]/25 dark:border-[#D8FF2A]/25 relative overflow-hidden">
          <h2 className="text-xl sm:text-3xl font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
            Ready to find your ideal vehicle?
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-6">
            Join VehicleWise to access the Gemini AI Car Scanner, calculate personalized
            recommendation scores, and save favorite comparison matrices.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-5 sm:px-6 py-3 sm:py-3.5 text-xs font-bold shadow-md shadow-[#D8FF2A]/20 hover:shadow-[#D8FF2A]/35 transition-all cursor-pointer text-center"
                >
                  Create Free Account →
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl bg-white/80 dark:bg-[#2B2B2B]/80 text-[#0A0A0A] dark:text-[#F5F5F5] border border-[#2B2B2B]/15 dark:border-white/10 px-5 sm:px-6 py-3 sm:py-3.5 text-xs font-semibold shadow-xs hover:bg-white dark:hover:bg-[#2B2B2B] transition-all cursor-pointer text-center"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/ai-scanner"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-5 sm:px-6 py-3 sm:py-3.5 text-xs font-bold shadow-md shadow-[#D8FF2A]/20 hover:shadow-[#D8FF2A]/35 transition-all cursor-pointer text-center"
                >
                  <FiCamera className="w-4 h-4" />
                  <span>Open AI Car Scanner →</span>
                </Link>
                <Link
                  to="/recommendations"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/80 dark:bg-[#2B2B2B]/80 text-[#0A0A0A] dark:text-[#F5F5F5] border border-[#2B2B2B]/15 dark:border-white/10 px-5 sm:px-6 py-3 sm:py-3.5 text-xs font-semibold shadow-xs hover:bg-white dark:hover:bg-[#2B2B2B] transition-all cursor-pointer text-center"
                >
                  <FiZap className="w-4 h-4 text-[#1F5A3A] dark:text-[#D8FF2A]" />
                  <span>Start Recommendation Flow</span>
                </Link>
              </>
            )}
            <Link
              to="/vehicles"
              className="rounded-xl bg-slate-100/80 dark:bg-[#2B2B2B]/60 text-slate-700 dark:text-[#F5F5F5] px-5 sm:px-6 py-3 sm:py-3.5 text-xs font-semibold hover:bg-slate-200/80 dark:hover:bg-[#2B2B2B] transition-all cursor-pointer text-center"
            >
              Browse Vehicle Catalog
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
