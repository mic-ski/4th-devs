import { model, tagging, paths } from "../config.js";
import { chat } from "../api.js";
import { tagBatchSchema } from "../schemas/tagBatch.js";
import { buildTagPrompt } from "../prompts/tagBatch.js";
import { readJsonIfExists, safeWriteJson } from "../utils/file.js";

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Calls the LLM once with a batch of jobs and returns their scored tags.
async function tagBatch(items) {
  const result = await chat({
    model,
    input: buildTagPrompt(items),
    textFormat: tagBatchSchema
  });
  return result.results;
}

/**
 * Tags all people's job descriptions using the LLM.
 * Supports resume: already-tagged rows are skipped on re-run.
 * Saves progress to output/tagged.json after every group of batches.
 *
 * people: array of person objects from the CSV
 * returns: the full tagged object (also written to disk)
 */
export async function tagPeople(people) {
  // tagged is an object: { "0": { tags: [...], job: "..." }, "1": { ... }, ... }
  const tagged = readJsonIfExists(paths.tagged) ?? {};

  const pending = people
    .map((p, i) => ({ index: i, job: p.job }))
    .filter(({ index }) => tagged[String(index)] === undefined);

  if (pending.length === 0) {
    console.log("All jobs already tagged. Delete output/tagged.json to re-run.");
    return tagged;
  }

  console.log(`Tagging ${pending.length} jobs (batch ${tagging.batchSize}, concurrency ${tagging.concurrency})...\n`);

  const batches = chunk(pending, tagging.batchSize);

  for (let i = 0; i < batches.length; i += tagging.concurrency) {
    const group = batches.slice(i, i + tagging.concurrency);
    const nums  = group.map((_, j) => `${i + j + 1}/${batches.length}`).join(", ");
    console.log(`  batch ${nums}...`);

    const allResults = await Promise.all(group.map(batch => tagBatch(batch)));

    for (const batchResults of allResults) {
      for (const { index, tags } of batchResults) {
        tagged[String(index)] = { tags, job: people[index].job };
      }
    }

    await safeWriteJson(paths.tagged, tagged);
    console.log(`  saved (${Object.keys(tagged).length}/${people.length} done)`);
  }

  return tagged;
}
