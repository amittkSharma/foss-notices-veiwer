import type { Component, DependencyType, LicenseInfo, NoticesDocument } from "../types";

interface SpdxExternalRef {
  referenceCategory?: string;
  referenceType?: string;
  referenceLocator?: string;
}

interface SpdxPackage {
  SPDXID?: string;
  name?: string;
  versionInfo?: string;
  licenseConcluded?: string;
  licenseDeclared?: string;
  copyrightText?: string;
  downloadLocation?: string;
  homepage?: string;
  originator?: string;
  supplier?: string;
  externalRefs?: SpdxExternalRef[];
}

interface SpdxRelationship {
  spdxElementId?: string;
  relatedSpdxElement?: string;
  relationshipType?: string;
}

interface SpdxDocument {
  SPDXID?: string;
  spdxVersion?: string;
  name?: string;
  creationInfo?: { created?: string };
  packages?: SpdxPackage[];
  relationships?: SpdxRelationship[];
}

const NO_VALUE = new Set(["NOASSERTION", "NONE", ""]);

function cleanValue(value: string | undefined): string | undefined {
  if (!value || NO_VALUE.has(value)) return undefined;
  return value;
}

function extractLicenseIds(pkg: SpdxPackage): string[] {
  const raw = cleanValue(pkg.licenseConcluded) ?? cleanValue(pkg.licenseDeclared);
  if (!raw) return [];
  const tokens = raw
    .match(/[A-Za-z0-9.\-+]+/g)
    ?.filter((token) => !["OR", "AND", "WITH"].includes(token));
  return tokens && tokens.length > 0 ? tokens : [raw];
}

function extractPurl(pkg: SpdxPackage): string | undefined {
  return pkg.externalRefs?.find((ref) => ref.referenceType === "purl")?.referenceLocator;
}

// SPDX's agent-syntax fields look like "Person: Jane Doe (jane@example.com)" or
// "Organization: Acme Inc." — the "who" is `originator`, falling back to `supplier`
// (the immediate distributor) when the package's true author wasn't recorded.
function extractAuthor(pkg: SpdxPackage): string | undefined {
  const raw = cleanValue(pkg.originator) ?? cleanValue(pkg.supplier);
  return raw?.replace(/^(Person|Organization|Tool):\s*/, "");
}

// The analyzed project's own SPDXID: either the target of a DESCRIBES relationship from the
// document (or the source of a DESCRIBED_BY pointing at the document), or — for the many
// real-world exports that skip that indirection and hang top-level DEPENDS_ON edges straight
// off the document node — the document's own SPDXID.
function findRootElementId(doc: SpdxDocument): string {
  const docId = doc.SPDXID ?? "SPDXRef-DOCUMENT";
  for (const rel of doc.relationships ?? []) {
    if (
      rel.relationshipType === "DESCRIBES" &&
      rel.spdxElementId === docId &&
      rel.relatedSpdxElement
    ) {
      return rel.relatedSpdxElement;
    }
    if (
      rel.relationshipType === "DESCRIBED_BY" &&
      rel.relatedSpdxElement === docId &&
      rel.spdxElementId
    ) {
      return rel.spdxElementId;
    }
  }
  return docId;
}

/**
 * Walks `relationships` (DEPENDS_ON, and its inverse DEPENDENCY_OF) breadth-first from the
 * project's root element to classify every reachable SPDXID as direct or transitive. Packages
 * absent from the graph (most real-world SPDX exports carry no relationships at all) are left
 * unmapped, which the caller treats as "unknown" rather than guessing.
 */
function classifyDependencyTypes(doc: SpdxDocument): Map<string, DependencyType> {
  const edges = new Map<string, string[]>();
  const addEdge = (from: string, to: string) => {
    const existing = edges.get(from);
    if (existing) existing.push(to);
    else edges.set(from, [to]);
  };

  for (const rel of doc.relationships ?? []) {
    if (!rel.spdxElementId || !rel.relatedSpdxElement) continue;
    if (rel.relationshipType === "DEPENDS_ON") {
      addEdge(rel.spdxElementId, rel.relatedSpdxElement);
    } else if (rel.relationshipType === "DEPENDENCY_OF") {
      addEdge(rel.relatedSpdxElement, rel.spdxElementId);
    }
  }

  const rootId = findRootElementId(doc);
  const rootDirect = edges.get(rootId) ?? [];
  const result = new Map<string, DependencyType>();
  for (const id of rootDirect) result.set(id, "direct");

  const visited = new Set([rootId, ...rootDirect]);
  const queue = [...rootDirect];
  let current: string | undefined = queue.shift();
  while (current !== undefined) {
    for (const next of edges.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      result.set(next, "transitive");
      queue.push(next);
    }
    current = queue.shift();
  }

  return result;
}

/**
 * Parses an SPDX 2.x JSON document (the format emitted by `spdx-sbom-generator`,
 * `syft -o spdx-json`, and most SCA tools' "export as SPDX" option) into the
 * package's normalized `NoticesDocument`.
 */
export function parseSpdxDocument(input: string | Record<string, unknown>): NoticesDocument {
  const doc: SpdxDocument = typeof input === "string" ? JSON.parse(input) : (input as SpdxDocument);

  const dependencyTypes = classifyDependencyTypes(doc);

  const components: Component[] = (doc.packages ?? [])
    .filter((pkg): pkg is SpdxPackage & { name: string } => Boolean(pkg.name))
    .map((pkg) => {
      const licenses: LicenseInfo[] = extractLicenseIds(pkg).map((id) => ({ id, name: id }));
      const copyrightText = cleanValue(pkg.copyrightText);

      return {
        name: pkg.name,
        version: cleanValue(pkg.versionInfo),
        purl: extractPurl(pkg),
        homepage: cleanValue(pkg.homepage),
        author: extractAuthor(pkg),
        dependencyType: pkg.SPDXID ? dependencyTypes.get(pkg.SPDXID) : undefined,
        licenses,
        copyrights: copyrightText ? [{ text: copyrightText }] : [],
      };
    });

  const projectName = cleanValue(doc.name);

  return {
    source: "spdx",
    generatedAt: doc.creationInfo?.created,
    project: projectName ? { name: projectName } : undefined,
    components,
  };
}
