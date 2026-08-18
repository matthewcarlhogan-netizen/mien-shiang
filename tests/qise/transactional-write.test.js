import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, apply, DispositionError } from "../../scripts/ingest-disposition.mjs";

const FAMILIES = [
  "five-elements-v1",
  "three-courts-v1",
  "twelve-palaces-v1",
  "qi-se-reading-v1",
  "harmony-v1",
  "qise-passages-v1"
];

function createInstrumentedMockFs(initialFiles, { failRename } = {}) {
  const files = new Map(Object.entries(initialFiles));
  const log = [];
  return {
    log,
    readFileSync: (p) => {
      log.push({ op: "read", path: p });
      return files.get(p);
    },
    writeFileSync: (p, c) => {
      log.push({ op: "write", path: p });
      files.set(p, c);
    },
    copyFileSync: (s, d) => {
      log.push({ op: "copy", source: s, destination: d });
      files.set(d, files.get(s));
    },
    renameSync: (s, d) => {
      // Record the attempted operation before fault injection.
      log.push({ op: "rename", source: s, destination: d });

      const injected = failRename?.(s, d);
      if (injected) throw injected;

      files.set(d, files.get(s));
      files.delete(s);
    },
    unlinkSync: (p) => {
      log.push({ op: "unlink", path: p });
      files.delete(p);
    },
    existsSync: (p) => {
      log.push({ op: "exists", path: p });
      return files.has(p);
    },
    getFileNames: () => Array.from(files.keys())
  };
}

function getDoc() {
  const families = {};
  for (const f of FAMILIES) {
    families[f] = { verdict: "approved", rationale: "Rationale for " + f + " is long enough.", contestedInterpretations: [], wordingDecisions: [] };
  }
  return {
    schemaVersion: 1,
    briefVersion: 1,
    date: "2026-09-30",
    reviewer: { name: "Dr A. Reviewer", qualifications: "Substantive qualifications...", interestsDeclared: "none", signatureArtifact: "sig.pdf" },
    questions: { Q1: { verdict: "approved", rationale: "Rationale for Q1 is long enough.", contestedInterpretations: [], wordingDecisions: [] }, Q2: { verdict: "approved", rationale: "Rationale for Q2 is long enough.", contestedInterpretations: [], wordingDecisions: [] }, Q3: { verdict: "approved", rationale: "Rationale for Q3 is long enough.", contestedInterpretations: [], wordingDecisions: [] }, Q4: { verdict: "approved", rationale: "Rationale for Q4 is long enough.", contestedInterpretations: [], wordingDecisions: [] } },
    families
  };
}

function getInitialManifest() {
  const families = {};
  for (const f of FAMILIES) {
    families[f] = { status: "pending", evidence: {} };
  }
  return JSON.stringify({ families });
}

function captureDispositionError(fn) {
  try {
    fn();
  } catch (err) {
    assert.ok(
      err instanceof DispositionError,
      `expected DispositionError, got ${err?.constructor?.name}`
    );
    return err;
  }
  assert.fail("expected apply() to throw DispositionError");
}

test("register anchor missing or duplicated", () => {
  const anchor = "### DR-2026-08-17-B020-CLASS-A";
  const doc = getDoc();
  const result = plan(doc, { signatureHash: "hash" });

  // Missing
  const fsOps1 = createInstrumentedMockFs({ "manifest.json": getInitialManifest(), "register.md": "no-anchor" });
  assert.throws(() => apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps: fsOps1 }), /anchor missing or duplicated/);
  assert.equal(fsOps1.log.filter(l => ["write", "copy", "rename", "unlink"].includes(l.op)).length, 0);

  // Duplicated
  const fsOps2 = createInstrumentedMockFs({ "manifest.json": getInitialManifest(), "register.md": anchor + "\n" + anchor });
  assert.throws(() => apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps: fsOps2 }), /anchor missing or duplicated/);
  assert.equal(fsOps2.log.filter(l => ["write", "copy", "rename", "unlink"].includes(l.op)).length, 0);
});

test("pre-existing staging artifact refused without overwrite/delete", () => {
  const fsOps = createInstrumentedMockFs({ 
    "manifest.json": getInitialManifest(), 
    "register.md": "### DR-2026-08-17-B020-CLASS-A",
    "manifest.json.new": "existing" 
  });
  const doc = getDoc();
  const result = plan(doc, { signatureHash: "hash" });

  assert.throws(() => apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps }), /Conflicting staging artifact/);
  assert.equal(fsOps.readFileSync("manifest.json.new"), "existing");
});

test("evidence structure validation", () => {
  const doc = getDoc();
  const result = plan(doc, { signatureHash: "hash" });
  
  // Missing evidence
  const m1 = JSON.parse(getInitialManifest());
  delete m1.families["five-elements-v1"].evidence;
  const fsOps1 = createInstrumentedMockFs({ "manifest.json": JSON.stringify(m1), "register.md": "### DR-2026-08-17-B020-CLASS-A" });
  assert.throws(() => apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps: fsOps1 }), /Malformed evidence/);
  
  // Null evidence
  const m2 = JSON.parse(getInitialManifest());
  m2.families["five-elements-v1"].evidence = null;
  const fsOps2 = createInstrumentedMockFs({ "manifest.json": JSON.stringify(m2), "register.md": "### DR-2026-08-17-B020-CLASS-A" });
  assert.throws(() => apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps: fsOps2 }), /Malformed evidence/);
});

test("authority preservation check", () => {
    const families = {};
    for (const f of FAMILIES) {
      families[f] = { status: "pending", evidence: { unrelated: "original-value" } };
    }
    const manifestOrigStr = JSON.stringify({ families });
    const fsOps = createInstrumentedMockFs({ 
        "manifest.json": manifestOrigStr, 
        "register.md": "### DR-2026-08-17-B020-CLASS-A" 
    });
    const doc = getDoc();
    const result = plan(doc, { signatureHash: "hash" });

    apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps });

    const manifest = JSON.parse(fsOps.readFileSync("manifest.json"));
    for (const f of FAMILIES) {
        assert.ok(manifest.families[f].evidence.culturalReview, `Missing culturalReview for ${f}`);
        assert.equal(manifest.families[f].status, "pending");
        assert.equal(manifest.families[f].evidence.unrelated, "original-value");
    }
    const regContent = fsOps.readFileSync("register.md");
    assert.equal(regContent.split("### DR-2026-08-17-B020-CLASS-A").length, 2, "Exactly two anchors: original + new");
    assert.ok(!fsOps.getFileNames().some(f => f.endsWith(".new") || f.endsWith(".bak")));
});


test("missing authoritative manifest family is refused before mutation", () => {
  const fsOps = createInstrumentedMockFs({ "manifest.json": JSON.stringify({ families: {} }), "register.md": "### DR-2026-08-17-B020-CLASS-A" });
  const doc = getDoc();
  const result = plan(doc, { signatureHash: "hash" });

  assert.throws(() => apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps }), /missing from authoritative manifest/);

  // No mutation operations should have occurred
  const mutations = fsOps.log.filter(l => ["write", "copy", "rename", "unlink"].includes(l.op));
  assert.equal(mutations.length, 0, "Mutation occurred before failure");
});

test("FAILURE BETWEEN DESTINATION RENAMES INJECTED", () => {
  const manifestOrigStr = getInitialManifest();
  const fsOps = createInstrumentedMockFs({ "manifest.json": manifestOrigStr, "register.md": "### DR-2026-08-17-B020-CLASS-A" });
  const doc = getDoc();
  const result = plan(doc, { signatureHash: "hash" });

  let firstRenameVerified = false;
  const hooks = {
    afterFirstRename: () => {
      const currentManifest = JSON.parse(fsOps.readFileSync("manifest.json"));
      assert.ok(
        currentManifest.families["five-elements-v1"]
          .evidence.culturalReview,
        "First destination should contain expected NEW culturalReview evidence"
      );
      firstRenameVerified = true;
      throw new Error("COMMIT_FAILURE");
    }
  };

  const err = captureDispositionError(() => apply(result, doc, { manifestPath: "manifest.json", regPath: "register.md" }, { fsOps, hooks }));
  assert.equal(firstRenameVerified, true);
  assert.ok(err.message.includes("COMMIT_FAILURE"));

  // Prove restoration byte-identical
  assert.equal(fsOps.readFileSync("manifest.json"), manifestOrigStr);
  assert.equal(fsOps.readFileSync("register.md"), "### DR-2026-08-17-B020-CLASS-A");
  
  // Prove no residue
  const residue = fsOps.getFileNames().filter(f => f.endsWith(".new") || f.endsWith(".bak"));
  assert.equal(residue.length, 0, `Residue found: ${residue}`);
});

test("PROVE ROLLBACK CONTINUES AFTER A ROLLBACK FAILURE", () => {
  let injectedRestoreFailures = 0;

  const fsOps = createInstrumentedMockFs(
    {
      "manifest.json": getInitialManifest(),
      "register.md": "### DR-2026-08-17-B020-CLASS-A"
    },
    {
      failRename: (source, destination) => {
        if (
          source === "manifest.json.bak" &&
          destination === "manifest.json"
        ) {
          injectedRestoreFailures += 1;
          return new Error("INJECTED_MANIFEST_RESTORE_FAILURE");
        }

        return null;
      }
    }
  );

  const doc = getDoc();
  const result = plan(doc, { signatureHash: "hash" });

  const hooks = {
    afterFirstRename: () => {
      throw new Error("ORIGINAL_COMMIT_ERROR");
    }
  };

  const err = captureDispositionError(() =>
    apply(
      result,
      doc,
      {
        manifestPath: "manifest.json",
        regPath: "register.md"
      },
      {
        fsOps,
        hooks
      }
    )
  );

  assert.equal(
    injectedRestoreFailures,
    1,
    "Expected exactly one injected manifest restoration failure"
  );

  assert.ok(err.message.includes("ORIGINAL_COMMIT_ERROR"));
  assert.ok(
    err.message.includes("INJECTED_MANIFEST_RESTORE_FAILURE")
  );

  const failedRestoreIndex = fsOps.log.findIndex(
    entry =>
      entry.op === "rename" &&
      entry.source === "manifest.json.bak" &&
      entry.destination === "manifest.json"
  );

  assert.notEqual(
    failedRestoreIndex,
    -1,
    "Manifest restoration attempt was not recorded"
  );

  const subsequentOps =
    fsOps.log.slice(failedRestoreIndex + 1);

  assert.ok(
    subsequentOps.some(
      entry =>
        entry.op === "rename" &&
        entry.source === "register.md.bak" &&
        entry.destination === "register.md"
    ),
    "Register restoration was not attempted after manifest restoration failure"
  );

  for (const path of [
    "manifest.json.new",
    "register.md.new",
    "manifest.json.bak",
    "register.md.bak"
  ]) {
    assert.ok(
      subsequentOps.some(
        entry =>
          entry.op === "exists" &&
          entry.path === path
      ),
      `Cleanup existence check not attempted for ${path}`
    );
  }

  // register.md.new still exists because destination rename #2
  // never happened.
  assert.ok(
    subsequentOps.some(
      entry =>
        entry.op === "unlink" &&
        entry.path === "register.md.new"
    ),
    "Register temp cleanup was not attempted"
  );

  // manifest.json.bak still exists because its restoration failed.
  assert.ok(
    subsequentOps.some(
      entry =>
        entry.op === "unlink" &&
        entry.path === "manifest.json.bak"
    ),
    "Manifest backup cleanup was not attempted after failed restoration"
  );
});
