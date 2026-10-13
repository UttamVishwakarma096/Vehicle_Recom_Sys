import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "../router/Router.jsx";
import { useToast } from "../context/useToast.js";
import { aiClient } from "../services/aiClient.js";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { FiCamera, FiZap, FiCheck } from "react-icons/fi";
import { FaCar } from "react-icons/fa6";

// Pre-packaged lightweight sample vehicle images (SVG data URIs converted to JPEG on canvas)
const SAMPLES = [
  {
    name: "Compact SUV",
    make: "Tata",
    model: "Nexon",
    color: "#3B82F6",
    description: "Modern compact SUV with high ground clearance stance",
  },
  {
    name: "Executive Sedan",
    make: "Honda",
    model: "City",
    color: "#6366F1",
    description: "Sleek aerodynamic sedan with low roofline",
  },
  {
    name: "Electric Fastback",
    make: "Tesla",
    model: "Model 3",
    color: "#EF4444",
    description: "Grille-less front fascia with panoramic glass silhouette",
  },
];

/**
 * Resizes an image file or data URI to max 600px dimension and converts to JPEG
 * keeping payload under 45 KiB for fast, reliable upload.
 */
function compressImage(fileOrDataUrl, callback) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const maxDim = 600;
    let width = img.width;
    let height = img.height;

    if (width > height && width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else if (height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Fill white background for transparent PNGs
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const compressed = canvas.toDataURL("image/jpeg", 0.72);
    callback(compressed);
  };

  if (typeof fileOrDataUrl === "string") {
    img.src = fileOrDataUrl;
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(fileOrDataUrl);
  }
}

/**
 * Generates a clean synthetic car test image on canvas for quick trial
 */
function generateSampleCanvas(sample, callback) {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 340;
  const ctx = canvas.getContext("2d");

  // Gradient background
  const bg = ctx.createLinearGradient(0, 0, 500, 340);
  bg.addColorStop(0, "#0F172A");
  bg.addColorStop(1, "#1E293B");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 500, 340);

  // Road
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 240, 500, 100);

  // Car Body Base
  ctx.fillStyle = sample.color;
  ctx.beginPath();
  ctx.roundRect(80, 170, 340, 65, [16, 24, 6, 6]);
  ctx.fill();

  // Cabin
  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.roundRect(140, 115, 210, 60, [28, 28, 4, 4]);
  ctx.fill();

  // Wheels
  ctx.fillStyle = "#0F172A";
  ctx.beginPath();
  ctx.arc(145, 235, 28, 0, Math.PI * 2);
  ctx.arc(355, 235, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#94A3B8";
  ctx.stroke();

  // Vehicle text badge
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${sample.make} ${sample.model}`, 250, 60);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#94A3B8";
  ctx.fillText(sample.description, 250, 85);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  callback(dataUrl);
}

export function AiScannerPage() {
  const toast = useToast();

  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Rate limiter cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const fileInputRef = useRef(null);

  const handleImageSelected = useCallback((dataUrl) => {
    setError(null);
    setResult(null);
    setImagePreview(dataUrl);
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith("image/")) {
        toast.warning("Please upload a valid image file (JPEG, PNG, WEBP).", "Invalid File");
        return;
      }
      compressImage(file, handleImageSelected);
    }
  };

  // Clipboard Paste Support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            compressImage(file, (compressed) => {
              handleImageSelected(compressed);
              toast.info("Image pasted from clipboard!", "Pasted");
            });
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleImageSelected, toast]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      compressImage(file, handleImageSelected);
    }
  };

  const handleSampleClick = (sample) => {
    generateSampleCanvas(sample, handleImageSelected);
  };

  const runAnalysis = async () => {
    if (!imagePreview || cooldown > 0) return;

    try {
      setAnalyzing(true);
      setError(null);

      const response = await aiClient.identifyVehicle({
        image: imagePreview,
        mimeType: "image/jpeg",
      });

      setResult(response);
      toast.success(
        `Identified: ${response.identification.make} ${response.identification.model}!`,
        "Vehicle Identified",
      );
    } catch (err) {
      if (err.status === 429) {
        setCooldown(15);
        setError(err.message || "AI search rate limit reached. A new token refills every 15 seconds.");
        toast.warning(
          "Rate limit reached. 1 token refills every 15 seconds. Please wait a moment.",
          "Rate Limit",
        );
      } else {
        setError(err.message || "Failed to analyze vehicle image with Gemini AI.");
        toast.error(err.message || "Identification failed.", "AI Error");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="py-4">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="forest" size="sm">Gemini 3.8 Flash</Badge>
            <Badge variant="lime" size="sm">Token Bucket: 1 Token / 15s</Badge>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Drag-n-Drop & Clipboard Paste
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
            AI Vehicle Identification
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 max-w-2xl">
            Drop an image or press <kbd className="font-mono bg-slate-200 dark:bg-[#2B2B2B] px-1.5 py-0.5 rounded text-xs">Ctrl+V</kbd> to
            paste a photo. Gemini AI identifies the make, model, year, and body type, then finds matching vehicles in our verified catalog.
          </p>
        </div>

      </div>

      {/* Main Upload Zone */}
      <div className="grid gap-6 lg:grid-cols-12 mb-8">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="p-6">
            <h2 className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] font-display tracking-tight mb-3">
              1. Provide Vehicle Photo
            </h2>

            {/* Dropzone Container */}
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${
                dragActive
                  ? "border-[#D8FF2A] bg-[#D8FF2A]/10 dark:bg-[#D8FF2A]/10 scale-[1.01]"
                  : "border-slate-300 dark:border-white/15 bg-white/50 dark:bg-[#0A0A0A]/40 hover:bg-white/80 dark:hover:bg-[#0A0A0A]/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="w-14 h-14 rounded-2xl bg-[#1F5A3A]/15 dark:bg-[#D8FF2A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] flex items-center justify-center text-2xl mb-3 shadow-inner">
                <FiCamera className="w-7 h-7" />
              </div>

              <strong className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] block font-display">
                Drop your car photo here, or browse
              </strong>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Supports JPEG, PNG, WEBP. You can also press <kbd className="font-mono bg-slate-100 dark:bg-[#2B2B2B] px-1 py-0.5 rounded text-[11px] font-semibold">Ctrl+V</kbd> anywhere
                to paste a copied screenshot!
              </p>
            </div>

            {/* Quick Sample Selector */}
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                Don't have a photo? Try a quick sample vehicle:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => handleSampleClick(s)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white/80 dark:bg-[#2B2B2B]/80 hover:bg-white dark:hover:bg-[#2B2B2B] text-slate-700 dark:text-[#F5F5F5] border border-slate-200/80 dark:border-white/10 shadow-xs cursor-pointer transition-all"
                  >
                    <FaCar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.name} ({s.make} {s.model})</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Preview & Action Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 dark:border-white/10 pb-2.5">
                <h2 className="text-sm font-bold text-[#0A0A0A] dark:text-[#F5F5F5] font-display tracking-tight">
                  2. Photo Preview
                </h2>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200/70 dark:border-white/10 bg-black/5 dark:bg-black/40 flex items-center justify-center max-h-[260px]">
                  <img
                    src={imagePreview}
                    alt="Vehicle preview"
                    className="object-contain max-h-[260px] w-full"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-[#0A0A0A]/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                      <div className="w-12 h-12 rounded-full border-3 border-[#D8FF2A] border-t-transparent animate-spin mb-3" />
                      <span className="text-xs font-bold font-mono tracking-wider text-[#D8FF2A]">
                        SCANNING WITH GEMINI...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center text-slate-400 dark:text-slate-500 text-xs py-16">
                  No image selected yet. Drop or paste an image to preview.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3">
              <Button
                variant="primary"
                size="lg"
                disabled={!imagePreview || analyzing || cooldown > 0}
                onClick={runAnalysis}
                className="w-full justify-center shadow-md shadow-[#D8FF2A]/20"
              >
                {analyzing ? (
                  "Analyzing Visual Features..."
                ) : cooldown > 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <span>Rate Limit: Refilling ({cooldown}s)...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span>Identify Vehicle with Gemini</span>
                    <FiZap className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Error Banner */}
      {error && !analyzing && (
        <Alert title="Identification Error" variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {analyzing && (
        <div className="my-10">
          <LoadingSpinner label="Gemini 3.8 Flash is analyzing vehicle cues & matching catalog..." size="lg" />
        </div>
      )}

      {/* Identification Results Section */}
      {!analyzing && result && result.identification && (
        <div className="flex flex-col gap-6 my-8">
          {/* Main Detected Specs Card */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 border-b border-slate-200/60 dark:border-white/10 pb-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="lime" size="sm">Gemini AI Detection</Badge>
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                    Model: {result.model}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0A0A0A] dark:text-[#F5F5F5] font-display tracking-tight">
                  {result.identification.make} {result.identification.model}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {result.identification.summary}
                </p>
              </div>

              {/* Confidence Gauge */}
              <div className="sm:text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#1F5A3A]/40 dark:border-[#D8FF2A]/30 bg-[#1F5A3A]/15 dark:bg-[#D8FF2A]/15 px-3.5 sm:px-4 py-1.5 text-sm sm:text-base font-extrabold text-[#1F5A3A] dark:text-[#D8FF2A] backdrop-blur-md">
                  <span className="font-mono">{result.identification.confidence}%</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1F5A3A] dark:text-[#D8FF2A]">
                    Confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Specifications Matrix */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#2B2B2B]/60 border border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Body Type
                </span>
                <strong className="text-sm font-display font-bold text-[#0A0A0A] dark:text-[#F5F5F5] capitalize">
                  {result.identification.bodyType}
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#2B2B2B]/60 border border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Generation / Year
                </span>
                <strong className="text-sm font-mono font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">
                  {result.identification.approximateYear || "Contemporary"}
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#2B2B2B]/60 border border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Market Segment
                </span>
                <strong className="text-sm font-display font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">
                  {result.identification.estimatedPriceSegment || "Standard"}
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#2B2B2B]/60 border border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Visual Color
                </span>
                <strong className="text-sm font-display font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">
                  {result.identification.color || "Detected Tone"}
                </strong>
              </div>
            </div>

            {/* Key Visual Features */}
            {result.identification.keyVisualFeatures?.length > 0 && (
              <div className="mb-6 p-4 rounded-xl border border-[#1F5A3A]/30 dark:border-[#D8FF2A]/20 bg-[#1F5A3A]/10 dark:bg-[#2B2B2B]/60 backdrop-blur-sm">
                <strong className="text-xs font-bold uppercase tracking-wide text-[#1F5A3A] dark:text-[#D8FF2A] block mb-2 font-display">
                  Visual Identification Cues
                </strong>
                <ul className="flex flex-wrap gap-2">
                  {result.identification.keyVisualFeatures.map((feat, idx) => (
                    <li
                      key={idx}
                      className="rounded-lg bg-white/80 dark:bg-[#0A0A0A]/80 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-[#F5F5F5] border border-slate-200/60 dark:border-white/10 shadow-xs inline-flex items-center gap-1.5"
                    >
                      <FiCheck className="w-3 h-3 text-[#1F5A3A] dark:text-[#D8FF2A]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations Next Step CTA */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Want to see how this vehicle type compares against your budget and driving habits?
              </span>
              <Link
                to="/recommendations"
                className="w-full sm:w-auto text-center justify-center inline-flex items-center gap-1.5 rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-5 py-2.5 text-xs shadow-md shadow-[#D8FF2A]/20 transition-all"
              >
                <span>Match with Recommendation Engine</span>
                <FiZap className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Catalog Matches Found */}
          <div className="mt-2">
            <h3 className="text-lg font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5] tracking-tight mb-4">
              Matches Found in Verified Catalog ({result.catalogMatches?.length || 0})
            </h3>

            {result.catalogMatches && result.catalogMatches.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.catalogMatches.map((v) => {
                  const price = v.prices?.find((p) => p.type === "ex_showroom");
                  return (
                    <Card key={v.id} className="p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex gap-1.5 mb-2">
                          <Badge variant="forest" size="sm">{v.bodyType}</Badge>
                          <Badge variant="lime" size="sm">{v.fuelType}</Badge>
                        </div>
                        <h4 className="text-base font-bold font-display text-[#0A0A0A] dark:text-[#F5F5F5]">
                          {v.make} {v.model}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {v.variant} • {v.modelYear}
                        </span>

                        <div className="mt-3 p-2.5 rounded-lg bg-slate-50/70 dark:bg-[#2B2B2B]/60 border border-slate-200/60 dark:border-white/10">
                          <span className="text-[10px] text-slate-400 uppercase font-medium block">
                            Ex-Showroom Price
                          </span>
                          <strong className="text-sm font-mono font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">
                            {price ? `₹${Number(price.amount).toLocaleString("en-IN")}` : "N/A"}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
                        <Link
                          to={`/vehicles/${v.id}`}
                          className="rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold px-3 py-1.5 text-xs shadow-xs"
                        >
                          Details →
                        </Link>
                        <Link
                          to={`/compare?ids=${v.id}`}
                          className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#2B2B2B]/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#F5F5F5] shadow-xs hover:bg-white dark:hover:bg-[#2B2B2B]"
                        >
                          + Compare
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No published vehicles in our catalog matched this specific make/model yet.
                You can browse the full catalog to find similar body types.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
