import type { Component, DependencyType, LicenseInfo, NoticesDocument } from "../types";

interface CycloneDxLicenseEntry {
  license?: { id?: string; name?: string; text?: { content?: string }; url?: string };
  expression?: string;
}

interface CycloneDxExternalReference {
  type?: string;
  url?: string;
}

interface CycloneDxComponent {
  type?: string;
  "bom-ref"?: string;
  name?: string;
  version?: string;
  purl?: string;
  copyright?: string;
  author?: string;
  supplier?: { name?: string };
  licenses?: CycloneDxLicenseEntry[];
  externalReferences?: CycloneDxExternalReference[];
}

interface CycloneDxDependency {
  ref?: string;
  dependsOn?: string[];
}

interface CycloneDxBom {
  bomFormat?: string;
  specVersion?: string;
  metadata?: {
    timestamp?: string;
    component?: { "bom-ref"?: string; name?: string; version?: string };
  };
  components?: CycloneDxComponent[];
  dependencies?: CycloneDxDependency[];
}

function expandExpression(expression: string): string[] {
  const tokens = expression
    .match(/[A-Za-z0-9.\-+]+/g)
    ?.filter((token) => !["OR", "AND", "WITH"].includes(token));
  return tokens && tokens.length > 0 ? tokens : [expression];
}

function extractLicenses(entries: CycloneDxLicenseEntry[] | undefined): LicenseInfo[] {
  if (!entries) return [];

  const licenses: LicenseInfo[] = [];
  for (const entry of entries) {
    if (entry.license) {
      const id = entry.license.id ?? entry.license.name ?? "Unknown License";
      licenses.push({
        id,
        name: entry.license.name ?? id,
        text: entry.license.text?.content,
        url: entry.license.url,
      });
    } else if (entry.expression) {
      for (const id of expandExpression(entry.expression)) {
        licenses.push({ id, name: id });
      }
    }
  }
  return licenses;
}

function extractHomepage(component: CycloneDxComponent): string | undefined {
  return component.externalReferences?.find(
    (ref) => ref.type === "website" || ref.type === "homepage",
  )?.url;
}

// CycloneDX carries "who made this" two ways: the free-text `author` field (1.4/1.5), or a
// structured `supplier` organization (the field the spec is migrating toward). Prefer whichever
// is actually present rather than requiring one specific shape.
function extractAuthor(component: CycloneDxComponent): string | undefined {
  return component.author ?? component.supplier?.name;
}

/**
 * Walks the top-level `dependencies` array (an adjacency list of `{ref, dependsOn}` edges)
 * breadth-first from `metadata.component`'s `bom-ref` to classify every reachable component
 * ref as direct or transitive. Components absent from the graph — including every BOM that
 * omits `dependencies` entirely, which real-world exports frequently do — are left unmapped,
 * which the caller treats as "unknown" rather than guessing.
 */
function classifyDependencyTypes(bom: CycloneDxBom): Map<string, DependencyType> {
  const rootRef = bom.metadata?.component?.["bom-ref"];
  const edges = new Map<string, string[]>();
  for (const dep of bom.dependencies ?? []) {
    if (dep.ref && dep.dependsOn) edges.set(dep.ref, dep.dependsOn);
  }

  const result = new Map<string, DependencyType>();
  if (!rootRef) return result;

  const rootDirect = edges.get(rootRef) ?? [];
  for (const ref of rootDirect) result.set(ref, "direct");

  const visited = new Set([rootRef, ...rootDirect]);
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
 * Parses a CycloneDX JSON BOM (1.4/1.5, e.g. from `cyclonedx-npm`, `syft`, or
 * Black Duck's own "export as CycloneDX" option) into the package's
 * normalized `NoticesDocument`.
 */
export function parseCycloneDxBom(input: string | Record<string, unknown>): NoticesDocument {
  const bom: CycloneDxBom = typeof input === "string" ? JSON.parse(input) : (input as CycloneDxBom);

  const dependencyTypes = classifyDependencyTypes(bom);

  const components: Component[] = (bom.components ?? [])
    .filter((component): component is CycloneDxComponent & { name: string } =>
      Boolean(component.name),
    )
    .map((component) => ({
      name: component.name,
      version: component.version,
      purl: component.purl,
      homepage: extractHomepage(component),
      author: extractAuthor(component),
      dependencyType: component["bom-ref"] ? dependencyTypes.get(component["bom-ref"]) : undefined,
      licenses: extractLicenses(component.licenses),
      copyrights: component.copyright ? [{ text: component.copyright }] : [],
    }));

  const projectComponent = bom.metadata?.component;

  return {
    source: "cyclonedx",
    generatedAt: bom.metadata?.timestamp,
    project: projectComponent?.name
      ? { name: projectComponent.name, version: projectComponent.version }
      : undefined,
    components,
  };
}
