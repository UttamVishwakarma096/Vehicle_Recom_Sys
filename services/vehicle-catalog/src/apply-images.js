import dns from "node:dns";
import mongoose from "mongoose";
import { registerModels } from "./models.js";

try {
  const defaultServers = dns.getServers();
  if (defaultServers.length === 1 && defaultServers[0] === "127.0.0.1") {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
} catch {
  // best effort DNS
}

const DATABASE_NAME = "vehicle_catalog";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://uttamvishwakarma096_db_user:xhjwZQPxbGdhvabe@cluster0.xpzrna4.mongodb.net/vehicle_catalog?retryWrites=true&w=majority";

export const IMAGE_MAP = [
  {
    make: "Tata",
    model: "Nexon",
    variant: "Fearless Plus S",
    imageUrl:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Tata",
    model: "Nexon EV",
    variant: "Empowered Plus LR",
    imageUrl:
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Hyundai",
    model: "Creta",
    variant: "SX (O) Turbo DCT",
    imageUrl:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Hyundai",
    model: "Creta",
    variant: "SX (O) CRDi Diesel",
    imageUrl:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Maruti Suzuki",
    model: "Brezza",
    variant: "ZXi Plus",
    imageUrl:
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Maruti Suzuki",
    model: "Brezza",
    variant: "ZXi S-CNG",
    imageUrl:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Maruti Suzuki",
    model: "Swift",
    variant: "ZXi Plus Dual Tone",
    imageUrl:
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Tata",
    model: "Tiago EV",
    variant: "XZ Plus Tech LUX",
    imageUrl:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Hyundai",
    model: "i20",
    variant: "Asta (O) IVT",
    imageUrl:
      "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Honda",
    model: "City",
    variant: "ZX CVT",
    imageUrl:
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Honda",
    model: "City e:HEV",
    variant: "ZX Hybrid",
    imageUrl:
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Hyundai",
    model: "Verna",
    variant: "SX (O) 1.5 Turbo DCT",
    imageUrl:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Mahindra",
    model: "XUV700",
    variant: "AX7 Luxury Diesel AT AWD",
    imageUrl:
      "https://images.unsplash.com/photo-1534093607318-f025413f49cb?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Mahindra",
    model: "Scorpio-N",
    variant: "Z8 L Diesel 4WD AT",
    imageUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Toyota",
    model: "Innova Hycross",
    variant: "ZX (O) Strong Hybrid",
    imageUrl:
      "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Maruti Suzuki",
    model: "Ertiga",
    variant: "ZXi AT",
    imageUrl:
      "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Kia",
    model: "Seltos",
    variant: "GTX Plus Turbo DCT",
    imageUrl:
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Tata",
    model: "Harrier",
    variant: "Fearless Plus Dark AT",
    imageUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "MG",
    model: "ZS EV",
    variant: "Exclusive Plus",
    imageUrl:
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Toyota",
    model: "Fortuner",
    variant: "4X4 AT Diesel",
    imageUrl:
      "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
  },
  {
    make: "Tesla",
    model: "Model 3",
    variant: "Rear-Wheel Drive",
    imageUrl:
      "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto:best/Essentials_3Y_Image",
  },
  {
    make: "Mahindra",
    model: "Thar",
    variant: "LX Hard Top Diesel AT",
    imageUrl:
      "https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd?auto=format&fit=crop&w=800&q=80",
  },
];

async function run() {
  console.log("Connecting to MongoDB Atlas vehicle_catalog database...");
  const conn = await mongoose
    .createConnection(MONGODB_URI, { dbName: DATABASE_NAME })
    .asPromise();
  const { Vehicle } = registerModels(conn);

  let updatedCount = 0;
  for (const item of IMAGE_MAP) {
    const filter = {
      make: item.make,
      model: item.model,
      variant: item.variant,
    };
    const update = {
      $set: {
        imageUrl: item.imageUrl,
        images: [item.imageUrl],
      },
    };
    const res = await Vehicle.updateMany(filter, update);

    if (res.matchedCount > 0) {
      updatedCount += res.matchedCount;
      console.log(
        `Matched & Updated: ${item.make} ${item.model} (${item.variant}) -> ${res.matchedCount} doc(s)`,
      );
    } else {
      console.warn(
        `WARNING: No vehicle matched for: ${item.make} ${item.model} (${item.variant})`,
      );
    }
  }

  console.log(
    `\nOperation finished. Total documents matched/updated: ${updatedCount}`,
  );
  await conn.close();
}

if (process.argv[1] && process.argv[1].endsWith("apply-images.js")) {
  run().catch((err) => {
    console.error("Failed to update vehicle images:", err);
    process.exit(1);
  });
}
