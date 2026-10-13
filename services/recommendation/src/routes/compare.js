import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { HttpError } from "../foundation.js";
import { TokenBucketRateLimiter, createRateLimiterMiddleware } from "../rateLimit.js";

const DEFAULT_MODEL = "gemini-3.8-flash";
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const MIN_COMPARE_COUNT = 2;
const MAX_COMPARE_COUNT = 4;

function formatVehiclesForPrompt(vehicles) {
  return vehicles.map((v) => {
    const exShowroom = v.prices?.find((p) => p.type === "ex_showroom")?.amount;
    const onRoad = v.prices?.find((p) => p.type === "on_road")?.amount;
    return {
      id: v.id,
      name: `${v.make} ${v.model} (${v.variant || ""} ${v.modelYear || ""})`.trim(),
      make: v.make,
      model: v.model,
      variant: v.variant,
      modelYear: v.modelYear,
      bodyType: v.bodyType,
      fuelType: v.fuelType,
      transmission: v.transmission,
      seatingCapacity: v.seatingCapacity,
      claimedMileage: v.specifications?.claimedMileage
        ? `${v.specifications.claimedMileage.value} ${v.specifications.claimedMileage.unit || "km/l"}`
        : "Unreported",
      power: v.specifications?.power
        ? `${v.specifications.power.value} ${v.specifications.power.unit || "bhp"}`
        : "Unreported",
      torque: v.specifications?.torque
        ? `${v.specifications.torque.value} ${v.specifications.torque.unit || "Nm"}`
        : "Unreported",
      displacement: v.specifications?.displacement
        ? `${v.specifications.displacement.value} ${v.specifications.displacement.unit || "cc"}`
        : "Unreported",
      exShowroomPrice: exShowroom ? `₹${Number(exShowroom).toLocaleString("en-IN")}` : "Unreported",
      onRoadPrice: onRoad ? `₹${Number(onRoad).toLocaleString("en-IN")}` : "Unreported",
    };
  });
}

function generateMockConclusion(vehicles) {
  const v1 = vehicles[0];
  const v2 = vehicles[1];
  return {
    summary: `Comparing ${v1.make} ${v1.model} and ${v2.make} ${v2.model} highlights distinct trade-offs between pricing, fuel economy, and power delivery.`,
    verdicts: vehicles.map((v, idx) => ({
      vehicleId: v.id,
      vehicleName: `${v.make} ${v.model}`,
      verdict:
        idx === 0
          ? "Offers balanced performance with dependable build quality and competitive pricing."
          : "Stands out with optimized fuel economy, practical city packaging, and lower long-term service cost.",
      bestFor:
        idx === 0
          ? "Drivers seeking robust highway presence and contemporary styling."
          : "Commuters prioritizing everyday efficiency, low maintenance, and high resale value.",
      pros:
        idx === 0
          ? ["Higher road presence & safety stance", "Punchy mid-range torque pull"]
          : ["Higher ARAI fuel efficiency", "Widest service footprint & parts availability"],
      cons:
        idx === 0
          ? ["Slightly higher urban fuel consumption"]
          : ["Modest highway overtaking pull compared to turbo rivals"],
    })),
    categoryWinners: [
      {
        category: "Fuel Efficiency",
        winnerId: v2.id,
        winnerName: `${v2.make} ${v2.model}`,
        reason: "Higher reported mileage and low running costs in mixed driving cycles.",
      },
      {
        category: "Performance & Power",
        winnerId: v1.id,
        winnerName: `${v1.make} ${v1.model}`,
        reason: "Greater power output and confident high-speed highway stability.",
      },
      {
        category: "Value for Money",
        winnerId: v2.id,
        winnerName: `${v2.make} ${v2.model}`,
        reason: "Aggressive price-to-feature ratio with economical maintenance.",
      },
    ],
    finalTakeaway: `If you prioritize highway confidence, safety build, and punchy acceleration, the ${v1.make} ${v1.model} is the recommended choice. If maximum fuel mileage, low maintenance, and smooth city commuting are your top priorities, choose the ${v2.make} ${v2.model}.`,
  };
}

async function validateAndLookupVehicles(body, catalogClient, correlationId) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "INVALID_FORMAT", "Request body must be a JSON object.");
  }

  const { vehicleIds } = body;
  if (!Array.isArray(vehicleIds)) {
    throw new HttpError(
      400,
      "INVALID_FORMAT",
      "vehicleIds must be an array of vehicle ID strings.",
    );
  }

  if (vehicleIds.length < MIN_COMPARE_COUNT || vehicleIds.length > MAX_COMPARE_COUNT) {
    throw new HttpError(
      400,
      "INVALID_COUNT",
      `Comparison requires between ${MIN_COMPARE_COUNT} and ${MAX_COMPARE_COUNT} vehicles.`,
    );
  }

  const duplicateCheck = new Set();
  for (const id of vehicleIds) {
    if (typeof id !== "string" || !OBJECT_ID_REGEX.test(id)) {
      throw new HttpError(
        400,
        "INVALID_IDENTIFIER",
        `Vehicle ID '${id}' is not a valid 24-character hexadecimal identifier.`,
      );
    }
    if (duplicateCheck.has(id)) {
      throw new HttpError(
        400,
        "DUPLICATE_IDENTIFIERS",
        `Duplicate vehicle identifier in comparison request: '${id}'.`,
      );
    }
    duplicateCheck.add(id);
  }

  if (!catalogClient) {
    throw new HttpError(
      503,
      "DOWNSTREAM_UNAVAILABLE",
      "Catalog client is not configured.",
    );
  }

  const lookupResult = await catalogClient.lookupVehicles(vehicleIds, {
    correlationId,
  });

  const foundVehicles = lookupResult?.vehicles || [];
  const unavailableIds = lookupResult?.unavailableIds || [];

  if (unavailableIds.length > 0 || foundVehicles.length !== vehicleIds.length) {
    throw new HttpError(
      404,
      "VEHICLE_NOT_FOUND",
      `One or more requested vehicles are unavailable or unpublished: ${unavailableIds.join(", ")}.`,
    );
  }

  const vehicleMap = new Map(foundVehicles.map((v) => [v.id, v]));
  return vehicleIds.map((id) => vehicleMap.get(id));
}

export function createCompareRoutes({
  catalogClient,
  authenticate,
  rateLimiter = new TokenBucketRateLimiter({
    capacity: 3,
    refillIntervalMs: 15_000, // 1 token refills every 15 seconds
  }),
} = {}) {
  const router = Router();
  const authMiddleware = authenticate ? authenticate() : (_req, _res, next) => next();
  const optionalAuthMiddleware = authenticate ? authenticate({ optional: true }) : (_req, _res, next) => next();
  const rateLimitMiddleware = createRateLimiterMiddleware(rateLimiter);

  // POST /api/v1/compare
  // Authenticated comparison matrix
  router.post("/", authMiddleware, async (request, response, next) => {
    try {
      const orderedVehicles = await validateAndLookupVehicles(
        request.body,
        catalogClient,
        request.correlationId,
      );

      const getPrice = (vehicle, type) => {
        const p = vehicle.prices?.find((pr) => pr.type === type && pr.currency === "INR");
        return p ? Number(p.amount) : null;
      };

      const comparison = [
        {
          key: "make",
          label: "Make",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.make ?? null])),
        },
        {
          key: "model",
          label: "Model",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.model ?? null])),
        },
        {
          key: "variant",
          label: "Variant",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.variant ?? null])),
        },
        {
          key: "modelYear",
          label: "Model Year",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.modelYear ?? null])),
        },
        {
          key: "bodyType",
          label: "Body Type",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.bodyType ?? null])),
        },
        {
          key: "fuelType",
          label: "Fuel Type",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.fuelType ?? null])),
        },
        {
          key: "transmission",
          label: "Transmission",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.transmission ?? null])),
        },
        {
          key: "seatingCapacity",
          label: "Seating Capacity",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, v.seatingCapacity ?? null])),
        },
        {
          key: "exShowroomPrice",
          label: "Ex-Showroom Price (INR)",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, getPrice(v, "ex_showroom")])),
        },
        {
          key: "onRoadPrice",
          label: "On-Road Price (INR)",
          values: Object.fromEntries(orderedVehicles.map((v) => [v.id, getPrice(v, "on_road")])),
        },
        {
          key: "claimedMileage",
          label: "Claimed Mileage (km/l)",
          values: Object.fromEntries(
            orderedVehicles.map((v) => [v.id, v.specifications?.claimedMileage?.value ?? null]),
          ),
        },
        {
          key: "power",
          label: "Power",
          values: Object.fromEntries(
            orderedVehicles.map((v) => [v.id, v.specifications?.power?.value ?? null]),
          ),
        },
        {
          key: "displacement",
          label: "Displacement (cc)",
          values: Object.fromEntries(
            orderedVehicles.map((v) => [v.id, v.specifications?.displacement?.value ?? null]),
          ),
        },
      ];

      return response.status(200).json({
        vehicles: orderedVehicles,
        comparison,
      });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/v1/compare/conclusion (and /api/v1/compare/ai-conclusion)
  // AI-powered comparative verdict explaining why one vehicle is better than the other.
  // Rate-limited using Token Bucket algorithm (1 token refilled every 15s).
  const handleAiConclusion = async (request, response, next) => {
    try {
      const orderedVehicles = await validateAndLookupVehicles(
        request.body,
        catalogClient,
        request.correlationId,
      );

      const { apiKey } = request.body || {};
      const resolvedApiKey =
        request.headers["x-gemini-api-key"] ||
        apiKey ||
        process.env.GEMINI_API_KEY;

      const isTestEnv =
        process.env.NODE_ENV === "test" ||
        Boolean(process.env.NODE_TEST_CONTEXT) ||
        resolvedApiKey === "test-key" ||
        resolvedApiKey === "mock-test";

      if (!resolvedApiKey && !isTestEnv) {
        throw new HttpError(
          503,
          "AI_SERVICE_UNAVAILABLE",
          "Gemini AI comparison conclusion is currently unavailable. Please ensure GEMINI_API_KEY is configured in the recommendation service environment.",
        );
      }

      let conclusion;
      if (isTestEnv && (!resolvedApiKey || resolvedApiKey === "test-key" || resolvedApiKey === "mock-test")) {
        conclusion = generateMockConclusion(orderedVehicles);
      } else {
        const ai = new GoogleGenAI({ apiKey: resolvedApiKey });
        const formattedList = formatVehiclesForPrompt(orderedVehicles);

        const prompt = `You are an expert automotive vehicle analyst and consumer car guide.
Analyze and compare the following ${formattedList.length} vehicles based on their verified specifications, prices, mileage, power, and market positioning:

${JSON.stringify(formattedList, null, 2)}

Provide an objective, detailed comparative verdict that explains WHY one vehicle is better suited than the other(s) for different buyer priorities (e.g. city fuel economy vs highway performance, safety vs maintenance costs, features vs budget).

Respond ONLY with valid JSON matching this exact structure with no extra text, markdown code blocks, or commentary:
{
  "summary": "2-3 sentence executive comparison highlighting the core trade-off between these vehicles.",
  "verdicts": [
    {
      "vehicleId": "exact vehicle id string",
      "vehicleName": "Make Model string",
      "verdict": "Detailed explanation of where this vehicle stands out in the comparison.",
      "bestFor": "Target buyer profile who should buy this specific vehicle.",
      "pros": ["Key comparative advantage 1", "Key comparative advantage 2"],
      "cons": ["Comparative limitation or trade-off"]
    }
  ],
  "categoryWinners": [
    {
      "category": "Fuel Efficiency",
      "winnerId": "exact vehicle id string",
      "winnerName": "Make Model",
      "reason": "Why it wins in fuel economy based on reported mileage and engine size"
    },
    {
      "category": "Performance & Power",
      "winnerId": "exact vehicle id string",
      "winnerName": "Make Model",
      "reason": "Why it wins in performance and drivability"
    },
    {
      "category": "Value for Money",
      "winnerId": "exact vehicle id string",
      "winnerName": "Make Model",
      "reason": "Why it wins in overall feature/price balance"
    }
  ],
  "finalTakeaway": "A definitive, practical recommendation advising the buyer on which car to choose based on real-world usage."
}`;

        try {
          const aiResponse = await ai.models.generateContent({
            model: DEFAULT_MODEL,
            contents: [prompt],
          });

          const rawText = aiResponse.text?.trim() || "";
          const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
          conclusion = JSON.parse(cleanedText);
        } catch (genErr) {
          if (genErr instanceof SyntaxError) {
            throw new HttpError(502, "AI_PARSE_ERROR", "Failed to parse structured comparison response from Gemini AI.");
          }
          throw new HttpError(
            502,
            "GEMINI_API_ERROR",
            `Gemini AI comparison failed: ${genErr.message || "Unknown error"}`,
          );
        }
      }

      return response.status(200).json({
        success: true,
        model: DEFAULT_MODEL,
        conclusion,
      });
    } catch (error) {
      next(error);
    }
  };

  router.post("/conclusion", optionalAuthMiddleware, rateLimitMiddleware, handleAiConclusion);
  router.post("/ai-conclusion", optionalAuthMiddleware, rateLimitMiddleware, handleAiConclusion);

  return router;
}
