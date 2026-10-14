import { useState, useEffect } from "react";
import { Link } from "../router/Router.jsx";
import { useParams, useNavigate } from "../router/hooks.js";
import { catalogClient } from "../services/catalogClient.js";
import { recommendationClient } from "../services/recommendationClient.js";
import { addVehicleToCompare, getStoredCompareIds } from "../services/compareStorage.js";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { FaStar, FaRegStar, FaCarSide } from "react-icons/fa6";
import { FiShield } from "react-icons/fi";

export function VehicleDetailPage({ params: propParams }) {
  const routerParams = useParams();
  const navigate = useNavigate();
  const id = propParams?.id || routerParams?.id;
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    catalogClient
      .getVehicle(id)
      .then((data) => {
        if (active) {
          setVehicle(data);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load vehicle details.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  // Check if favorited
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    recommendationClient
      .listFavorites({ limit: 50 })
      .then((data) => {
        const found = data?.items?.some((f) => f.vehicleId === id);
        setIsFavorite(Boolean(found));
      })
      .catch(() => {});
  }, [isAuthenticated, id]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.warning("Sign in to save vehicles to favorites.", "Authentication Required");
      return;
    }

    try {
      if (isFavorite) {
        await recommendationClient.removeFavorite(id);
        setIsFavorite(false);
        toast.info("Removed from saved favorites.", "Favorite Updated");
      } else {
        await recommendationClient.addFavorite(id);
        setIsFavorite(true);
        toast.success("Added to your saved favorites!", "Favorite Saved");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update favorite.", "Error");
    }
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return "Not Reported";
    const num = Number(val);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return <LoadingSpinner label="Retrieving vehicle details..." size="lg" className="py-20" />;
  }

  if (error || !vehicle) {
    return (
      <div className="py-12">
        <Alert title="Vehicle Not Found or Unavailable" variant="error">
          {error || "The requested vehicle does not exist or is not currently published."}
        </Alert>
        <div className="mt-6">
          <Link
            to="/vehicles"
            className="inline-flex items-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-4 py-2 text-xs shadow-md shadow-[#D8FF2A]/25"
          >
            ← Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const specs = vehicle.specifications || {};

  return (
    <div className="py-4">
      {/* Navigation Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors"
        >
          ← Back to Catalog
        </Link>

        <div className="flex items-center gap-2.5">
          <Button
            variant={isFavorite ? "danger" : "secondary"}
            size="sm"
            onClick={handleToggleFavorite}
          >
            {isFavorite ? (
              <span className="inline-flex items-center gap-1.5">
                <FaStar className="w-3.5 h-3.5" />
                <span>In Favorites</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <FaRegStar className="w-3.5 h-3.5" />
                <span>Add to Favorites</span>
              </span>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
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
            className="!bg-[#1F5A3A] hover:!bg-[#16422a] !text-white !border-transparent shadow-md shadow-[#1F5A3A]/25"
          >
            Compare Vehicle
          </Button>
        </div>
      </div>

      {/* Main Vehicle Header Card */}
      <Card className="mb-6 sm:mb-8 p-4 sm:p-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {(() => {
            const allImages = Array.isArray(vehicle.images) && vehicle.images.length > 0
              ? vehicle.images
              : (vehicle.imageUrl ? [vehicle.imageUrl] : []);
            const currentImage = allImages[activeImageIndex] || allImages[0] || null;

            return (
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#1E1E1E] border border-slate-200/60 dark:border-white/10 shadow-sm h-56 sm:h-64 lg:h-72 w-full relative group">
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      onError={(e) => {
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
                      currentImage ? "hidden" : "flex"
                    }`}
                  >
                    <FaCarSide className="w-16 h-16 mb-2 opacity-40 text-slate-400" />
                    <span className="text-xs font-mono uppercase tracking-wider opacity-60">
                      {vehicle.make} {vehicle.model}
                    </span>
                  </div>
                </div>

                {/* Thumbnail carousel if multiple images exist */}
                {allImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {allImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          activeImageIndex === idx
                            ? "border-[#1F5A3A] dark:border-[#D8FF2A] scale-105 shadow-sm"
                            : "border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                  <Badge variant="forest" size="md">
                    {vehicle.bodyType}
                  </Badge>
                  <Badge variant="lime" size="md">
                    {vehicle.fuelType}
                  </Badge>
                  <Badge variant="charcoal" size="md">
                    {vehicle.transmission}
                  </Badge>
                  <Badge variant="forest" size="md">
                    {vehicle.seatingCapacity} Seats
                  </Badge>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
                  {vehicle.make} {vehicle.model}
                </h1>
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                  Variant: {vehicle.variant} • Model Year: {vehicle.modelYear}
                </p>
              </div>

              {/* Pricing Box */}
              <div className="rounded-2xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-[#2B2B2B]/60 p-4 backdrop-blur-md shadow-xs w-full sm:w-auto sm:min-w-[200px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Pricing Breakdown
                </span>
                {vehicle.prices && vehicle.prices.length > 0 ? (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {vehicle.prices.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                        <span className="font-semibold uppercase text-slate-500 dark:text-slate-400">
                          {p.type.replace("_", " ")}:
                        </span>
                        <strong className="font-extrabold font-mono text-[#0A0A0A] dark:text-[#F5F5F5] text-sm">
                          {formatCurrency(p.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 mt-2 block italic">
                    No pricing reported
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Specifications Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mb-6 sm:mb-8">
        {/* Engine & Performance */}
        <Card className="p-4 sm:p-6">
          <div className="border-b border-slate-200/60 dark:border-white/10 pb-3 mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight font-display">
              Engine & Performance
            </h2>
            <Badge variant="lime" size="sm">Powertrain</Badge>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Power Output</dt>
              <dd className="font-bold font-mono text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5">
                {specs.power?.value ? (
                  `${specs.power.value} ${specs.power.unit || "hp"}`
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>
                )}
              </dd>
            </div>

            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Torque</dt>
              <dd className="font-bold font-mono text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5">
                {specs.torque?.value ? (
                  `${specs.torque.value} ${specs.torque.unit || "Nm"}`
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>
                )}
              </dd>
            </div>

            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Displacement</dt>
              <dd className="font-bold font-mono text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5">
                {specs.displacement?.value ? (
                  `${specs.displacement.value} ${specs.displacement.unit || "cc"}`
                ) : specs.engine?.displacementCc ? (
                  `${specs.engine.displacementCc} cc`
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>
                )}
              </dd>
            </div>

            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Transmission</dt>
              <dd className="font-bold text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5 capitalize">
                {vehicle.transmission || "Unreported"}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Efficiency & Dimensions */}
        <Card className="p-4 sm:p-6">
          <div className="border-b border-slate-200/60 dark:border-white/10 pb-3 mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight font-display">
              Efficiency & Dimensions
            </h2>
            <Badge variant="forest" size="sm">Efficiency</Badge>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">
                {specs.claimedRange?.value ? "Claimed Range" : "Claimed Mileage"}
              </dt>
              <dd className="font-bold font-mono text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5">
                {specs.claimedMileage?.value ? (
                  `${specs.claimedMileage.value} ${specs.claimedMileage.unit || "km/l"}`
                ) : specs.claimedRange?.value ? (
                  `${specs.claimedRange.value} ${specs.claimedRange.unit || "km"}`
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>
                )}
              </dd>
            </div>

            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Measured Mileage</dt>
              <dd className="font-bold font-mono text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5">
                {specs.measuredMileage?.value ? (
                  `${specs.measuredMileage.value} ${specs.measuredMileage.unit || "km/l"}`
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>
                )}
              </dd>
            </div>

            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Boot Space</dt>
              <dd className="font-bold font-mono text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5">
                {specs.bootSpace?.value ? (
                  `${specs.bootSpace.value} ${specs.bootSpace.unit || "L"}`
                ) : specs.bootCapacity?.value ? (
                  `${specs.bootCapacity.value} ${specs.bootCapacity.unit || "L"}`
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>
                )}
              </dd>
            </div>

            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <dt className="font-medium text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Ground Clearance</dt>
              <dd className="font-bold font-mono text-sm text-[#0A0A0A] dark:text-[#F5F5F5] mt-0.5">
                {specs.groundClearance?.value ? (
                  `${specs.groundClearance.value} ${specs.groundClearance.unit || "mm"}`
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Provenance & Traceability Section */}
      <Card className="p-4 sm:p-6">
        <div className="border-b border-slate-200/60 dark:border-white/10 pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiShield className="w-4 h-4 text-[#1F5A3A] dark:text-[#D8FF2A]" />
            <h2 className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight font-display">
              Data Provenance & Traceability
            </h2>
          </div>
          <Badge variant="forest" size="sm">Verified Source</Badge>
        </div>

        <p className="text-xs font-normal text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          Every specification and price point on VehicleWise is independently verified and traceable to
          official documentation. Any unreported values are explicitly disclosed and never fabricated.
        </p>

        {vehicle.dataSources && vehicle.dataSources.length > 0 ? (
          <div className="flex flex-col gap-3">
            {vehicle.dataSources.map((ds, idx) => {
              const dateVal = ds.retrievedAt || ds.retrievalDate;
              const sourceUrl = ds.sourceUrl || (ds.sourceUrls && ds.sourceUrls[0]);
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-[#2B2B2B]/60 p-3.5 backdrop-blur-md text-xs shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <strong className="font-bold text-[#0A0A0A] dark:text-[#F5F5F5] font-display">{ds.provider}</strong>
                    <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                      Retrieved: {dateVal ? new Date(dateVal).toLocaleDateString() : "Verified"}
                    </span>
                  </div>
                  {sourceUrl && (
                    <div className="mt-1">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">Source Reference:</span>
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono font-medium text-[#1F5A3A] dark:text-[#D8FF2A] underline break-all hover:text-[#16422a] dark:hover:text-[#cbf520]"
                      >
                        {sourceUrl}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs font-normal text-slate-400 dark:text-slate-500 italic">
            No external provenance record attached to this vehicle.
          </div>
        )}
      </Card>
    </div>
  );
}
