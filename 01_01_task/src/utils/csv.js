import { readFileSync } from "node:fs";

// Parses a single CSV line, correctly handling quoted fields that contain commas.
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // "" inside a quoted field means a literal quote character
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}

// Parses a full CSV string into an array of objects keyed by the header row.
export function parseCSV(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length < headers.length) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }

  return rows;
}

// Reads a CSV file from disk and returns parsed rows.
export function loadCSV(filePath) {
  return parseCSV(readFileSync(filePath, "utf8"));
}

// Serializes an array of objects into a CSV string.
// The column names come from the keys of the first object.
// Values that contain commas or quotes are automatically wrapped in double-quotes.
export function serializeCSV(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const s = String(val ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
