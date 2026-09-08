import type { NoticesSource, ProjectMeta } from "../../core/types";

const NO_INFO = "No information";

const SOURCE_LABELS: Record<NoticesSource, string> = {
  spdx: "SPDX",
  cyclonedx: "CycloneDX",
  "generate-license-file": "generate-license-file",
  "black-duck": "Black Duck Notices Report",
  unknown: "Unknown source",
};

export interface ProjectHeaderProps {
  project?: ProjectMeta;
  /** The document's source format, shown as document-level metadata (e.g. "SPDX"). */
  source?: NoticesSource;
  /** The document's generation timestamp (ISO 8601), shown as document-level metadata. */
  generatedAt?: string;
}

/**
 * Renders the analyzed project's own identity above the component list, so it's
 * immediately clear which codebase this notices document describes. Not every
 * source format carries this (SPDX and CycloneDX do; generate-license-file and
 * Black Duck notices don't record a project identifier). `source`/`generatedAt`
 * are shown independently of the project block since they're available for every
 * document, even ones without a project identifier.
 */
export function ProjectHeader({ project, source, generatedAt }: ProjectHeaderProps) {
  const hasProject = Boolean(project && (project.name || project.version));
  if (!hasProject && !source && !generatedAt) return null;

  return (
    <div className="fnv-project-header">
      {hasProject && (
        <div className="fnv-project-header__main">
          <span className="fnv-project-header__label">Project under investigation</span>
          <span className="fnv-project-header__name">{project?.name || NO_INFO}</span>
          {project?.version && (
            <span className="fnv-project-header__version">v{project.version}</span>
          )}
        </div>
      )}
      {(source || generatedAt) && (
        <div className="fnv-project-header__meta">
          {source && <span className="fnv-project-header__source">{SOURCE_LABELS[source]}</span>}
          {generatedAt && (
            <span className="fnv-project-header__generated-at">
              Generated {generatedAt.slice(0, 10)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
