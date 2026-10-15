import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { catalogClient } from "../services/catalogClient.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { ConfirmModal } from "../components/ui/ConfirmModal.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { AdminTabs } from "../components/layout/AdminTabs.jsx";
import { FiTrash2 } from "react-icons/fi";

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
  { value: "cng", label: "CNG" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
  { value: "lpg", label: "LPG" },
];

const TRANSMISSIONS = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft (Review before publishing)" },
  { value: "published", label: "Published (Live in public catalog)" },
];

const MILEAGE_UNITS = [
  { value: "km/l", label: "km/l (Liquid Fuel / Hybrid)" },
  { value: "km/kg", label: "km/kg (CNG / Gas)" },
];

const SAFETY_STAR_OPTIONS = [
  { value: "0", label: "Unrated / None" },
  { value: "1", label: "⭐ (1 Star)" },
  { value: "2", label: "⭐⭐ (2 Stars)" },
  { value: "3", label: "⭐⭐⭐ (3 Stars)" },
  { value: "4", label: "⭐⭐⭐⭐ (4 Stars)" },
  { value: "5", label: "⭐⭐⭐⭐⭐ (5 Stars - Top Safety)" },
];

const INITIAL_CREATE_FORM = {
  // 1. Core Identity
  make: "",
  model: "",
  variant: "",
  modelYear: new Date().getFullYear(),
  bodyType: "suv",
  fuelType: "petrol",
  transmission: "manual",
  seatingCapacity: 5,
  status: "draft",

  // 2. Pricing
  exShowroomPrice: "",
  onRoadPrice: "",
  usedPrice: "",

  // 3. Media
  imageUrl: "",
  additionalImages: "",

  // 4. Powertrain & Dimension Specs
  displacementCc: "",
  cylinders: "",
  powerHp: "",
  torqueNm: "",
  mileage: "",
  mileageUnit: "km/l",
  groundClearanceMm: "",
  bootSpaceLitres: "",
  fuelTankCapacityLitres: "",

  // 5. Electric / Hybrid
  batteryCapacityKwh: "",
  evRangeKm: "",

  // 6. Safety
  safetyStars: "0",
  safetyAgency: "Global NCAP",

  // 7. Data Provenance
  provider: "Official Manufacturer Brochure & Tech Specs",
  sourceUrl: "",
  licenseReference: "",
};

export function AdminCatalogPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("identity");
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom confirmation popup for vehicle deletion
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);

  const loadVehicles = useCallback(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    catalogClient
      .adminListVehicles({ limit: 50 })
      .then((data) => {
        setVehicles(data?.items || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load admin vehicle catalog.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    catalogClient
      .adminListVehicles({ limit: 50 })
      .then((data) => {
        if (active) {
          setVehicles(data?.items || []);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load admin vehicle catalog.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleStatusChange = async (vehicleId, newStatus) => {
    try {
      await catalogClient.adminUpdateStatus(vehicleId, newStatus);
      toast.success(`Vehicle transitioned to ${newStatus}.`, "Status Updated");
      loadVehicles();
    } catch (err) {
      toast.error(err.message || "Failed to change publication status.", "Error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      setIsDeletingVehicle(true);
      await catalogClient.adminDeleteVehicle(vehicleToDelete.id);
      toast.info("Vehicle record deleted.", "Deleted");
      setVehicleToDelete(null);
      loadVehicles();
    } catch (err) {
      toast.error(err.message || "Failed to delete vehicle.", "Error");
    } finally {
      setIsDeletingVehicle(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const exShowroom = Number(createForm.exShowroomPrice);
      if (!exShowroom || exShowroom <= 0) {
        toast.error("Valid ex-showroom price is required.", "Validation Error");
        return;
      }
      if (!createForm.make.trim()) {
        toast.error("Vehicle make is required.", "Validation Error");
        return;
      }
      if (!createForm.model.trim()) {
        toast.error("Vehicle model is required.", "Validation Error");
        return;
      }
      if (!createForm.provider.trim()) {
        toast.error("Data provenance provider is required.", "Validation Error");
        return;
      }

      // Build prices array
      const prices = [
        {
          type: "ex_showroom",
          amount: exShowroom,
          currency: "INR",
          effectiveAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        },
      ];

      const onRoad = Number(createForm.onRoadPrice);
      if (onRoad && onRoad > 0) {
        prices.push({
          type: "on_road",
          amount: onRoad,
          currency: "INR",
          effectiveAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        });
      }

      const used = Number(createForm.usedPrice);
      if (used && used > 0) {
        prices.push({
          type: "used",
          amount: used,
          currency: "INR",
          effectiveAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        });
      }

      // Build dataSources array with correct retrievedAt property
      const sourceUrl = createForm.sourceUrl?.trim();
      const dataSources = [
        {
          provider: createForm.provider.trim(),
          retrievedAt: new Date().toISOString(),
          ...(sourceUrl && { sourceUrl }),
          ...(createForm.licenseReference?.trim() && {
            licenseReference: createForm.licenseReference.trim(),
          }),
          fieldPaths: ["prices.ex_showroom", "specifications"],
        },
      ];

      // Parse additional images
      const rawAddImages = createForm.additionalImages || "";
      const parsedImages = rawAddImages
        .split(/[\n,]+/)
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const images = createForm.imageUrl?.trim()
        ? [createForm.imageUrl.trim(), ...parsedImages.filter((u) => u !== createForm.imageUrl.trim())]
        : parsedImages.length > 0
          ? parsedImages
          : undefined;

      // Build specifications object
      const specifications = {};

      const disp = Number(createForm.displacementCc);
      const cyl = Number(createForm.cylinders);
      if ((disp && disp > 0) || (cyl && cyl > 0)) {
        specifications.engine = {
          ...(disp > 0 && { displacementCc: disp }),
          ...(cyl > 0 && { cylinders: cyl }),
          verified: true,
        };
      }

      const pow = Number(createForm.powerHp);
      if (pow && pow > 0) {
        specifications.power = { value: pow, unit: "hp", verified: true };
      }

      const tor = Number(createForm.torqueNm);
      if (tor && tor > 0) {
        specifications.torque = { value: tor, unit: "Nm", verified: true };
      }

      const mil = Number(createForm.mileage);
      if (mil && mil > 0) {
        specifications.claimedMileage = {
          value: mil,
          unit: createForm.mileageUnit || "km/l",
          verified: true,
        };
      }

      const bat = Number(createForm.batteryCapacityKwh);
      if (bat && bat > 0) {
        specifications.battery = { capacityKwh: bat, verified: true };
      }

      const rng = Number(createForm.evRangeKm);
      if (rng && rng > 0) {
        specifications.range = { value: rng, unit: "km", verified: true };
      }

      const gc = Number(createForm.groundClearanceMm);
      if (gc && gc > 0) {
        specifications.groundClearance = { value: gc, unit: "mm", verified: true };
      }

      const bs = Number(createForm.bootSpaceLitres);
      if (bs && bs > 0) {
        specifications.bootSpace = { value: bs, unit: "litres", verified: true };
      }

      const ft = Number(createForm.fuelTankCapacityLitres);
      if (ft && ft > 0) {
        specifications.fuelTankCapacity = { value: ft, unit: "litres", verified: true };
      }

      const stars = Number(createForm.safetyStars);
      if (stars && stars > 0) {
        specifications.safetyRating = {
          stars,
          agency: createForm.safetyAgency?.trim() || "Global NCAP",
          verified: true,
        };
      }

      const payload = {
        make: createForm.make.trim(),
        model: createForm.model.trim(),
        ...(createForm.variant?.trim() && { variant: createForm.variant.trim() }),
        modelYear: Number(createForm.modelYear),
        bodyType: createForm.bodyType,
        fuelType: createForm.fuelType,
        transmission: createForm.transmission,
        seatingCapacity: Number(createForm.seatingCapacity),
        ...(createForm.imageUrl?.trim() && { imageUrl: createForm.imageUrl.trim() }),
        ...(images && images.length > 0 && { images }),
        ...(Object.keys(specifications).length > 0 && { specifications }),
        prices,
        dataSources,
        status: createForm.status || "draft",
      };

      await catalogClient.adminCreateVehicle(payload);
      toast.success(
        `Vehicle record created successfully as ${payload.status}!`,
        "Vehicle Created",
      );
      setIsCreateModalOpen(false);
      setCreateForm(INITIAL_CREATE_FORM);
      setActiveModalTab("identity");
      loadVehicles();
    } catch (err) {
      toast.error(err.message || "Failed to create vehicle record.", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-12">
        <Alert title="403 Forbidden: Administrator Privilege Required" variant="error">
          You are currently signed in as {user?.email || "guest"} with insufficient permissions.
          Catalog administration requires an authorized administrator role.
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-4">
      <AdminTabs />

      <div className="mb-6 flex justify-end">
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto"
        >
          + Create Vehicle Record
        </Button>
      </div>

      {loading && <LoadingSpinner label="Loading catalog inventory..." size="lg" className="py-16" />}

      {error && !loading && (
        <Alert title="Catalog Load Error" variant="error">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Card className="overflow-x-auto p-0 border border-white/80 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/80 backdrop-blur-xl rounded-2xl shadow-sm">
          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/10 bg-[#1F5A3A]/10 dark:bg-[#2B2B2B] backdrop-blur-md">
                <th className="px-3.5 py-3 sm:p-4 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vehicle</th>
                <th className="px-3.5 py-3 sm:p-4 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                <th className="px-3.5 py-3 sm:p-4 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fuel / Gearbox</th>
                <th className="px-3.5 py-3 sm:p-4 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ex-Showroom Price</th>
                <th className="px-3.5 py-3 sm:p-4 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-3.5 py-3 sm:p-4 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              {vehicles.map((v) => {
                const price = v.prices?.find((p) => p.type === "ex_showroom");
                const formattedPrice = price
                  ? `₹${Number(price.amount).toLocaleString("en-IN")}`
                  : "N/A";

                const statusStyles = {
                  published: { badge: "lime", label: "PUBLISHED" },
                  draft: { badge: "charcoal", label: "DRAFT" },
                  archived: { badge: "dark", label: "ARCHIVED" },
                };
                const s = statusStyles[v.status] || statusStyles.draft;

                return (
                  <tr key={v.id} className="hover:bg-[#1F5A3A]/5 dark:hover:bg-[#0A0A0A]/40 transition-colors">
                    <td className="px-3.5 py-3 sm:p-4">
                      <div className="font-bold font-display text-sm text-[#0A0A0A] dark:text-[#F5F5F5]">
                        {v.make} {v.model}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {v.variant} • {v.modelYear}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 sm:p-4 capitalize text-slate-700 dark:text-[#F5F5F5]">{v.bodyType}</td>
                    <td className="px-3.5 py-3 sm:p-4 uppercase text-slate-700 dark:text-[#F5F5F5]">{v.fuelType} / {v.transmission}</td>
                    <td className="px-3.5 py-3 sm:p-4 font-mono font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">{formattedPrice}</td>
                    <td className="px-3.5 py-3 sm:p-4">
                      <Badge variant={s.badge} size="sm">
                        {s.label}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-3 sm:p-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {v.status === "draft" && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleStatusChange(v.id, "published")}
                          >
                            Publish
                          </Button>
                        )}
                        {v.status === "published" && (
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={() => handleStatusChange(v.id, "archived")}
                          >
                            Archive
                          </Button>
                        )}
                        {v.status === "archived" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusChange(v.id, "draft")}
                          >
                            Set Draft
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setVehicleToDelete(v)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Vehicle Modal - Full Schema Coverage */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Vehicle Record (Full Catalog Schema)"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5">
          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setActiveModalTab("identity")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeModalTab === "identity"
                  ? "bg-[#D8FF2A] text-[#0A0A0A] font-bold shadow-xs"
                  : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              1. Identity & Pricing
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab("specs")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeModalTab === "specs"
                  ? "bg-[#D8FF2A] text-[#0A0A0A] font-bold shadow-xs"
                  : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              2. Technical Specifications & Safety
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab("media")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeModalTab === "media"
                  ? "bg-[#D8FF2A] text-[#0A0A0A] font-bold shadow-xs"
                  : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              3. Imagery & Provenance
            </button>
          </div>

          {/* TAB 1: Core Identity & Pricing */}
          {activeModalTab === "identity" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                A. Vehicle Identification
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  id="c-make"
                  name="make"
                  label="Make / Brand"
                  placeholder="e.g. Tata, Hyundai"
                  value={createForm.make}
                  onChange={(e) => setCreateForm({ ...createForm, make: e.target.value })}
                  required
                />
                <Input
                  id="c-model"
                  name="model"
                  label="Model"
                  placeholder="e.g. Nexon, Creta"
                  value={createForm.model}
                  onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                  required
                />
                <Input
                  id="c-variant"
                  name="variant"
                  label="Variant Trim"
                  placeholder="e.g. Fearless Plus S"
                  value={createForm.variant}
                  onChange={(e) => setCreateForm({ ...createForm, variant: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Input
                  id="c-year"
                  name="modelYear"
                  type="number"
                  label="Model Year"
                  value={createForm.modelYear}
                  onChange={(e) => setCreateForm({ ...createForm, modelYear: e.target.value })}
                  required
                />
                <Select
                  id="c-bodyType"
                  name="bodyType"
                  label="Body Type"
                  options={BODY_TYPES}
                  value={createForm.bodyType}
                  onChange={(e) => setCreateForm({ ...createForm, bodyType: e.target.value })}
                />
                <Select
                  id="c-fuelType"
                  name="fuelType"
                  label="Fuel Type"
                  options={FUEL_TYPES}
                  value={createForm.fuelType}
                  onChange={(e) => setCreateForm({ ...createForm, fuelType: e.target.value })}
                />
                <Select
                  id="c-transmission"
                  name="transmission"
                  label="Transmission"
                  options={TRANSMISSIONS}
                  value={createForm.transmission}
                  onChange={(e) => setCreateForm({ ...createForm, transmission: e.target.value })}
                />
                <Input
                  id="c-seats"
                  name="seatingCapacity"
                  type="number"
                  label="Seating Capacity"
                  placeholder="e.g. 5"
                  value={createForm.seatingCapacity}
                  onChange={(e) => setCreateForm({ ...createForm, seatingCapacity: e.target.value })}
                  required
                />
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mt-2">
                B. Pricing Structure & Status
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  id="c-ex-price"
                  name="exShowroomPrice"
                  type="number"
                  label="Ex-Showroom Price (INR)"
                  placeholder="e.g. 1420000"
                  value={createForm.exShowroomPrice}
                  onChange={(e) => setCreateForm({ ...createForm, exShowroomPrice: e.target.value })}
                  hint="Mandatory base price"
                  required
                />
                <Input
                  id="c-onroad-price"
                  name="onRoadPrice"
                  type="number"
                  label="On-Road Price (INR)"
                  placeholder="e.g. 1635000"
                  value={createForm.onRoadPrice}
                  onChange={(e) => setCreateForm({ ...createForm, onRoadPrice: e.target.value })}
                  hint="Optional estimated on-road price"
                />
                <Input
                  id="c-used-price"
                  name="usedPrice"
                  type="number"
                  label="Used Price (INR)"
                  placeholder="e.g. 950000"
                  value={createForm.usedPrice}
                  onChange={(e) => setCreateForm({ ...createForm, usedPrice: e.target.value })}
                  hint="Optional used market estimate"
                />
                <Select
                  id="c-status"
                  name="status"
                  label="Initial Status"
                  options={STATUS_OPTIONS}
                  value={createForm.status}
                  onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                  hint="Draft allows review before live display"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Technical Specifications & Safety */}
          {activeModalTab === "specs" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                A. Engine & Powertrain
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  id="c-displacement"
                  name="displacementCc"
                  type="number"
                  label="Displacement (cc)"
                  placeholder="e.g. 1199"
                  value={createForm.displacementCc}
                  onChange={(e) => setCreateForm({ ...createForm, displacementCc: e.target.value })}
                />
                <Input
                  id="c-cylinders"
                  name="cylinders"
                  type="number"
                  label="Cylinders"
                  placeholder="e.g. 3 or 4"
                  value={createForm.cylinders}
                  onChange={(e) => setCreateForm({ ...createForm, cylinders: e.target.value })}
                />
                <Input
                  id="c-power"
                  name="powerHp"
                  type="number"
                  label="Max Power (hp)"
                  placeholder="e.g. 120"
                  value={createForm.powerHp}
                  onChange={(e) => setCreateForm({ ...createForm, powerHp: e.target.value })}
                />
                <Input
                  id="c-torque"
                  name="torqueNm"
                  type="number"
                  label="Max Torque (Nm)"
                  placeholder="e.g. 170"
                  value={createForm.torqueNm}
                  onChange={(e) => setCreateForm({ ...createForm, torqueNm: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  id="c-mileage"
                  name="mileage"
                  type="number"
                  step="0.01"
                  label="Claimed Efficiency"
                  placeholder="e.g. 17.44"
                  value={createForm.mileage}
                  onChange={(e) => setCreateForm({ ...createForm, mileage: e.target.value })}
                />
                <Select
                  id="c-mileage-unit"
                  name="mileageUnit"
                  label="Efficiency Unit"
                  options={MILEAGE_UNITS}
                  value={createForm.mileageUnit}
                  onChange={(e) => setCreateForm({ ...createForm, mileageUnit: e.target.value })}
                />
                <Input
                  id="c-ground-clearance"
                  name="groundClearanceMm"
                  type="number"
                  label="Ground Clearance (mm)"
                  placeholder="e.g. 208"
                  value={createForm.groundClearanceMm}
                  onChange={(e) => setCreateForm({ ...createForm, groundClearanceMm: e.target.value })}
                />
                <Input
                  id="c-boot-space"
                  name="bootSpaceLitres"
                  type="number"
                  label="Boot Space (litres)"
                  placeholder="e.g. 382"
                  value={createForm.bootSpaceLitres}
                  onChange={(e) => setCreateForm({ ...createForm, bootSpaceLitres: e.target.value })}
                />
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mt-2">
                B. Fuel Tank & Electric Powertrain (If EV / Hybrid)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  id="c-fuel-tank"
                  name="fuelTankCapacityLitres"
                  type="number"
                  label="Fuel Tank Capacity (litres)"
                  placeholder="e.g. 44"
                  value={createForm.fuelTankCapacityLitres}
                  onChange={(e) => setCreateForm({ ...createForm, fuelTankCapacityLitres: e.target.value })}
                />
                <Input
                  id="c-battery-cap"
                  name="batteryCapacityKwh"
                  type="number"
                  step="0.1"
                  label="Battery Capacity (kWh)"
                  placeholder="e.g. 40.5 (EV only)"
                  value={createForm.batteryCapacityKwh}
                  onChange={(e) => setCreateForm({ ...createForm, batteryCapacityKwh: e.target.value })}
                />
                <Input
                  id="c-ev-range"
                  name="evRangeKm"
                  type="number"
                  label="EV Driving Range (km)"
                  placeholder="e.g. 465 (EV only)"
                  value={createForm.evRangeKm}
                  onChange={(e) => setCreateForm({ ...createForm, evRangeKm: e.target.value })}
                />
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mt-2">
                C. Safety Ratings
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  id="c-safety-stars"
                  name="safetyStars"
                  label="Crash Test Safety Stars"
                  options={SAFETY_STAR_OPTIONS}
                  value={createForm.safetyStars}
                  onChange={(e) => setCreateForm({ ...createForm, safetyStars: e.target.value })}
                />
                <Input
                  id="c-safety-agency"
                  name="safetyAgency"
                  label="Safety Testing Agency"
                  placeholder="e.g. Global NCAP, Bharat NCAP"
                  value={createForm.safetyAgency}
                  onChange={(e) => setCreateForm({ ...createForm, safetyAgency: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Imagery & Provenance */}
          {activeModalTab === "media" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                A. Imagery & Gallery
              </h3>
              <div className="grid gap-3">
                <Input
                  id="c-image-url"
                  name="imageUrl"
                  label="Primary Image URL"
                  placeholder="e.g. https://images.unsplash.com/photo-1549399542-7e3f8b79c341"
                  value={createForm.imageUrl}
                  onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
                  hint="Main hero image for vehicle catalog card and scanner matching"
                />
                <div>
                  <label htmlFor="c-additional-images" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Additional Gallery Images (Optional)
                  </label>
                  <textarea
                    id="c-additional-images"
                    name="additionalImages"
                    rows={3}
                    placeholder="Enter additional image URLs separated by commas or newlines..."
                    value={createForm.additionalImages}
                    onChange={(e) => setCreateForm({ ...createForm, additionalImages: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/70 p-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#D8FF2A]"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Multiple gallery views (exterior, interior, rear angle).
                  </span>
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mt-2">
                B. Data Provenance & Verification
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="c-provider"
                  name="provider"
                  label="Data Provenance Provider"
                  placeholder="e.g. Tata Motors Official Technical Sheet"
                  value={createForm.provider}
                  onChange={(e) => setCreateForm({ ...createForm, provider: e.target.value })}
                  hint="Required for audit compliance and publication"
                  required
                />
                <Input
                  id="c-source-url"
                  name="sourceUrl"
                  label="Source Reference URL"
                  placeholder="e.g. https://www.tatamotors.com/brochures"
                  value={createForm.sourceUrl}
                  onChange={(e) => setCreateForm({ ...createForm, sourceUrl: e.target.value })}
                  hint="Verifiable web reference for specifications"
                />
              </div>

              <div className="grid gap-3">
                <Input
                  id="c-license-ref"
                  name="licenseReference"
                  label="License / Public Material Reference"
                  placeholder="e.g. Manufacturer Public Media Press Kit 2024"
                  value={createForm.licenseReference}
                  onChange={(e) => setCreateForm({ ...createForm, licenseReference: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10 mt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {activeModalTab !== "identity" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (activeModalTab === "media") setActiveModalTab("specs");
                    else if (activeModalTab === "specs") setActiveModalTab("identity");
                  }}
                  className="w-full sm:w-auto"
                >
                  ← Previous Section
                </Button>
              )}
              {activeModalTab !== "media" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (activeModalTab === "identity") setActiveModalTab("specs");
                    else if (activeModalTab === "specs") setActiveModalTab("media");
                  }}
                  className="w-full sm:w-auto"
                >
                  Next Section →
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Creating..." : "Save Vehicle Record →"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Custom Confirmation Popup for Deleting Vehicle */}
      <ConfirmModal
        isOpen={Boolean(vehicleToDelete)}
        onClose={() => {
          if (!isDeletingVehicle) setVehicleToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isLoading={isDeletingVehicle}
        title="Delete Vehicle Record"
        variant="danger"
        confirmText="Permanently Delete"
        icon={<FiTrash2 className="w-5 h-5 text-rose-500" />}
      >
        {vehicleToDelete && (
          <div className="space-y-3">
            <p>
              Are you sure you want to permanently delete{" "}
              <strong>
                {vehicleToDelete.make} {vehicleToDelete.model}{" "}
                {vehicleToDelete.variant ? `(${vehicleToDelete.variant})` : ""}
              </strong>
              ?
            </p>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300">
              <span className="font-bold block mb-1">Permanent Removal:</span>
              This record will be completely removed from the catalog. This action <strong>cannot be undone</strong>.
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
