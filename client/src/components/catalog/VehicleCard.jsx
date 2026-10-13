import { Link } from "../../router/Router.jsx";
import { Badge } from "../ui/Badge.jsx";
import { FaStar, FaRegStar, FaCarSide } from "react-icons/fa6";
import { FiCheck, FiPlus } from "react-icons/fi";

export function VehicleCard({
  vehicle,
  isFavorite = false,
  onToggleFavorite,
  isSelectedForCompare = false,
  onToggleCompare,
  compareDisabled = false,
}) {
  if (!vehicle) return null;

  const exShowroomPrice = vehicle.prices?.find(
    (p) => p.type === "ex_showroom" && p.currency === "INR",
  );
  const onRoadPrice = vehicle.prices?.find(
    (p) => p.type === "on_road" && p.currency === "INR",
  );

  const mileage = vehicle.specifications?.claimedMileage?.value;
  const range = vehicle.specifications?.claimedRange?.value;
  const power = vehicle.specifications?.power?.value;

  const formatCurrency = (val) => {
    if (!val) return "N/A";
    const num = Number(val);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <article className="rounded-2xl border border-[#2B2B2B]/10 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/60 p-5 shadow-[0_8px_30px_rgb(10,10,10,0.04)] dark:shadow-[0_10px_30px_rgb(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#1F5A3A]/30 dark:hover:border-[#D8FF2A]/30 hover:bg-white/85 dark:hover:bg-[#2B2B2B]/80 hover:shadow-[0_20px_40px_rgb(10,10,10,0.07)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.6)] flex flex-col justify-between">
      <div>
        {/* Top Badges & Actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="forest" size="sm">
              {vehicle.bodyType || "Vehicle"}
            </Badge>
            <Badge variant="lime" size="sm">
              {vehicle.fuelType}
            </Badge>
            <Badge variant="charcoal" size="sm">
              {vehicle.transmission}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(vehicle.id)}
                aria-label={isFavorite ? "Remove favorite" : "Add to favorites"}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all cursor-pointer ${
                  isFavorite
                    ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
                    : "bg-white/80 dark:bg-[#2B2B2B]/80 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#2B2B2B]/15 dark:border-white/10"
                }`}
              >
                {isFavorite ? <FaStar className="w-3.5 h-3.5" /> : <FaRegStar className="w-3.5 h-3.5" />}
              </button>
            )}

            {onToggleCompare && (
              <label
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer select-none transition-all ${
                  isSelectedForCompare
                    ? "bg-[#1F5A3A] text-white shadow-xs"
                    : compareDisabled
                      ? "opacity-40 cursor-not-allowed bg-slate-100/60 dark:bg-[#2B2B2B]/40 text-slate-400 border border-slate-200/50 dark:border-white/5"
                      : "bg-white/80 dark:bg-[#2B2B2B]/80 text-[#0A0A0A] dark:text-[#F5F5F5] hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] hover:bg-white dark:hover:bg-[#2B2B2B] border border-[#2B2B2B]/15 dark:border-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelectedForCompare}
                  disabled={!isSelectedForCompare && compareDisabled}
                  onChange={() => onToggleCompare(vehicle.id)}
                  className="sr-only"
                />
                {isSelectedForCompare ? (
                  <>
                    <FiCheck className="w-3 h-3" />
                    <span>Compare</span>
                  </>
                ) : (
                  <>
                    <FiPlus className="w-3 h-3" />
                    <span>Compare</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Vehicle Image Preview */}
        <Link
          to={`/vehicles/${vehicle.id}`}
          className="block relative w-full h-44 mb-3.5 rounded-xl overflow-hidden bg-slate-100/80 dark:bg-[#1E1E1E]/80 border border-slate-200/50 dark:border-white/5 group/img"
        >
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = "none";
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = "flex";
                }
              }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
            />
          ) : null}
          <div
            className={`w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#252525] dark:to-[#1a1a1a] ${
              vehicle.imageUrl ? "hidden" : "flex"
            }`}
          >
            <FaCarSide className="w-9 h-9 mb-1.5 opacity-50" />
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
              {vehicle.make} {vehicle.model}
            </span>
          </div>
        </Link>

        {/* Title */}
        <h3 className="text-lg font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight">
          <Link
            to={`/vehicles/${vehicle.id}`}
            className="hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors"
          >
            {vehicle.make} {vehicle.model}
          </Link>
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
          {vehicle.variant} • {vehicle.modelYear}
        </p>

        {/* Key Specs */}
        <div className="grid grid-cols-2 gap-2 my-3 border-y border-slate-100 dark:border-white/5 py-3 text-xs">
          <div>
            <span className="font-medium text-slate-400 dark:text-slate-500 block text-[10px] uppercase tracking-wider font-mono">
              {range ? "Range" : "Mileage"}
            </span>
            <span className="font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] font-mono">
              {mileage ? `${mileage} km/l` : range ? `${range} km` : <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-400 dark:text-slate-500 block text-[10px] uppercase tracking-wider font-mono">
              Power
            </span>
            <span className="font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] font-mono">
              {power ? `${power} hp` : <span className="text-slate-400 dark:text-slate-500 italic">Unreported</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/5 mt-2">
        <div className="mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block font-mono">
            Ex-Showroom Price
          </span>
          <span className="text-lg font-extrabold text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight font-mono">
            {formatCurrency(exShowroomPrice?.amount)}
          </span>
          {onRoadPrice && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block font-mono">
              On-Road: {formatCurrency(onRoadPrice.amount)}
            </span>
          )}
        </div>

        <Link
          to={`/vehicles/${vehicle.id}`}
          className="w-full inline-flex items-center justify-center rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-4 py-2 text-xs font-bold shadow-md shadow-[#D8FF2A]/20 hover:shadow-[#D8FF2A]/35 transition-all cursor-pointer"
        >
          View Full Specs →
        </Link>
      </div>
    </article>
  );
}
