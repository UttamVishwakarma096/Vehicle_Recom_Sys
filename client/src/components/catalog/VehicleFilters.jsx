import { useState } from "react";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";
import { Button } from "../ui/Button.jsx";
import { FiSearch, FiChevronDown, FiChevronUp, FiFilter } from "react-icons/fi";

const BODY_TYPES = [
  { value: "hatchback", label: "Hatchback" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "muv", label: "MUV" },
  { value: "coupe", label: "Coupe" },
  { value: "convertible", label: "Convertible" },
  { value: "wagon", label: "Wagon" },
  { value: "pickup", label: "Pickup" },
];

const FUEL_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
  { value: "cng", label: "CNG" },
  { value: "lpg", label: "LPG" },
];

const TRANSMISSIONS = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
];

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Latest Additions" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "modelYear-desc", label: "Model Year: Newest" },
  { value: "modelYear-asc", label: "Model Year: Oldest" },
];

export function VehicleFilters({
  filters,
  onFilterChange,
  onReset,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [
    Boolean(filters.q),
    Boolean(filters.bodyType),
    Boolean(filters.fuelType),
    Boolean(filters.transmission),
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    Boolean(filters.sortBy && filters.sortBy !== "createdAt"),
  ].filter(Boolean).length;

  const handleChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value,
      page: 1, // reset to page 1 on filter change
    });
  };

  const handleSortChange = (val) => {
    if (!val) {
      handleChange("sortBy", undefined);
      handleChange("sortDirection", undefined);
      return;
    }
    const [sortBy, sortDirection] = val.split("-");
    onFilterChange({
      ...filters,
      sortBy,
      sortDirection,
      page: 1,
    });
  };

  const currentSortVal =
    filters.sortBy && filters.sortDirection
      ? `${filters.sortBy}-${filters.sortDirection}`
      : "createdAt-desc";

  return (
    <div className="rounded-2xl border border-[#2B2B2B]/10 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/60 p-4 sm:p-5 shadow-[0_8px_30px_rgb(10,10,10,0.04)] dark:shadow-[0_10px_30px_rgb(0,0,0,0.45)] backdrop-blur-xl mb-6 sm:mb-8 transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2B2B2B]/10 dark:border-white/10">
        {/* Desktop title */}
        <div className="hidden md:flex items-center gap-2">
          <FiSearch className="w-4 h-4 text-[#1F5A3A] dark:text-[#D8FF2A]" />
          <h2 className="text-sm font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5]">
            Filter & Search Catalog
          </h2>
          {activeCount > 0 && (
            <span className="bg-[#D8FF2A] text-[#0A0A0A] font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
              {activeCount} active
            </span>
          )}
        </div>

        {/* Mobile toggle button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex items-center gap-2 text-sm font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] cursor-pointer"
          aria-expanded={mobileOpen}
        >
          <FiFilter className="w-4 h-4 text-[#1F5A3A] dark:text-[#D8FF2A]" />
          <span>Filters & Search</span>
          {activeCount > 0 && (
            <span className="bg-[#D8FF2A] text-[#0A0A0A] font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
          )}
          {mobileOpen ? (
            <FiChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <FiChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button
              variant="subtle"
              size="sm"
              onClick={onReset}
            >
              Reset ({activeCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter inputs container: collapsible on mobile, always visible on md+ */}
      <div className={`${mobileOpen ? "block" : "hidden"} md:block pt-4 animate-in fade-in duration-150`}>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search query input */}
          <Input
            id="filter-q"
            name="q"
            label="Search Make / Model"
            placeholder="e.g. Nexon, City, Brezza..."
            value={filters.q || ""}
            onChange={(e) => handleChange("q", e.target.value)}
          />

          {/* Body Type */}
          <Select
            id="filter-bodyType"
            name="bodyType"
            label="Body Type"
            placeholder="All Body Types"
            options={BODY_TYPES}
            value={filters.bodyType || ""}
            onChange={(e) => handleChange("bodyType", e.target.value || undefined)}
          />

          {/* Fuel Type */}
          <Select
            id="filter-fuelType"
            name="fuelType"
            label="Fuel Type"
            placeholder="All Fuel Types"
            options={FUEL_TYPES}
            value={filters.fuelType || ""}
            onChange={(e) => handleChange("fuelType", e.target.value || undefined)}
          />

          {/* Transmission */}
          <Select
            id="filter-transmission"
            name="transmission"
            label="Transmission"
            placeholder="All Transmissions"
            options={TRANSMISSIONS}
            value={filters.transmission || ""}
            onChange={(e) => handleChange("transmission", e.target.value || undefined)}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Min Price */}
          <Input
            id="filter-minPrice"
            name="minPrice"
            type="number"
            label="Min Price (INR)"
            placeholder="e.g. 500000"
            value={filters.minPrice || ""}
            onChange={(e) =>
              handleChange("minPrice", e.target.value ? Number(e.target.value) : undefined)
            }
          />

          {/* Max Price */}
          <Input
            id="filter-maxPrice"
            name="maxPrice"
            type="number"
            label="Max Price (INR)"
            placeholder="e.g. 1500000"
            value={filters.maxPrice || ""}
            onChange={(e) =>
              handleChange("maxPrice", e.target.value ? Number(e.target.value) : undefined)
            }
          />

          {/* Sort By */}
          <Select
            id="filter-sort"
            name="sort"
            label="Sort Vehicles"
            options={SORT_OPTIONS}
            value={currentSortVal}
            onChange={(e) => handleSortChange(e.target.value)}
          />
        </div>

        {/* Mobile close button */}
        {mobileOpen && (
          <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/10 md:hidden flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setMobileOpen(false)}
              className="w-full justify-center"
            >
              Done Filtering
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
