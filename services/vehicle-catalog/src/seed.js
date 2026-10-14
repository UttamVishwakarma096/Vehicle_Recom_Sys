import dns from "node:dns";
import mongoose from "mongoose";
import { registerModels } from "./models.js";
import {
  validateVehiclePayload,
  validatePublicationPreconditions,
} from "./vehicles/validation.js";

try {
  const defaultServers = dns.getServers();
  if (defaultServers.length === 1 && defaultServers[0] === "127.0.0.1") {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
} catch {
  // Best effort DNS fallback
}

const DATABASE_NAME = "vehicle_catalog";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://uttamvishwakarma096_db_user:xhjwZQPxbGdhvabe@cluster0.xpzrna4.mongodb.net/vehicle_catalog?retryWrites=true&w=majority";

export const VEHICLE_SEEDS = [
  {
    make: "Tata",
    model: "Nexon",
    variant: "Fearless Plus S",
    imageUrl:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "petrol",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1199, cylinders: 3, verified: true },
      power: { value: 120, unit: "hp", verified: true },
      torque: { value: 170, unit: "Nm", verified: true },
      claimedMileage: { value: 17.44, unit: "km/l", verified: true },
      groundClearance: { value: 208, unit: "mm", verified: true },
      bootSpace: { value: 382, unit: "litres", verified: true },
      fuelTankCapacity: { value: 44, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1420000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1635000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Tata Motors Official Technical Specification Sheet",
        sourceUrl: "https://www.tatamotors.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Tata",
    model: "Nexon EV",
    variant: "Empowered Plus LR",
    imageUrl:
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "electric",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      batteryCapacity: { value: 40.5, unit: "kWh", verified: true },
      power: { value: 143, unit: "hp", verified: true },
      torque: { value: 215, unit: "Nm", verified: true },
      claimedRange: { value: 465, unit: "km", verified: true },
      groundClearance: { value: 190, unit: "mm", verified: true },
      bootSpace: { value: 350, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1699000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1795000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Tata Passenger Electric Mobility Technical Catalogue",
        sourceUrl: "https://ev.tatamotors.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Hyundai",
    model: "Creta",
    variant: "SX (O) Turbo DCT",
    imageUrl:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "petrol",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1482, cylinders: 4, verified: true },
      power: { value: 160, unit: "hp", verified: true },
      torque: { value: 253, unit: "Nm", verified: true },
      claimedMileage: { value: 18.4, unit: "km/l", verified: true },
      groundClearance: { value: 190, unit: "mm", verified: true },
      bootSpace: { value: 433, unit: "litres", verified: true },
      fuelTankCapacity: { value: 50, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2015000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2350000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Hyundai Motor India Official Specification Brochure",
        sourceUrl: "https://www.hyundai.com/in",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Hyundai",
    model: "Creta",
    variant: "SX (O) CRDi Diesel",
    imageUrl:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1493, cylinders: 4, verified: true },
      power: { value: 116, unit: "hp", verified: true },
      torque: { value: 250, unit: "Nm", verified: true },
      claimedMileage: { value: 19.1, unit: "km/l", verified: true },
      groundClearance: { value: 190, unit: "mm", verified: true },
      bootSpace: { value: 433, unit: "litres", verified: true },
      fuelTankCapacity: { value: 50, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2000000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2330000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Hyundai Motor India Official Specification Brochure",
        sourceUrl: "https://www.hyundai.com/in",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Maruti Suzuki",
    model: "Brezza",
    variant: "ZXi Plus",
    imageUrl:
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "petrol",
    transmission: "manual",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1462, cylinders: 4, verified: true },
      power: { value: 103, unit: "hp", verified: true },
      torque: { value: 137, unit: "Nm", verified: true },
      claimedMileage: { value: 19.89, unit: "km/l", verified: true },
      groundClearance: { value: 198, unit: "mm", verified: true },
      bootSpace: { value: 328, unit: "litres", verified: true },
      fuelTankCapacity: { value: 48, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1258000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1450000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Maruti Suzuki Arena Official Product Catalogue",
        sourceUrl: "https://www.marutisuzuki.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Maruti Suzuki",
    model: "Brezza",
    variant: "ZXi S-CNG",
    imageUrl:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "cng",
    transmission: "manual",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1462, cylinders: 4, verified: true },
      power: { value: 88, unit: "hp", verified: true },
      torque: { value: 121, unit: "Nm", verified: true },
      claimedMileage: { value: 25.51, unit: "km/l", verified: true },
      groundClearance: { value: 198, unit: "mm", verified: true },
      bootSpace: { value: 328, unit: "litres", verified: true },
      fuelTankCapacity: { value: 55, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1210000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1375000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Maruti Suzuki Arena S-CNG Homologation Sheet",
        sourceUrl: "https://www.marutisuzuki.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Maruti Suzuki",
    model: "Swift",
    variant: "ZXi Plus Dual Tone",
    imageUrl:
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "hatchback",
    fuelType: "petrol",
    transmission: "manual",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1197, cylinders: 3, verified: true },
      power: { value: 82, unit: "hp", verified: true },
      torque: { value: 112, unit: "Nm", verified: true },
      claimedMileage: { value: 24.8, unit: "km/l", verified: true },
      groundClearance: { value: 163, unit: "mm", verified: true },
      bootSpace: { value: 265, unit: "litres", verified: true },
      fuelTankCapacity: { value: 37, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 914000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1045000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Maruti Suzuki Arena Official Product Catalogue",
        sourceUrl: "https://www.marutisuzuki.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Tata",
    model: "Tiago EV",
    variant: "XZ Plus Tech LUX",
    imageUrl:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "hatchback",
    fuelType: "electric",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      batteryCapacity: { value: 24.0, unit: "kWh", verified: true },
      power: { value: 74, unit: "hp", verified: true },
      torque: { value: 114, unit: "Nm", verified: true },
      claimedRange: { value: 315, unit: "km", verified: true },
      groundClearance: { value: 165, unit: "mm", verified: true },
      bootSpace: { value: 240, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1189000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1250000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Tata Passenger Electric Mobility Technical Catalogue",
        sourceUrl: "https://ev.tatamotors.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Hyundai",
    model: "i20",
    variant: "Asta (O) IVT",
    imageUrl:
      "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "hatchback",
    fuelType: "petrol",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1197, cylinders: 4, verified: true },
      power: { value: 88, unit: "hp", verified: true },
      torque: { value: 115, unit: "Nm", verified: true },
      claimedMileage: { value: 20.0, unit: "km/l", verified: true },
      groundClearance: { value: 170, unit: "mm", verified: true },
      bootSpace: { value: 311, unit: "litres", verified: true },
      fuelTankCapacity: { value: 37, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1121000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1295000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Hyundai Motor India Official Specification Brochure",
        sourceUrl: "https://www.hyundai.com/in",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Honda",
    model: "City",
    variant: "ZX CVT",
    imageUrl:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "sedan",
    fuelType: "petrol",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1498, cylinders: 4, verified: true },
      power: { value: 121, unit: "hp", verified: true },
      torque: { value: 145, unit: "Nm", verified: true },
      claimedMileage: { value: 18.4, unit: "km/l", verified: true },
      groundClearance: { value: 165, unit: "mm", verified: true },
      bootSpace: { value: 506, unit: "litres", verified: true },
      fuelTankCapacity: { value: 40, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1635000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1910000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Honda Cars India Official Specification Brochure",
        sourceUrl: "https://www.hondacarindia.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Honda",
    model: "City e:HEV",
    variant: "ZX Hybrid",
    imageUrl:
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "sedan",
    fuelType: "hybrid",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1498, cylinders: 4, verified: true },
      power: { value: 126, unit: "hp", verified: true },
      torque: { value: 253, unit: "Nm", verified: true },
      claimedMileage: { value: 27.13, unit: "km/l", verified: true },
      groundClearance: { value: 165, unit: "mm", verified: true },
      bootSpace: { value: 410, unit: "litres", verified: true },
      fuelTankCapacity: { value: 40, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2055000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2380000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Honda Cars India Hybrid Homologation Certificate",
        sourceUrl: "https://www.hondacarindia.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Hyundai",
    model: "Verna",
    variant: "SX (O) 1.5 Turbo DCT",
    imageUrl:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "sedan",
    fuelType: "petrol",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1482, cylinders: 4, verified: true },
      power: { value: 160, unit: "hp", verified: true },
      torque: { value: 253, unit: "Nm", verified: true },
      claimedMileage: { value: 20.6, unit: "km/l", verified: true },
      groundClearance: { value: 170, unit: "mm", verified: true },
      bootSpace: { value: 528, unit: "litres", verified: true },
      fuelTankCapacity: { value: 45, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1742000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2010000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Hyundai Motor India Official Specification Brochure",
        sourceUrl: "https://www.hyundai.com/in",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Mahindra",
    model: "XUV700",
    variant: "AX7 Luxury Diesel AT AWD",
    imageUrl:
      "https://images.unsplash.com/photo-1534093607318-f025413f49cb?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 7,
    specifications: {
      engine: { displacementCc: 2198, cylinders: 4, verified: true },
      power: { value: 185, unit: "hp", verified: true },
      torque: { value: 450, unit: "Nm", verified: true },
      claimedMileage: { value: 16.57, unit: "km/l", verified: true },
      groundClearance: { value: 200, unit: "mm", verified: true },
      bootSpace: { value: 450, unit: "litres", verified: true },
      fuelTankCapacity: { value: 60, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2699000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 3180000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Mahindra & Mahindra Official Technical Brochure",
        sourceUrl: "https://auto.mahindra.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Mahindra",
    model: "Scorpio-N",
    variant: "Z8 L Diesel 4WD AT",
    imageUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 7,
    specifications: {
      engine: { displacementCc: 2198, cylinders: 4, verified: true },
      power: { value: 175, unit: "hp", verified: true },
      torque: { value: 400, unit: "Nm", verified: true },
      claimedMileage: { value: 15.0, unit: "km/l", verified: true },
      groundClearance: { value: 187, unit: "mm", verified: true },
      bootSpace: { value: 460, unit: "litres", verified: true },
      fuelTankCapacity: { value: 57, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2454000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2890000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Mahindra & Mahindra Official Technical Brochure",
        sourceUrl: "https://auto.mahindra.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Toyota",
    model: "Innova Hycross",
    variant: "ZX (O) Strong Hybrid",
    imageUrl:
      "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "muv",
    fuelType: "hybrid",
    transmission: "automatic",
    seatingCapacity: 7,
    specifications: {
      engine: { displacementCc: 1987, cylinders: 4, verified: true },
      power: { value: 186, unit: "hp", verified: true },
      torque: { value: 206, unit: "Nm", verified: true },
      claimedMileage: { value: 23.24, unit: "km/l", verified: true },
      groundClearance: { value: 185, unit: "mm", verified: true },
      bootSpace: { value: 300, unit: "litres", verified: true },
      fuelTankCapacity: { value: 52, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 3098000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 3620000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Toyota Kirloskar Motor Official Product Catalogue",
        sourceUrl: "https://www.toyotabharat.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Maruti Suzuki",
    model: "Ertiga",
    variant: "ZXi AT",
    imageUrl:
      "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "muv",
    fuelType: "petrol",
    transmission: "automatic",
    seatingCapacity: 7,
    specifications: {
      engine: { displacementCc: 1462, cylinders: 4, verified: true },
      power: { value: 103, unit: "hp", verified: true },
      torque: { value: 137, unit: "Nm", verified: true },
      claimedMileage: { value: 20.3, unit: "km/l", verified: true },
      groundClearance: { value: 180, unit: "mm", verified: true },
      bootSpace: { value: 209, unit: "litres", verified: true },
      fuelTankCapacity: { value: 45, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1123000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 1310000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Maruti Suzuki Arena Official Product Catalogue",
        sourceUrl: "https://www.marutisuzuki.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Kia",
    model: "Seltos",
    variant: "GTX Plus Turbo DCT",
    imageUrl:
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "petrol",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1482, cylinders: 4, verified: true },
      power: { value: 160, unit: "hp", verified: true },
      torque: { value: 253, unit: "Nm", verified: true },
      claimedMileage: { value: 17.7, unit: "km/l", verified: true },
      groundClearance: { value: 190, unit: "mm", verified: true },
      bootSpace: { value: 433, unit: "litres", verified: true },
      fuelTankCapacity: { value: 50, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2035000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2370000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Kia India Official Specification Guide",
        sourceUrl: "https://www.kia.com/in",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Tata",
    model: "Harrier",
    variant: "Fearless Plus Dark AT",
    imageUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      engine: { displacementCc: 1956, cylinders: 4, verified: true },
      power: { value: 170, unit: "hp", verified: true },
      torque: { value: 350, unit: "Nm", verified: true },
      claimedMileage: { value: 16.8, unit: "km/l", verified: true },
      groundClearance: { value: 205, unit: "mm", verified: true },
      bootSpace: { value: 445, unit: "litres", verified: true },
      fuelTankCapacity: { value: 50, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2589000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 3050000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Tata Motors Official Technical Specification Sheet",
        sourceUrl: "https://www.tatamotors.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "MG",
    model: "ZS EV",
    variant: "Exclusive Plus",
    imageUrl:
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "electric",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      batteryCapacity: { value: 50.3, unit: "kWh", verified: true },
      power: { value: 176, unit: "hp", verified: true },
      torque: { value: 280, unit: "Nm", verified: true },
      claimedRange: { value: 461, unit: "km", verified: true },
      groundClearance: { value: 177, unit: "mm", verified: true },
      bootSpace: { value: 470, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 2444000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2590000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "MG Motor India Official Technical Specification Sheet",
        sourceUrl: "https://www.mgmotor.co.in",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Toyota",
    model: "Fortuner",
    variant: "4X4 AT Diesel",
    imageUrl:
      "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 7,
    specifications: {
      engine: { displacementCc: 2755, cylinders: 4, verified: true },
      power: { value: 204, unit: "hp", verified: true },
      torque: { value: 500, unit: "Nm", verified: true },
      claimedMileage: { value: 14.4, unit: "km/l", verified: true },
      groundClearance: { value: 225, unit: "mm", verified: true },
      bootSpace: { value: 296, unit: "litres", verified: true },
      fuelTankCapacity: { value: 80, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 4232000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 5010000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Toyota Kirloskar Motor Official Product Catalogue",
        sourceUrl: "https://www.toyotabharat.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Tesla",
    model: "Model 3",
    variant: "Rear-Wheel Drive",
    imageUrl:
      "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto:best/Essentials_3Y_Image",
    modelYear: 2024,
    bodyType: "sedan",
    fuelType: "electric",
    transmission: "automatic",
    seatingCapacity: 5,
    specifications: {
      power: { value: 283, unit: "hp", verified: true },
      torque: { value: 420, unit: "Nm", verified: true },
      claimedRange: { value: 513, unit: "km", verified: true },
      groundClearance: { value: 140, unit: "mm", verified: true },
      bootSpace: { value: 594, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 4500000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 4750000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Tesla Official Technical Specification Sheet",
        sourceUrl: "https://www.tesla.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
  {
    make: "Mahindra",
    model: "Thar",
    variant: "LX Hard Top Diesel AT",
    imageUrl:
      "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?auto=format&fit=crop&w=800&q=80",
    modelYear: 2024,
    bodyType: "suv",
    fuelType: "diesel",
    transmission: "automatic",
    seatingCapacity: 4,
    specifications: {
      engine: { displacementCc: 2184, cylinders: 4, verified: true },
      power: { value: 130, unit: "hp", verified: true },
      torque: { value: 300, unit: "Nm", verified: true },
      claimedMileage: { value: 15.2, unit: "km/l", verified: true },
      groundClearance: { value: 226, unit: "mm", verified: true },
      bootSpace: { value: 220, unit: "litres", verified: true },
      fuelTankCapacity: { value: 57, unit: "litres", verified: true },
    },
    prices: [
      {
        type: "ex_showroom",
        amount: 1760000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
      {
        type: "on_road",
        amount: 2070000,
        currency: "INR",
        effectiveAt: new Date("2024-01-01T00:00:00Z"),
        verifiedAt: new Date("2026-01-15T00:00:00Z"),
      },
    ],
    dataSources: [
      {
        provider: "Mahindra & Mahindra Official Technical Brochure",
        sourceUrl: "https://auto.mahindra.com",
        retrievedAt: new Date("2026-01-15T00:00:00Z"),
        fieldPaths: ["specifications", "prices.ex_showroom"],
      },
    ],
    status: "published",
    createdBy: "system_seed_admin",
    verifiedBy: "lead_catalog_auditor",
    verifiedAt: new Date("2026-01-15T00:00:00Z"),
  },
];

export async function seedCatalog({ uri = MONGODB_URI } = {}) {
  console.log(`Connecting to database '${DATABASE_NAME}'...`);
  const connection = await mongoose
    .createConnection(uri, {
      dbName: DATABASE_NAME,
      serverSelectionTimeoutMS: 8000,
      autoIndex: false,
    })
    .asPromise();

  const { Vehicle } = registerModels(connection);
  await Vehicle.createIndexes();

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of VEHICLE_SEEDS) {
    const { createdBy, verifiedBy, verifiedAt, ...clientPayload } = item;

    // 1. Validation check on client fields
    const fieldErrors = validateVehiclePayload(clientPayload);
    if (fieldErrors.length > 0) {
      console.error(
        `Validation error for ${item.make} ${item.model} (${item.variant}):`,
        fieldErrors,
      );
      continue;
    }

    const pubErrors = validatePublicationPreconditions(item);
    if (!pubErrors.valid) {
      console.error(
        `Publication precondition failed for ${item.make} ${item.model}:`,
        pubErrors.errors,
      );
      continue;
    }

    // 2. Format prices Decimal128
    const preparedPrices = item.prices.map((p) => ({
      ...p,
      amount: mongoose.Types.Decimal128.fromString(p.amount.toString()),
    }));

    const query = {
      make: item.make,
      model: item.model,
      variant: item.variant,
      modelYear: item.modelYear,
    };

    const existing = await Vehicle.findOne(query);

    if (existing) {
      existing.imageUrl = item.imageUrl;
      existing.images = item.images || (item.imageUrl ? [item.imageUrl] : []);
      existing.bodyType = item.bodyType;
      existing.fuelType = item.fuelType;
      existing.transmission = item.transmission;
      existing.seatingCapacity = item.seatingCapacity;
      existing.specifications = item.specifications;
      existing.prices = preparedPrices;
      existing.dataSources = item.dataSources;
      existing.status = item.status;
      existing.verifiedAt = verifiedAt || new Date("2026-01-15T00:00:00Z");
      existing.verifiedBy = verifiedBy || "lead_catalog_auditor";
      existing.updatedBy = "system_seed_admin";
      await existing.save();
      updatedCount += 1;
      console.log(`  ✓ Updated: ${item.make} ${item.model} [${item.variant}]`);
    } else {
      const doc = new Vehicle({
        ...clientPayload,
        images: item.images || (item.imageUrl ? [item.imageUrl] : []),
        prices: preparedPrices,
        createdBy: createdBy || "system_seed_admin",
        verifiedBy: verifiedBy || "lead_catalog_auditor",
        verifiedAt: verifiedAt || new Date("2026-01-15T00:00:00Z"),
      });
      await doc.save();
      insertedCount += 1;
      console.log(`  + Inserted: ${item.make} ${item.model} [${item.variant}]`);
    }
  }

  const totalInDb = await Vehicle.countDocuments();
  const publishedInDb = await Vehicle.countDocuments({ status: "published" });

  console.log("\n==========================================");
  console.log(`Seed Summary:`);
  console.log(`  Newly Inserted: ${insertedCount}`);
  console.log(`  Updated:        ${updatedCount}`);
  console.log(`  Total in DB:    ${totalInDb}`);
  console.log(`  Published:      ${publishedInDb}`);
  console.log("==========================================\n");

  await connection.close();
  return { insertedCount, updatedCount, totalInDb, publishedInDb };
}

// Self-run when invoked directly via node
if (process.argv[1]?.endsWith("seed.js")) {
  seedCatalog()
    .then(() => {
      console.log("Catalog seeding completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
