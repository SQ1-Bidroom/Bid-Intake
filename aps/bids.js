import { getAccessToken } from './auth.js';

const BASE = process.env.APS_BASE_URL;

async function apsGet(path) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`APS ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

// List all ACC hubs (accounts) this app has access to
export async function listHubs() {
  const data = await apsGet('/project/v1/hubs');
  return data.data.map((h) => ({ id: h.id, name: h.attributes.name, region: h.attributes.region }));
}

// List all projects in a hub
export async function listProjects(hubId) {
  const data = await apsGet(`/project/v1/hubs/${hubId}/projects`);
  return data.data.map((p) => ({
    id: p.id,
    name: p.attributes.name,
    status: p.attributes.status,
    createdAt: p.attributes.createdAt,
    updatedAt: p.attributes.updatedAt,
    links: p.links,
  }));
}

// Get full details for a single project (bid invitation)
export async function getProjectDetails(hubId, projectId) {
  const data = await apsGet(`/project/v1/hubs/${hubId}/projects/${projectId}`);
  const p = data.data;
  return {
    id: p.id,
    name: p.attributes.name,
    status: p.attributes.status,
    createdAt: p.attributes.createdAt,
    updatedAt: p.attributes.updatedAt,
    projectType: p.attributes.extension?.data?.projectType,
    links: p.links,
  };
}

// List top-level folders in a project (where drawings/docs live)
export async function listProjectFolders(hubId, projectId) {
  const data = await apsGet(`/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`);
  return data.data.map((f) => ({
    id: f.id,
    name: f.attributes.name,
    type: f.type,
  }));
}

// List contents of a folder (drawings, specs, documents)
export async function listFolderContents(projectId, folderId) {
  const data = await apsGet(`/data/v1/projects/${projectId}/folders/${folderId}/contents`);
  return data.data.map((item) => ({
    id: item.id,
    name: item.attributes.name,
    type: item.type,
    fileType: item.attributes.fileType,
    createTime: item.attributes.createTime,
    lastModifiedTime: item.attributes.lastModifiedTime,
    downloadUrl: item.attributes?.extension?.data?.downloadUrl ?? null,
  }));
}

// Get a download URL for a specific document version
export async function getItemVersions(projectId, itemId) {
  const data = await apsGet(`/data/v1/projects/${projectId}/items/${itemId}/versions`);
  return data.data.map((v) => ({
    version: v.attributes.versionNumber,
    name: v.attributes.name,
    createTime: v.attributes.createTime,
    downloadUrl: v.relationships?.storage?.meta?.link?.href ?? null,
    fileSize: v.attributes.storageSize,
  }));
}

// Convenience: get all bid invitation data for a project in one call
export async function getBidInvitationSummary(hubId, projectId) {
  const [details, folders] = await Promise.all([
    getProjectDetails(hubId, projectId),
    listProjectFolders(hubId, projectId),
  ]);

  const folderContents = await Promise.all(
    folders.map(async (f) => {
      try {
        const contents = await listFolderContents(projectId, f.id);
        return { folder: f.name, files: contents };
      } catch {
        return { folder: f.name, files: [] };
      }
    })
  );

  return {
    project: details,
    documents: folderContents,
  };
}
