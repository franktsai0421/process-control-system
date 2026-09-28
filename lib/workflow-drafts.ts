/* oxlint-disable typescript/no-explicit-any -- Diff traversal intentionally handles heterogeneous persisted JSON. */
export type WorkflowKind = 'process' | 'master' | 'bom';

export type PathSegment =
  | { type: 'field'; key: string }
  | { type: 'item'; field: string; value: string };

export type WorkflowChange = {
  id: string;
  path: PathSegment[];
  baseValue: unknown;
  mineValue: unknown;
  label: string;
  location: Record<string, string>;
};

export type WorkflowDraft = {
  id: string;
  kind: WorkflowKind;
  scope: string;
  ownerId: string;
  ownerName: string;
  version: number;
  status: 'draft' | 'locked' | 'archived';
  base: unknown;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  lockedCaseId?: string;
  resolutions?: Record<
    string,
    { strategy: 'mine'; currentValue: unknown; mineValue: unknown }
  >;
};

export type WorkflowCase = {
  id: string;
  draftId: string;
  draftVersion: number;
  kind: WorkflowKind;
  scope: string;
  ownerId: string;
  ownerName: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  base: unknown;
  payload: unknown;
  changes: WorkflowChange[];
  createdAt: string;
  updatedAt: string;
  reviewNote?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
};

export type WorkflowStore = {
  schemaVersion: 1;
  drafts: WorkflowDraft[];
  cases: WorkflowCase[];
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const plain = (value: unknown): value is Record<string, unknown> =>
  !!value && !Array.isArray(value) && typeof value === 'object';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const field = (key: string): PathSegment => ({ type: 'field', key });
const item = (key: string, value: string): PathSegment => ({
  type: 'item',
  field: key,
  value,
});
export const pathId = (path: PathSegment[]) => JSON.stringify(path);

export function workflowStore(raw: string | undefined): WorkflowStore {
  try {
    const parsed = JSON.parse(raw || 'null');
    if (
      parsed?.schemaVersion === 1 &&
      Array.isArray(parsed.drafts) &&
      Array.isArray(parsed.cases)
    )
      return parsed;
  } catch {}
  return { schemaVersion: 1, drafts: [], cases: [] };
}

function keyedArray(values: unknown[]) {
  if (!values.length || values.some((value) => !plain(value))) return null;
  for (const candidate of ['id', 'code']) {
    const keys = values.map((value) => String((value as any)[candidate] || ''));
    if (keys.every(Boolean) && new Set(keys).size === keys.length) return candidate;
  }
  return null;
}

function describe(kind: WorkflowKind, scope: string, path: PathSegment[]) {
  const fields = path.filter((part) => part.type === 'field').map((part: any) => part.key);
  const items = path.filter((part) => part.type === 'item') as Array<{
    type: 'item';
    field: string;
    value: string;
  }>;
  const location: Record<string, string> = { kind, scope };
  if (kind === 'process') {
    location.stageCode = fields[0] || '';
    location.operationId = items[0]?.value || '';
    location.field = fields.at(-1) || '';
    return {
      label: [location.stageCode, location.operationId, location.field]
        .filter(Boolean)
        .join(' · '),
      location,
    };
  }
  if (kind === 'bom') {
    location.productCode = (fields[0] === 'data' ? fields[1] : fields[0]) || scope;
    return { label: `BOM · ${location.productCode}`, location };
  }
  location.section = fields[0] || scope;
  location.recordId = items.map((part) => part.value).join(' · ');
  location.field = fields.at(-1) || '';
  if (scope === 'PROCESS') {
    location.stageCode = fields[0] || '';
    location.templateId = items[0]?.value || '';
    location.equipmentId = items[1]?.value || '';
  }
  return {
    label: [scope, location.stageCode || location.section, location.recordId, location.field]
      .filter(Boolean)
      .join(' · '),
    location,
  };
}

export function workflowChanges(
  base: unknown,
  mine: unknown,
  kind: WorkflowKind,
  scope: string,
) {
  const changes: WorkflowChange[] = [];
  const walk = (before: unknown, after: unknown, path: PathSegment[]) => {
    if (same(before, after)) return;
    if (Array.isArray(before) && Array.isArray(after)) {
      const beforeKey = keyedArray(before),
        afterKey = keyedArray(after),
        key = beforeKey && afterKey
          ? beforeKey === afterKey
            ? beforeKey
            : null
          : beforeKey || afterKey;
      if (key) {
        const left = new Map(before.map((value: any) => [String(value[key]), value]));
        const right = new Map(after.map((value: any) => [String(value[key]), value]));
        for (const id of new Set([...left.keys(), ...right.keys()]))
          walk(left.get(id), right.get(id), [...path, item(key, id)]);
        return;
      }
    }
    if (plain(before) && plain(after)) {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)]))
        walk(before[key], after[key], [...path, field(key)]);
      return;
    }
    const info = describe(kind, scope, path);
    changes.push({
      id: pathId(path),
      path,
      baseValue: clone(before ?? null),
      mineValue: clone(after ?? null),
      ...info,
    });
  };
  walk(base, mine, []);
  return changes;
}

export function valueAt(source: unknown, path: PathSegment[]) {
  let value: any = source;
  for (const part of path) {
    if (part.type === 'field') value = value?.[part.key];
    else if (Array.isArray(value))
      value = value.find((entry) => String(entry?.[part.field] || '') === part.value);
    else return undefined;
  }
  return value;
}

function parentAt(source: any, path: PathSegment[]) {
  let value = source;
  for (const part of path.slice(0, -1)) {
    if (part.type === 'field') {
      if (!plain(value[part.key]) && !Array.isArray(value[part.key])) value[part.key] = {};
      value = value[part.key];
    } else {
      if (!Array.isArray(value)) throw Error('Invalid keyed draft path');
      let next = value.find((entry) => String(entry?.[part.field] || '') === part.value);
      if (!next) {
        next = { [part.field]: part.value };
        value.push(next);
      }
      value = next;
    }
  }
  return { value, last: path.at(-1) };
}

export function applyWorkflowChanges(source: unknown, changes: WorkflowChange[]) {
  let result: any = clone(source ?? {});
  for (const change of changes) {
    if (!change.path.length) {
      result = clone(change.mineValue);
      continue;
    }
    const { value, last } = parentAt(result, change.path);
    if (!last) continue;
    if (last.type === 'field') {
      if (change.mineValue === null && change.baseValue !== null) delete value[last.key];
      else value[last.key] = clone(change.mineValue);
    } else {
      if (!Array.isArray(value)) throw Error('Invalid keyed draft path');
      const index = value.findIndex(
        (entry) => String(entry?.[last.field] || '') === last.value,
      );
      if (change.mineValue === null) {
        if (index >= 0) value.splice(index, 1);
      } else if (index >= 0) value[index] = clone(change.mineValue);
      else value.push(clone(change.mineValue));
    }
  }
  return result;
}

const prefix = (a: PathSegment[], b: PathSegment[]) =>
  a.length <= b.length && a.every((part, index) => same(part, b[index]));
export const changesOverlap = (a: WorkflowChange, b: WorkflowChange) =>
  prefix(a.path, b.path) || prefix(b.path, a.path);

export function activeWorkflowSnapshot(
  values: Record<string, string>,
  kind: WorkflowKind,
  scope: string,
) {
  if (kind === 'process') {
    const [category, line] = scope.split('|');
    const versions = JSON.parse(values.approvalVersions || '[]');
    const active = versions
      .filter(
        (version: any) =>
          version.category === category &&
          version.line === line &&
          ['approved', 'superseded'].includes(version.status),
      )
      .sort((a: any, b: any) => (b.number || 0) - (a.number || 0))[0];
    if (active?.stages) return clone(active.stages);
    try {
      return clone(JSON.parse(values[`processEditor:${category}:${line}`] || '{}').stages || {});
    } catch {
      return {};
    }
  }
  if (kind === 'bom') {
    try {
      return clone(JSON.parse(values.bomOverrides || '{}'));
    } catch {
      return {};
    }
  }
  try {
    const control = JSON.parse(values.masterDataControl || '{}');
    return clone(control.active?.[scope] || (scope === 'PROCESS' ? JSON.parse(values.processMasterData || '{}') : {}));
  } catch {
    return {};
  }
}

export function analyzeWorkflowDraft(
  values: Record<string, string>,
  store: WorkflowStore,
  draft: WorkflowDraft,
) {
  const current = activeWorkflowSnapshot(values, draft.kind, draft.scope);
  const changes = workflowChanges(draft.base, draft.payload, draft.kind, draft.scope);
  const pending = store.cases.filter(
    (item) =>
      item.status === 'pending' &&
      item.kind === draft.kind &&
      item.scope === draft.scope &&
      item.ownerId !== draft.ownerId &&
      item.changes.some((theirs) => changes.some((mine) => changesOverlap(mine, theirs))),
  );
  const waiting = changes.flatMap((change) =>
    pending.flatMap((entry) =>
      entry.changes
        .filter((theirs) => changesOverlap(change, theirs))
        .map((theirs) => ({
          type: 'waiting' as const,
          id: `${entry.id}:${change.id}`,
          caseId: entry.id,
          label: change.label,
          location: change.location,
          mineValue: change.mineValue,
          pendingValue: theirs.mineValue,
          pendingOwnerName: entry.ownerName,
        })),
    ),
  );
  const conflicts = changes.flatMap((change) => {
    const currentValue = clone(valueAt(current, change.path) ?? null);
    if (same(currentValue, change.baseValue) || same(currentValue, change.mineValue)) return [];
    const resolution = draft.resolutions?.[change.id];
    const resolved =
      resolution?.strategy === 'mine' &&
      same(resolution.currentValue, currentValue) &&
      same(resolution.mineValue, change.mineValue);
    return [
      {
        type: 'conflict' as const,
        id: change.id,
        label: change.label,
        location: change.location,
        baseValue: change.baseValue,
        currentValue,
        mineValue: change.mineValue,
        resolved,
      },
    ];
  });
  return {
    changes,
    waiting,
    conflicts,
    canSubmit:
      draft.status === 'draft' &&
      changes.length > 0 &&
      waiting.length === 0 &&
      conflicts.every((item) => item.resolved),
    current,
  };
}

export const ownWorkflowDraft = (
  store: WorkflowStore,
  ownerId: string,
  kind: WorkflowKind,
  scope: string,
) =>
  store.drafts.find(
    (draft) =>
      draft.ownerId === ownerId &&
      draft.kind === kind &&
      draft.scope === scope &&
      draft.status !== 'archived',
  );

export const workflowDraftKey = (
  ownerId: string,
  kind: WorkflowKind,
  scope: string,
) => `${ownerId}\u0000${kind}\u0000${scope}`;

export function publicDraft(draft: WorkflowDraft | undefined) {
  return draft ? clone(draft) : null;
}
