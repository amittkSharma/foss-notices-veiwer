export type RiskTier = "permissive" | "weak-copyleft" | "copyleft" | "proprietary" | "unknown";

/** Whether a component is a dependency of the analyzed project itself, or of one of its dependencies. Undefined when the source format has no dependency graph to derive this from (or the graph doesn't reach this component). */
export type DependencyType = "direct" | "transitive";

export interface LicenseInfo {
  id: string;
  name: string;
  text?: string;
  url?: string;
}

export interface CopyrightNotice {
  text: string;
}

export interface Component {
  name: string;
  version?: string;
  purl?: string;
  homepage?: string;
  /** The person(s) or organization(s) that authored/supplied the component, if the source format carries it. */
  author?: string;
  /** Direct vs. transitive, derived from the source format's own dependency graph (SPDX relationships, CycloneDX dependencies) when one is present. */
  dependencyType?: DependencyType;
  licenses: LicenseInfo[];
  copyrights: CopyrightNotice[];
}

export type NoticesSource =
  | "spdx"
  | "cyclonedx"
  | "generate-license-file"
  | "black-duck"
  | "unknown";

/** The project/codebase being analyzed, as opposed to its third-party components. Not every source format carries this. */
export interface ProjectMeta {
  name?: string;
  version?: string;
}

export interface NoticesDocument {
  source: NoticesSource;
  generatedAt?: string;
  /** The analyzed project's own identity, when the source format records one (SPDX document name, CycloneDX metadata.component). */
  project?: ProjectMeta;
  components: Component[];
}
