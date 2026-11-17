import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMPORT_COLUMNS, normalizeRecords, parseCsv, parseMonths, readRecords, type RawRecord } from "@/db/import-places";

const row = (values: Record<string, string>, line = 2): RawRecord => ({
  line,
  values: { name_en: "Bou Sra Waterfall", name_km: "ទឹកធ្លាក់ប៊ូស្រា", province: "Mondulkiri", category: "waterfalls", lat: "12.5135", lng: "107.4287", best_months: "7-12", ...values },
});
const one = (values: Record<string, string>, options = {}) => normalizeRecords([row(values)], options);

describe("parseCsv", () => {
  it("reads simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
  it("reads quoted text with commas, quotes and new lines", () => {
    expect(parseCsv('a,b\n"Hello, world","She said ""hi"""\n"line one\nline two",x')).toEqual([
      ["a", "b"],
      ["Hello, world", 'She said "hi"'],
      ["line one\nline two", "x"],
    ]);
  });
  it("reads Windows line ends, a byte-order mark and Khmer", () => {
    expect(parseCsv("﻿name,km\r\nBou Sra,ទឹកធ្លាក់\r\n")).toEqual([["name", "km"], ["Bou Sra", "ទឹកធ្លាក់"]]);
  });
  it("skips empty rows, keeps empty cells", () => {
    expect(parseCsv("a,b\n\n,\n1,\n")).toEqual([["a", "b"], ["1", ""]]);
  });
  it("does not need a final new line", () => {
    expect(parseCsv("a\n1")).toEqual([["a"], ["1"]]);
  });
});

describe("parseMonths", () => {
  it.each([
    ["7 8 9", [7, 8, 9]],
    ["7,8,9", [7, 8, 9]],
    ["7-12", [7, 8, 9, 10, 11, 12]],
    ["Jul-Dec", [7, 8, 9, 10, 11, 12]],
    ["11-2", [1, 2, 11, 12]],
    ["Nov-Feb", [1, 2, 11, 12]],
    ["January, March", [1, 3]],
    ["3; 4", [3, 4]],
    ["12 12 1", [1, 12]],
  ])("reads %j", (text, expected) => {
    expect(parseMonths(text)).toEqual(expected);
  });
  it.each(["0", "13", "7-13", "June-", "foo", "7-x", "1-2-3"])("refuses %j", (text) => {
    expect(parseMonths(text)).toBeNull();
  });
});

describe("readRecords", () => {
  it("numbers CSV rows like the spreadsheet does (the header is line 1)", () => {
    const { records } = readRecords("name_en,province\nA,x\nB,y", "csv");
    expect(records.map((r) => [r.line, r.values.name_en])).toEqual([[2, "A"], [3, "B"]]);
  });
  it("makes lower-case column names from the header", () => {
    expect(readRecords("Name_EN\nA", "csv").records[0].values).toEqual({ name_en: "A" });
  });
  it("reads a JSON list, turning numbers and lists into text", () => {
    const { records } = readRecords(JSON.stringify([{ name_en: "A", lat: 12.5, photo_urls: ["u1", "u2"], tagline_en: null }]), "json");
    expect(records[0].values).toEqual({ name_en: "A", lat: "12.5", photo_urls: "u1 u2", tagline_en: "" });
  });
  it("reports a JSON file that is not valid JSON", () => {
    const result = readRecords("not json", "json");
    expect(result.issues).toHaveLength(1);
    expect(result.records).toEqual([]);
  });
  it("reports an empty CSV file", () => {
    const result = readRecords("", "csv");
    expect(result.issues).toHaveLength(1);
    expect(result.records).toEqual([]);
  });
  it("wants a list in a JSON file", () => {
    expect(readRecords('{"a":1}', "json").issues[0].message).toContain("list");
  });
});

describe("normalizeRecords: a good row", () => {
  it("fills everything in", () => {
    const { rows, issues, warnings } = one({
      slug: "bou-sra-waterfall", tagline_en: "Full flow", description_en: "A waterfall.", entry_fee_khr: "4,000៛", entry_fee_usd: "$2.50",
      avoid_months: "3 4", ticket_en: "Pay at the gate", ticket_km: "បង់នៅច្រកចូល",
    });
    expect(issues).toEqual([]);
    expect(warnings).toEqual([]);
    expect(rows[0]).toMatchObject({
      line: 2, slug: "bou-sra-waterfall", nameEn: "Bou Sra Waterfall", nameKm: "ទឹកធ្លាក់ប៊ូស្រា", taglineEn: "Full flow", taglineKm: null,
      descriptionEn: "A waterfall.", province: "Mondulkiri", category: "waterfalls", lat: 12.5135, lng: 107.4287,
      entryFeeKhr: 4000, entryFeeUsd: 2.5, bestMonths: [7, 8, 9, 10, 11, 12], avoidMonths: [3, 4], photos: [],
      details: { ticket: { en: "Pay at the gate", km: "បង់នៅច្រកចូល" } },
    });
  });

  it("makes the web name from the English name when none is given", () => {
    expect(one({}).rows[0].slug).toBe("bou-sra-waterfall");
  });

  it("keeps empty fees as 'not known', never as 0", () => {
    const place = one({}).rows[0];
    expect(place.entryFeeKhr).toBeNull();
    expect(place.entryFeeUsd).toBeNull();
    expect(one({ entry_fee_khr: "0", entry_fee_usd: "0" }).rows[0]).toMatchObject({ entryFeeKhr: 0, entryFeeUsd: 0 });
  });

  it("accepts photos that start with the photo storage address", () => {
    const { rows, issues } = one({ photo_urls: "https://photos.example.com/a.webp  https://photos.example.com/b.webp" }, { photoBase: "https://photos.example.com" });
    expect(issues).toEqual([]);
    expect(rows[0].photos).toHaveLength(2);
  });
});

describe("normalizeRecords: problems, each with its row and column", () => {
  const problem = (values: Record<string, string>, options = {}) => one(values, options).issues;

  it("needs a name, a province, a category and a pin", () => {
    const issues = normalizeRecords([{ line: 7, values: { name_en: "", province: "", category: "", lat: "", lng: "" } }]).issues;
    expect(issues.map((i) => `${i.line}:${i.column}`).sort()).toEqual(["7:category", "7:lat", "7:lng", "7:name_en", "7:province", "7:slug"].sort());
  });

  it("points out a latitude and longitude that look swapped", () => {
    const issues = problem({ lat: "107.4287", lng: "12.5135" });
    expect(issues.map((i) => i.column).sort()).toEqual(["lat", "lng"]);
    expect(issues[0].message).toContain("swapped");
  });

  it("refuses a pin that is not a number", () => {
    expect(problem({ lat: "twelve" })[0]).toMatchObject({ column: "lat" });
  });

  it.each([
    ["entry_fee_khr", "4.5"],
    ["entry_fee_khr", "-1"],
    ["entry_fee_khr", "free"],
    ["entry_fee_usd", "2.555"],
    ["entry_fee_usd", "-3"],
    ["entry_fee_usd", "cheap"],
  ])("refuses %s = %j", (column, value) => {
    expect(problem({ [column]: value })[0]).toMatchObject({ column });
  });

  it("explains bad months, and a month in both lists", () => {
    expect(problem({ best_months: "Smarch" })[0].message).toContain("not a list of months");
    expect(problem({ best_months: "7-9", avoid_months: "9 10" })[0].message).toContain("both");
  });

  it("refuses texts that are too long", () => {
    expect(problem({ tagline_en: "x".repeat(161) })[0]).toMatchObject({ column: "tagline_en" });
    expect(problem({ description_km: "ក".repeat(2001) })[0]).toMatchObject({ column: "description_km" });
    expect(problem({ ticket_en: "x".repeat(501) })[0]).toMatchObject({ column: "ticket_en" });
    expect(problem({ name_en: "x".repeat(121) })[0]).toMatchObject({ column: "name_en" });
  });

  it("refuses a badly written web name", () => {
    expect(problem({ slug: "Bou Sra" })[0]).toMatchObject({ column: "slug" });
  });

  it("refuses a web name used twice in the file, naming the first line", () => {
    const { issues } = normalizeRecords([row({ slug: "same" }, 2), row({ slug: "same", name_en: "Other" }, 5)]);
    expect(issues).toEqual([{ line: 5, column: "slug", message: expect.stringContaining("line 2") }]);
  });

  it("refuses a column it does not know (a typo would lose data silently)", () => {
    const issues = problem({ provnce: "Kampot" });
    expect(issues.some((i) => i.column === "provnce" && i.message.includes("Unknown column"))).toBe(true);
  });

  it("refuses photos from anywhere but our storage, or when storage is not set up", () => {
    expect(problem({ photo_urls: "https://evil.example.org/a.webp" }, { photoBase: "https://photos.example.com" })[0].message).toContain("does not start with");
    expect(problem({ photo_urls: "https://photos.example.com/a.webp" }, { photoBase: null })[0].message).toContain("not set up");
    expect(problem({ photo_urls: Array.from({ length: 11 }, (_, i) => `https://photos.example.com/${i}.webp`).join(" ") }, { photoBase: "https://photos.example.com" })[0].message).toContain("At most 10");
  });

  it("does not return a row that has a problem", () => {
    expect(one({ lat: "x" }).rows).toEqual([]);
  });

  it("reports every problem of every row in one go", () => {
    const { issues } = normalizeRecords([row({ slug: "a", lat: "x" }, 2), row({ slug: "b", category: "" }, 3), row({ slug: "c", best_months: "zzz" }, 4)]);
    expect(issues.map((i) => i.line)).toEqual([2, 3, 4]);
  });
});

describe("normalizeRecords: warnings", () => {
  it("warns about a missing Khmer name and uses the English one", () => {
    const { rows, warnings } = one({ name_km: "" });
    expect(rows[0].nameKm).toBe("Bou Sra Waterfall");
    expect(warnings).toEqual([{ line: 2, column: "name_km", message: expect.stringContaining("No Khmer name") }]);
  });
  it("warns about a place with no best months", () => {
    expect(one({ best_months: "" }).warnings.map((w) => w.column)).toEqual(["best_months"]);
  });
});

describe("the template and the example", () => {
  it("the template has every column the importer knows, in order", () => {
    expect(readFileSync("data/places.template.csv", "utf8").trim().split(",")).toEqual(IMPORT_COLUMNS);
  });

  it("the example file imports without a single problem", () => {
    const { records, issues } = readRecords(readFileSync("data/places.example.csv", "utf8"), "csv");
    expect(issues).toEqual([]);
    const result = normalizeRecords(records);
    expect(result.issues).toEqual([]);
    expect(result.rows.map((r) => r.slug)).toEqual(["bou-sra-waterfall", "angkor-wat"]);
    expect(result.rows[1]).toMatchObject({ entryFeeKhr: 0, bestMonths: [1, 2, 11, 12] });
  });
});
