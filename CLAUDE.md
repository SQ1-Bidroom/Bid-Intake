# Bid Intake Agent

## Purpose
Process incoming bid invitations from Autodesk Construction Cloud (ACC) and create opportunities.

## APS Integration
Credentials are stored in `.env`. The `aps/` module handles all Autodesk Platform Services API calls.

### Key functions available (`aps/bids.js`):
- `listHubs()` — get the ACC account/hub ID
- `listProjects(hubId)` — list all projects (bid invitations)
- `getProjectDetails(hubId, projectId)` — name, status, dates, links
- `listProjectFolders(hubId, projectId)` — top-level doc folders
- `listFolderContents(projectId, folderId)` — drawings, specs, documents
- `getItemVersions(projectId, itemId)` — download URLs for files
- `getBidInvitationSummary(hubId, projectId)` — full summary in one call

### Typical workflow for a new bid invitation:
1. Call `listHubs()` to get the hub ID
2. Call `listProjects(hubId)` to find new/recent projects
3. Call `getBidInvitationSummary(hubId, projectId)` to get all details
4. Use the returned data to create an opportunity (name, due date, documents, links)

## Test connection
```
npm run test:aps
```
