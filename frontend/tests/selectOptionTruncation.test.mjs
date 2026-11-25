import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/ui/select.tsx", import.meta.url),
  "utf8"
);

test("select option labels can shrink and ellipsize inside the fixed-width popup", () => {
  assert.match(
    source,
    /relative flex w-full min-w-0 cursor-default items-center/
  );
  assert.match(
    source,
    /<SelectPrimitive\.ItemText className="flex min-w-0 flex-1 gap-2 overflow-hidden text-ellipsis whitespace-nowrap"/
  );
  assert.doesNotMatch(
    source,
    /<SelectPrimitive\.ItemText className="[^"]*shrink-0/
  );
});

test("select popup keeps its available-height and horizontal overflow guards", () => {
  assert.match(
    source,
    /max-h-\(--available-height\)[^"]*overflow-x-hidden overflow-y-auto/
  );
});
