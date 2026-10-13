import { useState, useEffect, useCallback } from "react";
import { Link } from "../router/Router.jsx";
import { useLocation, useNavigate } from "../router/hooks.js";
import { catalogClient } from "../services/catalogClient.js";
import { recommendationClient } from "../services/recommendationClient.js";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { VehicleCard } from "../components/catalog/VehicleCard.jsx";
import { VehicleFilters } from "../components/catalog/VehicleFilters.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { FiLock } from "react-icons/fi";

const DEFAULT_FILTERS = {
  page: 1,
  limit: 12,
  priceType: "ex_showroom",
};

export function CatalogPage() {
  const { search } = useLocation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(
      search || (typeof window !== "undefined" ? window.location.search : "")
    );
    const q = params.get("search") || params.get("q") || "";
    const bodyType = params.get("bodyType") || "";
    const fuelType = params.get("fuelType") || "";
    const maxPrice = params.get("maxPrice") || "";
    const transmission = params.get("transmission") || "";

    return {
      ...DEFAULT_FILTERS,
      ...(q ? { q } : {}),
      ...(bodyType ? { bodyType } : {}),
      ...(fuelType ? { fuelType } : {}),
      ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
      ...(transmission ? { transmission } : {}),
    };
  });
  const [vehicles, setVehicles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  // Fetch favorites if user is authenticated
  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
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

  // Load vehicles from catalog
  const loadVehicles = useCallback(() => {
    setLoading(true);
    setError(null);
    catalogClient
      .listVehicles(filters)
      .then((data) => {
        setVehicles(data?.items || []);
        setPagination(data?.pagination || { page: 1, limit: 12, totalItems: 0, totalPages: 0 });
      })
      .catch((err) => {
        setError(err.message || "Failed to load vehicle catalog.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    let active = true;
    catalogClient
      .listVehicles(filters)
      .then((data) => {
        if (active) {
          setVehicles(data?.items || []);
          setPagination(data?.pagination || { page: 1, limit: 12, totalItems: 0, totalPages: 0 });
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load vehicle catalog.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const handleToggleFavorite = async (vehicleId) => {
    if (!isAuthenticated) {
      toast.warning("Sign in to save vehicles to your favorites.", "Authentication Required");
      return;
    }

    const isFav = favoriteIds.has(vehicleId);
    try {
      if (isFav) {
        await recommendationClient.removeFavorite(vehicleId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(vehicleId);
          return next;
        });
        toast.info("Removed from saved favorites.", "Favorite Updated");
      } else {
        await recommendationClient.addFavorite(vehicleId);
        setFavoriteIds((prev) => new Set(prev).add(vehicleId));
        toast.success("Added to your saved favorites!", "Favorite Saved");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update favorite.", "Error");
    }
  };

  const handleToggleCompare = (vehicleId) => {
    if (!isAuthenticated) {
      toast.warning("Please sign in to compare vehicles.", "Authentication Required");
      navigate("/login");
      return;
    }
    setSelectedForCompare((prev) => {
      if (prev.includes(vehicleId)) {
        return prev.filter((id) => id !== vehicleId);
      }
      if (prev.length >= 4) {
        toast.warning("Comparison is capped at 4 vehicles maximum.", "Cap Reached");
        return prev;
      }
      return [...prev, vehicleId];
    });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="py-4">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] sm:text-4xl">
          Vehicle Catalog
        </h1>
        <p className="mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">
          Explore published vehicles with verified pricing and traceable specifications.
        </p>
      </div>

      {/* Filter Component */}
      <VehicleFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Floating Comparison Tray */}
      {selectedForCompare.length > 0 && (
        <div className="sticky top-16 lg:top-20 z-30 mb-6 rounded-2xl border border-white/80 dark:border-white/10 bg-white/90 dark:bg-[#2B2B2B]/90 p-3 sm:p-4 shadow-xl backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="rounded-full bg-[#0A0A0A] dark:bg-[#F5F5F5] text-[#F5F5F5] dark:text-[#0A0A0A] px-2.5 sm:px-3 py-1 text-xs font-mono font-semibold">
              {selectedForCompare.length}/4 Selected
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-[#F5F5F5]">
              Compare vehicles side-by-side
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="rounded-xl bg-slate-100 dark:bg-[#0A0A0A]/60 hover:bg-slate-200 dark:hover:bg-[#0A0A0A] text-slate-700 dark:text-[#F5F5F5] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear
            </button>

            {selectedForCompare.length >= 2 ? (
              <Link
                to={isAuthenticated ? `/compare?ids=${selectedForCompare.join(",")}` : "/login"}
                className="rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-4 py-1.5 text-xs shadow-md shadow-[#D8FF2A]/25 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                {!isAuthenticated && <FiLock className="w-3.5 h-3.5" />}
                <span>{isAuthenticated ? `Launch Comparison (${selectedForCompare.length}) →` : "Sign In to Compare →"}</span>
              </Link>
            ) : (
              <span className="rounded-xl bg-slate-100/60 dark:bg-[#0A0A0A]/40 border border-slate-200/50 dark:border-white/5 px-3 py-1.5 text-xs font-medium text-slate-400">
                Select at least 2
              </span>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingSpinner label="Querying vehicle catalog..." size="lg" className="py-16" />}

      {/* Error State */}
      {error && !loading && (
        <div className="my-8">
          <Alert title="Unable to Load Catalog" variant="error">
            {error}
          </Alert>
          <div className="mt-4">
            <Button variant="primary" onClick={loadVehicles}>
              Retry Query ⟳
            </Button>
          </div>
        </div>
      )}

      {/* Content State */}
      {!loading && !error && (
        <>
          {vehicles.length === 0 ? (
            <div className="my-12">
              <Alert title="No Vehicles Match Constraints" variant="warning">
                No published vehicles in the catalog satisfy your exact query parameters. Hard
                constraints are never relaxed automatically. Try broadening your budget range or
                clearing specific fuel/transmission filters.
              </Alert>
              <div className="mt-4">
                <Button variant="primary" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Reset Filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Results Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>
                  Showing {vehicles.length} of {pagination.totalItems} published vehicles
                </span>
                <span className="font-mono">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>

              {/* Grid */}
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    isFavorite={favoriteIds.has(v.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isSelectedForCompare={selectedForCompare.includes(v.id)}
                    onToggleCompare={handleToggleCompare}
                    compareDisabled={selectedForCompare.length >= 4}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2.5 sm:gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    ← Previous
                  </Button>
                  <span className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#2B2B2B]/80 px-3.5 py-1.5 text-xs font-mono font-semibold text-slate-700 dark:text-[#F5F5F5] shadow-xs backdrop-blur-sm">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
