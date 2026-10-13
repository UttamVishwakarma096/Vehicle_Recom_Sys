import { useState, useEffect } from "react";
import { Link } from "../router/Router.jsx";
import { recommendationClient } from "../services/recommendationClient.js";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { FiLock } from "react-icons/fi";
import { FaStar } from "react-icons/fa6";

export function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [favorites, setFavorites] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;

    recommendationClient
      .listFavorites({ page: 1, limit: 20 })
      .then((data) => {
        if (active) {
          setFavorites(data?.items || []);
          setPagination(data?.pagination || { page: 1, limit: 20, totalItems: 0, totalPages: 0 });
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load favorites.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleRemove = async (vehicleId) => {
    try {
      await recommendationClient.removeFavorite(vehicleId);
      toast.info("Removed from saved favorites.", "Favorite Removed");
      setFavorites((prev) => prev.filter((f) => f.vehicleId !== vehicleId));
      setPagination((prev) => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
      }));
    } catch (err) {
      toast.error(err.message || "Failed to remove favorite.", "Error");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="py-12">
        <Card className="max-w-md mx-auto text-center py-10 p-6">
          <FiLock className="w-12 h-12 mb-3 text-[#1F5A3A] dark:text-[#D8FF2A] mx-auto block" />
          <h1 className="text-xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
            Sign In to Access Favorites
          </h1>
          <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400 mb-6">
            Saved favorites are tied to your authenticated account.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-4 py-2 text-xs shadow-md shadow-[#D8FF2A]/25"
            >
              Sign In →
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center rounded-xl bg-white/80 dark:bg-[#2B2B2B]/80 hover:bg-white dark:hover:bg-[#2B2B2B] text-slate-700 dark:text-[#F5F5F5] border border-slate-200/80 dark:border-white/10 px-4 py-2 text-xs font-semibold shadow-xs backdrop-blur-md"
            >
              Sign Up
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="lime" size="sm">Saved Builds</Badge>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {pagination.totalItems} Bookmarked Vehicles
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
          Your Saved Favorites
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
          Quickly access and compare your bookmarked vehicles.
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading your favorites..." size="lg" className="py-16" />}

      {error && !loading && (
        <Alert title="Error Loading Favorites" variant="error">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          {favorites.length === 0 ? (
            <Card className="my-8 text-center py-12 p-6">
              <FaStar className="w-12 h-12 mb-3 text-[#D8FF2A] mx-auto block" />
              <h2 className="text-xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
                No Saved Vehicles Yet
              </h2>
              <p className="mt-2 text-xs font-normal text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                When you discover vehicles in the catalog or recommendations, click the star icon
                to bookmark them here.
              </p>
              <Link
                to="/vehicles"
                className="inline-flex items-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-5 py-2.5 text-xs shadow-md shadow-[#D8FF2A]/25"
              >
                Browse Vehicle Catalog →
              </Link>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((fav) => {
                const vehicle = fav.vehicle;
                const isUnavailable = fav.status !== "published" || !vehicle;

                if (isUnavailable) {
                  return (
                    <Card key={fav.id} className="border-dashed border-rose-200 dark:border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 p-6 flex flex-col justify-between">
                      <div>
                        <Badge variant="red" size="sm">UNAVAILABLE</Badge>
                        <h3 className="text-base font-bold mt-3 text-slate-700 dark:text-slate-300 font-display">
                          Vehicle Unavailable
                        </h3>
                        <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1">
                          This vehicle was unpublished or removed from the catalog.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-rose-100 dark:border-rose-900/30 flex justify-end">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemove(fav.vehicleId)}
                        >
                          Remove from List
                        </Button>
                      </div>
                    </Card>
                  );
                }

                const price = vehicle.prices?.find((p) => p.type === "ex_showroom");

                return (
                  <Card key={fav.id} className="flex flex-col justify-between p-4 sm:p-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-1.5">
                          <Badge variant="forest" size="sm">{vehicle.bodyType}</Badge>
                          <Badge variant="lime" size="sm">{vehicle.fuelType}</Badge>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                          Saved {new Date(fav.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight mt-2 font-display">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {vehicle.variant} • {vehicle.modelYear}
                      </p>

                      <div className="mt-4 p-3 rounded-xl bg-slate-50/70 dark:bg-[#2B2B2B]/60 border border-slate-200/60 dark:border-white/10 text-xs backdrop-blur-sm">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                          Ex-Showroom Price
                        </span>
                        <strong className="text-base font-mono font-extrabold text-[#0A0A0A] dark:text-[#F5F5F5]">
                          {price ? `₹${Number(price.amount).toLocaleString("en-IN")}` : "N/A"}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                      <Link
                        to={`/vehicles/${vehicle.id}`}
                        className="inline-flex items-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-3.5 py-1.5 text-xs shadow-sm shadow-[#D8FF2A]/20"
                      >
                        Details →
                      </Link>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemove(fav.vehicleId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
