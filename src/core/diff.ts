import type { Component, NoticesDocument } from "./types";

export interface ComponentChange {
  name: string;
  before: Component;
  after: Component;
  versionChanged: boolean;
  licensesChanged: boolean;
}

export interface NoticesDiff {
  added: Component[];
  removed: Component[];
  changed: ComponentChange[];
  unchanged: Component[];
}

function licenseIdsKey(component: Component): string {
  return component.licenses
    .map((license) => license.id)
    .sort()
    .join(",");
}

/**
 * Compares two normalized notices documents by component name. Intended for
 * release-over-release compliance review — e.g. did a dependency bump also
 * change its declared license.
 */
export function diffNotices(before: NoticesDocument, after: NoticesDocument): NoticesDiff {
  const beforeMap = new Map(before.components.map((component) => [component.name, component]));
  const afterMap = new Map(after.components.map((component) => [component.name, component]));

  const added: Component[] = [];
  const changed: ComponentChange[] = [];
  const unchanged: Component[] = [];

  for (const [name, afterComponent] of afterMap) {
    const beforeComponent = beforeMap.get(name);
    if (!beforeComponent) {
      added.push(afterComponent);
      continue;
    }

    const versionChanged = beforeComponent.version !== afterComponent.version;
    const licensesChanged = licenseIdsKey(beforeComponent) !== licenseIdsKey(afterComponent);

    if (versionChanged || licensesChanged) {
      changed.push({
        name,
        before: beforeComponent,
        after: afterComponent,
        versionChanged,
        licensesChanged,
      });
    } else {
      unchanged.push(afterComponent);
    }
  }

  const removed: Component[] = [];
  for (const [name, beforeComponent] of beforeMap) {
    if (!afterMap.has(name)) {
      removed.push(beforeComponent);
    }
  }

  return { added, removed, changed, unchanged };
}
