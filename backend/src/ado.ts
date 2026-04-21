import { basicPatAuthHeader, httpJson } from "./http.js";
import type { AdoWorkItem, AdoWorkItemFields, WorkItemCategory } from "./types.js";

type WiqlResponse = {
  workItems: Array<{ id: number; url: string }>;
};

type WorkItemsResponse = {
  value: Array<{
    id: number;
    url: string;
    fields?: AdoWorkItemFields;
  }>;
};

const WORK_ITEM_TYPES_BY_CATEGORY: Record<WorkItemCategory, string[]> = {
  bugs: ["Bug", "Defect"],
  "user-stories": ["User Story"],
};

function escapeWiqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function buildWiqlList(values: string[]): string {
  return values.map((value) => `'${escapeWiqlString(value)}'`).join(", ");
}

function orgToBaseUrl(adoOrg: string): string {
  const trimmed = adoOrg.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://dev.azure.com/${trimmed}`;
}

function pickString(fields: AdoWorkItemFields | undefined, key: string): string | undefined {
  const v = fields?.[key];
  return typeof v === "string" ? v : undefined;
}

function pickIdentity(fields: AdoWorkItemFields | undefined, key: string): string | undefined {
  const v = fields?.[key];
  if (!v || typeof v !== "object") return undefined;
  const displayName = (v as Record<string, unknown>)["displayName"];
  return typeof displayName === "string" ? displayName : undefined;
}

function getCategoryForWorkItemType(workItemType: string | undefined): WorkItemCategory | null {
  if (!workItemType) {
    return null;
  }

  if (WORK_ITEM_TYPES_BY_CATEGORY.bugs.includes(workItemType)) {
    return "bugs";
  }

  if (WORK_ITEM_TYPES_BY_CATEGORY["user-stories"].includes(workItemType)) {
    return "user-stories";
  }

  return null;
}

function mapWorkItem(item: { id: number; url: string; fields?: AdoWorkItemFields }, baseUrl: string, projectPath: string): AdoWorkItem {
  const fields = item.fields;
  const workItemType = pickString(fields, "System.WorkItemType") ?? "Unknown";
  const category = getCategoryForWorkItemType(workItemType) ?? "bugs";

  return {
    id: item.id,
    category,
    workItemType,
    title: pickString(fields, "System.Title") ?? `(${workItemType} ${item.id})`,
    state: pickString(fields, "System.State"),
    createdDate: pickString(fields, "System.CreatedDate"),
    assignedTo: pickIdentity(fields, "System.AssignedTo"),
    areaPath: pickString(fields, "System.AreaPath"),
    iterationPath: pickString(fields, "System.IterationPath"),
    tags: pickString(fields, "System.Tags"),
    description: pickString(fields, "System.Description"),
    reproSteps:
      pickString(fields, "Microsoft.VSTS.TCM.ReproSteps") ??
      pickString(fields, "Microsoft.VSTS.TCM.SystemInfo"),
    acceptanceCriteria: pickString(fields, "Microsoft.VSTS.Common.AcceptanceCriteria"),
    url: item.url,
    webUrl: `${baseUrl}/${projectPath}/_workitems/edit/${item.id}`,
  } satisfies AdoWorkItem;
}

export async function fetchNewWorkItems(params: {
  adoOrg: string;
  project: string;
  pat: string;
  category: WorkItemCategory;
  top: number;
  createdInLastDays: number;
  states: string[];
  areaPath?: string;
}): Promise<AdoWorkItem[]> {
  const baseUrl = orgToBaseUrl(params.adoOrg);
  const projectPath = encodeURIComponent(params.project);
  const workItemTypes = WORK_ITEM_TYPES_BY_CATEGORY[params.category];

  const statesClause = params.states.length
    ? `AND [System.State] IN (${buildWiqlList(params.states)})`
    : "";

  const workItemTypeClause = workItemTypes.length
    ? `AND [System.WorkItemType] IN (${buildWiqlList(workItemTypes)})`
    : "";

  const areaClause = params.areaPath
    ? `AND [System.AreaPath] UNDER '${escapeWiqlString(params.areaPath)}'`
    : "";

  // Keep WIQL simple and broadly compatible.
  const wiql = {
    query: `
SELECT [System.Id]
FROM WorkItems
WHERE
  [System.TeamProject] = @project
  ${workItemTypeClause}
  AND [System.CreatedDate] >= @Today - ${Math.max(0, params.createdInLastDays)}
  ${statesClause}
  ${areaClause}
ORDER BY [System.CreatedDate] DESC`
  };

  const wiqlUrl = `${baseUrl}/${encodeURIComponent(
    params.project
  )}/_apis/wit/wiql?api-version=7.0`;

  const auth = basicPatAuthHeader(params.pat);
  const wiqlResp = await httpJson<WiqlResponse>(wiqlUrl, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(wiql)
  });

  const ids = wiqlResp.workItems.slice(0, Math.max(0, params.top)).map((w) => w.id);
  if (ids.length === 0) return [];

  const workItemsUrl = `${baseUrl}/_apis/wit/workitems?ids=${ids.join(",")}&$expand=fields&api-version=7.0`;
  const itemsResp = await httpJson<WorkItemsResponse>(workItemsUrl, {
    headers: {
      Authorization: auth
    }
  });

  return itemsResp.value
    .map((item) => mapWorkItem(item, baseUrl, projectPath))
    .filter((item) => item.category === params.category);
}

export async function fetchWorkItemById(params: {
  adoOrg: string;
  project: string;
  pat: string;
  id: number;
  category?: WorkItemCategory;
}): Promise<AdoWorkItem | null> {
  const baseUrl = orgToBaseUrl(params.adoOrg);
  const projectPath = encodeURIComponent(params.project);
  const auth = basicPatAuthHeader(params.pat);

  const workItemUrl = `${baseUrl}/_apis/wit/workitems?ids=${params.id}&$expand=fields&api-version=7.0`;
  const itemsResp = await httpJson<WorkItemsResponse>(workItemUrl, {
    headers: {
      Authorization: auth
    }
  });

  const item = itemsResp.value[0];
  if (!item) return null;
  const workItem = mapWorkItem(item, baseUrl, projectPath);

  if (params.category && workItem.category !== params.category) {
    return null;
  }

  return workItem;
}
