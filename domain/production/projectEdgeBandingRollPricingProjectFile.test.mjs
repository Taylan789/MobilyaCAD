import assert from "node:assert/strict";
import test from "node:test";
import { PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD, readProjectEdgeBandingRollPricingFromProjectFile, setProjectEdgeBandingRollPricingInProjectFile } from "./projectEdgeBandingRollPricingProjectFile.ts";

function project(overrides = {}) {
  return { format: "MobilyaCAD", formatVersion: 2, projectId: "project-42", room: { width: 4000, length: 5000, height: 2800, unit: "mm" }, furniture: [], materials: [], ...overrides };
}
function pricing(overrides = {}) {
  return { schemaVersion: 1, rollSpecs: [
    { edgeBandingId: "pvc-b", rollLengthMm: 50000, wasteAllowanceMm: 25, sourceReference: "spec:b" },
    { edgeBandingId: "pvc-a", rollLengthMm: 100000 }
  ], rollPriceTable: [
    { edgeBandingId: "pvc-b", unit: "rulo", unitPriceMinor: 12000, currencyCode: "TRY", sourceReference: "price:b" },
    { edgeBandingId: "pvc-a", unit: "rulo", unitPriceMinor: 0, currencyCode: "TRY" }
  ], ...overrides };
}

test("missing v2 extension reads as empty and has explicit schema", () => {
  const result = readProjectEdgeBandingRollPricingFromProjectFile(project());
  assert.equal(result.status, "empty");
  assert.equal(result.projectId, "project-42");
  assert.deepEqual(result.pricing, { schemaVersion: 1, rollSpecs: [], rollPriceTable: [] });
});
test("save/read round-trip sorts catalog IDs and preserves mm, fixed allowance, price, currency and sources", () => {
  const input = pricing();
  const saved = setProjectEdgeBandingRollPricingInProjectFile(project(), input);
  assert.equal(saved.status, "ready", saved.diagnostics.join("; "));
  assert.ok(saved.project);
  assert.deepEqual(saved.pricing.rollSpecs.map(x=>x.edgeBandingId), ["pvc-a","pvc-b"]);
  assert.deepEqual(saved.pricing.rollPriceTable.map(x=>x.edgeBandingId), ["pvc-a","pvc-b"]);
  assert.equal(saved.pricing.rollSpecs[0].wasteAllowanceMm, 0);
  assert.equal(saved.pricing.rollPriceTable[0].unitPriceMinor, 0);
  assert.deepEqual(input.rollSpecs[0], { edgeBandingId:"pvc-b",rollLengthMm:50000,wasteAllowanceMm:25,sourceReference:"spec:b" });
  const read = readProjectEdgeBandingRollPricingFromProjectFile(saved.project);
  assert.equal(read.status,"ready");
  assert.deepEqual(read.pricing,saved.pricing);
  assert.equal(read.pricing.rollPriceTable[1].sourceReference,"price:b");
});
test("update and clear are immutable and preserve unrelated project data", () => {
  const original = project({ otherExtension:{ kept:true } });
  const first = setProjectEdgeBandingRollPricingInProjectFile(original,pricing());
  assert.ok(first.project);
  const second = setProjectEdgeBandingRollPricingInProjectFile(first.project,{ schemaVersion:1,rollSpecs:[{edgeBandingId:"pvc-c",rollLengthMm:80000}],rollPriceTable:[] });
  assert.equal(second.status,"ready");
  assert.deepEqual(second.pricing.rollSpecs,[{edgeBandingId:"pvc-c",rollLengthMm:80000,wasteAllowanceMm:0}]);
  assert.equal(original.edgeBandingRollPricing,undefined);
  assert.deepEqual(second.project.otherExtension,{kept:true});
  const cleared = setProjectEdgeBandingRollPricingInProjectFile(second.project,{schemaVersion:1,rollSpecs:[],rollPriceTable:[]});
  assert.equal(cleared.status,"ready");
  assert.equal(PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD in cleared.project,false);
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile(cleared.project).status,"empty");
});
test("legacy v1 is read-only and extension on v1 is blocked", () => {
  const legacy={format:"MobilyaCAD",formatVersion:1,furniture:[]};
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile(legacy).status,"legacy");
  assert.equal(setProjectEdgeBandingRollPricingInProjectFile(legacy,pricing()).status,"blocked");
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile({...legacy,edgeBandingRollPricing:pricing()}).status,"blocked");
});
test("bad project format, missing projectId and unsupported version are blocked", () => {
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile({format:"Other",formatVersion:2,projectId:"x"}).status,"blocked");
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile(project({projectId:undefined})).status,"blocked");
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile(project({formatVersion:3})).status,"blocked");
});
test("schema unknown fields or unsupported schemaVersion fail without partial output", () => {
  for(const input of [{...pricing(),extra:true},{...pricing(),schemaVersion:2}]){
    const result=setProjectEdgeBandingRollPricingInProjectFile(project(),input);
    assert.equal(result.status,"blocked");assert.equal(result.project,null);assert.equal(result.pricing,null);
  }
});
test("roll spec IDs must be valid and unique", () => {
  for(const rollSpecs of [[{edgeBandingId:"pvc-a",rollLengthMm:1000},{edgeBandingId:"pvc-a",rollLengthMm:2000}],[{edgeBandingId:"BadID",rollLengthMm:1000}]]){
    assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollSpecs})).status,"blocked");
  }
});
test("roll spec rows reject unknown fields", () => { const result=setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollSpecs:[{edgeBandingId:"pvc-a",rollLengthMm:1000,extra:true}]})); assert.equal(result.status,"blocked"); assert.equal(result.project,null); });
test("roll lengths and fixed allowances validate 0.1 mm precision and bounds", () => {
  for(const rollLengthMm of [0,-1,0.05,10_000_000.1]) assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollSpecs:[{edgeBandingId:"pvc-a",rollLengthMm}]})).status,"blocked");
  for(const wasteAllowanceMm of [-0.1,0.05]) assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollSpecs:[{edgeBandingId:"pvc-a",rollLengthMm:1000,wasteAllowanceMm}]})).status,"blocked");
});
test("roll spec source reference must be bounded trimmed text", () => {
  for(const sourceReference of ["","  supplier  ","x".repeat(257)]) assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollSpecs:[{edgeBandingId:"pvc-a",rollLengthMm:1000,sourceReference}]})).status,"blocked");
});
test("roll price rows require unique IDs and the rulo unit", () => {
  const duplicate=[{edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:1,currencyCode:"TRY"},{edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:2,currencyCode:"TRY"}];
  assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollPriceTable:duplicate})).status,"blocked");
  assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollPriceTable:[{edgeBandingId:"pvc-a",unit:"m",unitPriceMinor:1,currencyCode:"TRY"}]})).status,"blocked");
});
test("roll price amounts are safe non-negative integers and currency is uppercase ISO-like code", () => {
  for(const row of [
    {edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:-1,currencyCode:"TRY"},
    {edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:1.2,currencyCode:"TRY"},
    {edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:Number.MAX_SAFE_INTEGER+1,currencyCode:"TRY"},
    {edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:1,currencyCode:"try"}
  ]) assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollPriceTable:[row]})).status,"blocked");
});
test("source references, unknown fields and oversized tables are rejected", () => {
  for(const row of [
    {edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:0,currencyCode:"TRY",sourceReference:" "},
    {edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:0,currencyCode:"TRY",extra:true}
  ]) assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollPriceTable:[row]})).status,"blocked");
  const specs=Array.from({length:1001},(_,i)=>({edgeBandingId:"roll-"+i,rollLengthMm:1000}));
  const prices=Array.from({length:1001},(_,i)=>({edgeBandingId:"roll-"+i,unit:"rulo",unitPriceMinor:0,currencyCode:"TRY"}));
  assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollSpecs:specs})).status,"blocked");
  assert.equal(setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollPriceTable:prices})).status,"blocked");
});
test("malformed saved extension cannot be silently overwritten", () => {
  const saved=project({edgeBandingRollPricing:{schemaVersion:1,rollSpecs:[{}],rollPriceTable:[]}});
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile(saved).pricing,null);
  const write=setProjectEdgeBandingRollPricingInProjectFile(saved,pricing());
  assert.equal(write.status,"blocked");assert.equal(write.project,null);
});
test("price-only input can be saved for later and results are frozen", () => {
  const saved=setProjectEdgeBandingRollPricingInProjectFile(project(),pricing({rollSpecs:[],rollPriceTable:[{edgeBandingId:"pvc-a",unit:"rulo",unitPriceMinor:1500,currencyCode:"TRY",sourceReference:"price:v2"}]}));
  assert.equal(saved.status,"ready");assert.ok(saved.project);assert.equal(readProjectEdgeBandingRollPricingFromProjectFile(saved.project).pricing.rollPriceTable[0].sourceReference,"price:v2");
  assert.ok(Object.isFrozen(saved.project));assert.ok(Object.isFrozen(saved.pricing));assert.ok(Object.isFrozen(saved.pricing.rollPriceTable));
  assert.throws(()=>{saved.pricing.rollPriceTable[0].unitPriceMinor=3;},TypeError);
});
test("existing quote revision extension is preserved", () => {
  const history={schemaVersion:1,projectId:"project-42",revisions:[]};
  const saved=setProjectEdgeBandingRollPricingInProjectFile(project({quoteRevisionHistory:history}),pricing());
  assert.equal(saved.status,"ready");assert.deepEqual(saved.project.quoteRevisionHistory,history);assert.ok(saved.project.edgeBandingRollPricing);
});


test("project and nested pricing accessors are blocked without executing getters", () => {
  let projectGetterCalls = 0;
  const unsafeProject = project();
  Object.defineProperty(unsafeProject, "format", {
    configurable: true,
    enumerable: true,
    get() { projectGetterCalls += 1; return "MobilyaCAD"; }
  });
  const read = readProjectEdgeBandingRollPricingFromProjectFile(unsafeProject);
  assert.equal(read.status, "blocked");
  assert.equal(projectGetterCalls, 0);

  let pricingGetterCalls = 0;
  const unsafePricing = pricing();
  Object.defineProperty(unsafePricing.rollSpecs[0], "rollLengthMm", {
    configurable: true,
    enumerable: true,
    get() { pricingGetterCalls += 1; return 50000; }
  });
  const write = setProjectEdgeBandingRollPricingInProjectFile(project(), unsafePricing);
  assert.equal(write.status, "blocked");
  assert.equal(write.project, null);
  assert.equal(pricingGetterCalls, 0);
});

test("inherited project and pricing accessors are never used", () => {
  let getterCalls = 0;
  const projectPrototype = Object.create(Object.prototype);
  Object.defineProperty(projectPrototype, "format", {
    get() { getterCalls += 1; return "MobilyaCAD"; }
  });
  const inheritedProject = Object.assign(Object.create(projectPrototype), {
    formatVersion: 2,
    projectId: "project-42"
  });
  assert.equal(readProjectEdgeBandingRollPricingFromProjectFile(inheritedProject).status, "blocked");
  assert.equal(getterCalls, 0);

  const rowPrototype = Object.create(Object.prototype);
  Object.defineProperty(rowPrototype, "rollLengthMm", {
    get() { getterCalls += 1; return 50000; }
  });
  const inheritedRow = Object.assign(Object.create(rowPrototype), { edgeBandingId: "pvc-a" });
  const unsafePricing = { schemaVersion: 1, rollSpecs: [inheritedRow], rollPriceTable: [] };
  const write = setProjectEdgeBandingRollPricingInProjectFile(project(), unsafePricing);
  assert.equal(write.status, "blocked");
  assert.equal(write.project, null);
  assert.equal(getterCalls, 0);
});

test("project descriptor and ownKeys reflection trap failures return blocked instead of escaping", () => {
  const descriptorTrapProject = new Proxy(project(), {
    getOwnPropertyDescriptor(target, key) {
      if (key === "format") throw new Error("project descriptor trap failed");
      return Reflect.getOwnPropertyDescriptor(target, key);
    }
  });
  const read = readProjectEdgeBandingRollPricingFromProjectFile(descriptorTrapProject);
  assert.equal(read.status, "blocked");
  assert.match(read.diagnostics.join(" "), /descriptor trap failed/);
  const descriptorWrite = setProjectEdgeBandingRollPricingInProjectFile(descriptorTrapProject, pricing());
  assert.equal(descriptorWrite.status, "blocked");
  assert.equal(descriptorWrite.project, null);
  assert.match(descriptorWrite.diagnostics.join(" "), /descriptor trap failed/);

  const ownKeysTrapProject = new Proxy(project(), {
    ownKeys() { throw new Error("project ownKeys trap failed"); }
  });
  const ownKeysWrite = setProjectEdgeBandingRollPricingInProjectFile(ownKeysTrapProject, pricing());
  assert.equal(ownKeysWrite.status, "blocked");
  assert.equal(ownKeysWrite.project, null);
  assert.match(ownKeysWrite.diagnostics.join(" "), /ownKeys trap failed/);
});

test("v2 writes deep-clone and freeze unrelated project metadata", () => {
  const original = project({
    room: { width: 4000, length: 5000, height: 2800, unit: "mm", custom: { label: "before" } },
    customEnvelope: { nested: { keep: true }, items: [{ id: "item-a", tags: ["one", "two"] }] }
  });
  const saved = setProjectEdgeBandingRollPricingInProjectFile(original, pricing());
  assert.equal(saved.status, "ready");
  assert.ok(saved.project);
  assert.notStrictEqual(saved.project.room, original.room);
  assert.notStrictEqual(saved.project.room.custom, original.room.custom);
  assert.notStrictEqual(saved.project.customEnvelope.items[0].tags, original.customEnvelope.items[0].tags);
  assert.ok(Object.isFrozen(saved.project.room));
  assert.ok(Object.isFrozen(saved.project.room.custom));
  assert.ok(Object.isFrozen(saved.project.customEnvelope.items[0].tags));

  original.room.custom.label = "changed";
  original.customEnvelope.items[0].tags.push("changed");
  assert.equal(saved.project.room.custom.label, "before");
  assert.deepEqual(saved.project.customEnvelope.items[0].tags, ["one", "two"]);
  assert.throws(() => { saved.project.room.custom.label = "tampered"; }, TypeError);
  assert.throws(() => { saved.project.customEnvelope.items[0].tags.push("tampered"); }, TypeError);
});

test("v2 writes preserve an own __proto__ metadata key as JSON data", () => {
  const customEnvelope = JSON.parse('{"__proto__":{"marker":"preserved"}}');
  const saved = setProjectEdgeBandingRollPricingInProjectFile(project({ customEnvelope }), pricing());
  assert.equal(saved.status, "ready");
  assert.ok(saved.project);
  assert.equal(Object.getPrototypeOf(saved.project.customEnvelope), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(saved.project.customEnvelope, "__proto__"), true);
  assert.deepEqual(saved.project.customEnvelope["__proto__"], { marker: "preserved" });
});

test("v2 write clone enforces the shared 16 MiB and 64-level envelope bounds", () => {
  const nested = {};
  let cursor = nested;
  for (let index = 0; index < 64; index += 1) {
    const child = {};
    cursor.child = child;
    cursor = child;
  }
  const tooDeep = setProjectEdgeBandingRollPricingInProjectFile(project({ customEnvelope: nested }), pricing());
  assert.equal(tooDeep.status, "blocked");
  assert.match(tooDeep.diagnostics.join(" "), /64 iç içe/);

  const tooLarge = setProjectEdgeBandingRollPricingInProjectFile(
    project({ customEnvelope: { payload: "x".repeat(16 * 1024 * 1024) } }),
    pricing()
  );
  assert.equal(tooLarge.status, "blocked");
  assert.match(tooLarge.diagnostics.join(" "), /16 MiB UTF-8/);
});
