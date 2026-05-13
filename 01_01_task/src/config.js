import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveModelForProvider } from "../../config.js";

const DIRNAME     = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(DIRNAME, "..");
const ROOT_DIR    = path.resolve(PROJECT_DIR, "..");

export const paths = {
  input:    path.join(ROOT_DIR, "input", "people.csv"),
  output:   path.join(PROJECT_DIR, "output"),
  filtered: path.join(PROJECT_DIR, "output", "filtered.csv"),
  tagged:   path.join(PROJECT_DIR, "output", "tagged.json"),
  final:    path.join(PROJECT_DIR, "output", "final.csv"),
  answer:   path.join(PROJECT_DIR, "output", "answer.json")
};

export const hubApiKey = process.env.HUB_API_KEY?.trim() ?? "";

export const model = resolveModelForProvider("gpt-4.1-mini");

export const tagging = {
  batchSize:   30,
  concurrency: 3
};

export const filter = {
  currentYear:         2026,
  minAge:              20,
  maxAge:              40,
  gender:              "M",
  city:                "Grudziądz",
  tag:                 "transport",
  confidenceThreshold: 60
};
