import assert from "node:assert/strict";
import test from "node:test";
import { calculateMinimumQuote, type MinimumQuoteInput } from "./project-minimum-quote";

const sample: MinimumQuoteInput = {
  outsourceCost: 2100,
  laborCostSnapshots: [34107.72],
  rentCostSnapshots: [4044.32],
  executionCostAmounts: [300, 300, 100, 120, 50],
  estimatedDuration: 35,
  middleOfficeAverageMonthlyCost: 16367.76,
  middleOfficeBaseDays: 30,
  agencyFeeRate: 0,
  costBaselineRatio: 53,
};

test("adds labor buffer and rounds the minimum quote up to ten thousand", () => {
  const result = calculateMinimumQuote(sample);
  assert.equal(result.laborCost, 37518.49);
  assert.equal(result.middleOfficeCost, 19095.72);
  assert.equal(result.executionCost, 870);
  assert.equal(result.totalCost, 63628.53);
  assert.equal(result.quote, 130000);
});

test("calculates agency fee from the rounded quote", () => {
  const result = calculateMinimumQuote({ ...sample, agencyFeeRate: 5 });
  assert.equal(result.quote, 140000);
  assert.equal(result.agencyFee, 7000);
  assert.equal(result.totalCost, 70628.53);
  assert.ok(result.totalCost! / result.quote! <= 0.53);
});

test("keeps an exact ten-thousand quote on its boundary", () => {
  const result = calculateMinimumQuote({
    ...sample,
    outsourceCost: 53000,
    laborCostSnapshots: [],
    rentCostSnapshots: [],
    executionCostAmounts: [],
    middleOfficeAverageMonthlyCost: 0,
  });
  assert.equal(result.quote, 100000);
});

test("does not understate the quote when historical execution amounts are missing", () => {
  const result = calculateMinimumQuote({
    ...sample,
    executionCostAmounts: [null],
  });
  assert.equal(result.executionCost, null);
  assert.equal(result.quote, null);
  assert.equal(result.totalCost, null);
});
