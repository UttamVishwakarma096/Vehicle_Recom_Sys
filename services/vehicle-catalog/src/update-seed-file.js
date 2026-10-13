import fs from "node:fs";
import { IMAGE_MAP } from "./apply-images.js";

const seedPath = new URL("./seed.js", import.meta.url).pathname.replace(
  /^\/([a-zA-Z]:)/,
  "$1",
);
let content = fs.readFileSync(seedPath, "utf8");

let count = 0;
for (const item of IMAGE_MAP) {
  // Look for make, model, variant
  const searchNeedle = `make: "${item.make}",\n    model: "${item.model}",\n    variant: "${item.variant}",`;
  if (content.includes(searchNeedle)) {
    // Check if imageUrl is already present
    const replacement = `${searchNeedle}\n    imageUrl: "${item.imageUrl}",`;
    if (!content.includes(replacement)) {
      content = content.replace(searchNeedle, replacement);
      count++;
    }
  } else {
    console.warn(
      "Could not find needle for: " +
        item.make +
        " " +
        item.model +
        " " +
        item.variant,
    );
  }
}

fs.writeFileSync(seedPath, content, "utf8");
console.log(`Updated ${count} seeds in seed.js!`);
