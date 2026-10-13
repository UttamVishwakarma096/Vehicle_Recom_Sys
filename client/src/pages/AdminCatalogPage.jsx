import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { catalogClient } from "../services/catalogClient.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";

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

export function AdminCatalogPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    make: "",
    model: "",
    variant: "",
    modelYear: new Date().getFullYear(),
    bodyType: "suv",
    fuelType: "petrol",
    transmission: "manual",
    seatingCapacity: 5,
    exShowroomPrice: "",
    provider: "Official Manufacturer Brochure",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDelete = async (vehicleId) => {
    if (!window.confirm("Are you sure you want to delete this vehicle record?")) return;
    try {
      await catalogClient.adminDeleteVehicle(vehicleId);
      toast.info("Vehicle record deleted.", "Deleted");
      loadVehicles();
    } catch (err) {
      toast.error(err.message || "Failed to delete vehicle.", "Error");
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const priceNum = Number(createForm.exShowroomPrice);
      if (!priceNum || priceNum <= 0) {
        toast.error("Valid ex-showroom price is required.", "Validation Error");
        return;
      }

      const payload = {
        make: createForm.make.trim(),
        model: createForm.model.trim(),
        variant: createForm.variant.trim(),
        modelYear: Number(createForm.modelYear),
        bodyType: createForm.bodyType,
        fuelType: createForm.fuelType,
        transmission: createForm.transmission,
        seatingCapacity: Number(createForm.seatingCapacity),
        prices: [
          {
            type: "ex_showroom",
            amount: priceNum,
            currency: "INR",
          },
        ],
        dataSources: [
          {
            provider: createForm.provider.trim(),
            retrievalDate: new Date().toISOString(),
            sourceUrls: ["https://example.com/verified-source"],
            fieldPaths: ["prices.ex_showroom", "specifications"],
          },
        ],
      };

      await catalogClient.adminCreateVehicle(payload);
      toast.success("Vehicle record created successfully as draft.", "Vehicle Created");
      setIsCreateModalOpen(false);
      setCreateForm({
        make: "",
        model: "",
        variant: "",
        modelYear: new Date().getFullYear(),
        bodyType: "suv",
        fuelType: "petrol",
        transmission: "manual",
        seatingCapacity: 5,
        exShowroomPrice: "",
        provider: "Official Manufacturer Brochure",
      });
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
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="forest" size="sm">Admin Portal</Badge>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Catalog Control Room</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
            Vehicle Inventory Management
          </h1>
        </div>

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
                          onClick={() => handleDelete(v.id)}
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

      {/* Create Vehicle Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Vehicle Record"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="c-make"
              name="make"
              label="Make"
              placeholder="e.g. Tata"
              value={createForm.make}
              onChange={(e) => setCreateForm({ ...createForm, make: e.target.value })}
              required
            />
            <Input
              id="c-model"
              name="model"
              label="Model"
              placeholder="e.g. Nexon"
              value={createForm.model}
              onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
              required
            />
            <Input
              id="c-variant"
              name="variant"
              label="Variant"
              placeholder="e.g. XZ+"
              value={createForm.variant}
              onChange={(e) => setCreateForm({ ...createForm, variant: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="c-price"
              name="exShowroomPrice"
              type="number"
              label="Ex-Showroom Price (INR)"
              placeholder="e.g. 850000"
              value={createForm.exShowroomPrice}
              onChange={(e) =>
                setCreateForm({ ...createForm, exShowroomPrice: e.target.value })
              }
              hint="Must be verified and greater than 0."
              required
            />
            <Input
              id="c-provider"
              name="provider"
              label="Data Provenance Provider"
              placeholder="e.g. Manufacturer Technical Specs"
              value={createForm.provider}
              onChange={(e) => setCreateForm({ ...createForm, provider: e.target.value })}
              hint="Traceable source reference required for publication."
              required
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <Button
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
              {isSubmitting ? "Creating..." : "Save Draft Vehicle →"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
