// Structured Output schema for batch job tagging.
// "strict: true" forces the model to return exactly this JSON shape — no exceptions.
// Each job gets all 7 tags scored 0-100, so we can apply a confidence threshold later.

export const tagBatchSchema = {
  type: "json_schema",
  name: "batch_tags",
  strict: true,
  schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: {
              type: "integer",
              description: "The index number from the input (as given)"
            },
            tags: {
              type: "array",
              description: "All tags considered for this job, each with a confidence score",
              items: {
                type: "object",
                properties: {
                  tag: {
                    type: "string",
                    enum: ["IT", "transport", "edukacja", "medycyna", "praca z ludźmi", "praca z pojazdami", "praca fizyczna"]
                  },
                  confidence: {
                    type: "integer",
                    description: "How confident you are this tag applies, 0-100"
                  }
                },
                required: ["tag", "confidence"],
                additionalProperties: false
              }
            }
          },
          required: ["index", "tags"],
          additionalProperties: false
        }
      }
    },
    required: ["results"],
    additionalProperties: false
  }
};
