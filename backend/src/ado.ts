import { basicPatAuthHeader, httpJson } from "./http.js";
import type { AdoBug, AdoWorkItemFields } from "./types.js";

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

export async function fetchNewBugs(params: {
  adoOrg: string;
  project: string;
  pat: string;
  top: number;
  createdInLastDays: number;
  states: string[];
  areaPath?: string;
}): Promise<AdoBug[]> {
  const baseUrl = orgToBaseUrl(params.adoOrg);
  const projectPath = encodeURIComponent(params.project);

  const statesClause = params.states.length
    ? `AND [System.State] IN (${params.states.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ")})`
    : "";

  const areaClause = params.areaPath
    ? `AND [System.AreaPath] UNDER '${params.areaPath.replace(/'/g, "''")}'`
    : "";

  // Keep WIQL simple and broadly compatible.
  const wiql = {
    query: `
SELECT [System.Id]
FROM WorkItems
WHERE
  [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
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

  return itemsResp.value.map((item) => {
    const fields = item.fields;

    return {
      id: item.id,
      title: pickString(fields, "System.Title") ?? `(Bug ${item.id})`,
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
      url: item.url,
      webUrl: `${baseUrl}/${projectPath}/_workitems/edit/${item.id}`
    } satisfies AdoBug;
  });
}

export async function fetchBugById(params: {
  adoOrg: string;
  project: string;
  pat: string;
  id: number;
}): Promise<AdoBug | null> {
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
  const fields = item.fields;

  return {
    id: item.id,
    title: pickString(fields, "System.Title") ?? `(Bug ${item.id})`,
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
    url: item.url,
    webUrl: `${baseUrl}/${projectPath}/_workitems/edit/${item.id}`
  } satisfies AdoBug;
}
