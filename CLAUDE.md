# Bid Intake Agent

## Purpose
Process incoming bid invitations from Autodesk Construction Cloud (ACC) and create opportunities in Dynamics 365.

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

## Full Bid Intake Workflow

When processing a new bid invitation, follow these steps in order:

### Step 1 — Find the bid invitation
- Check flagged emails in Outlook for new bid invitations from BuildingConnected / ACC
- Extract the project name and any project ID or link from the email

### Step 2 — Pull ACC data via APS
Run the following (requires Node.js and `.env` with APS credentials):
```js
import { getBidInvitationSummary, listHubs, listProjects } from './aps/bids.js';

const hubs = await listHubs();
const hubId = hubs[0].id;                          // SQ1's ACC hub
const projects = await listProjects(hubId);         // find the matching project
const summary = await getBidInvitationSummary(hubId, projectId);
```

The summary contains:
- `summary.project.name` — project/bid name
- `summary.project.createdAt` / `updatedAt` — invitation dates
- `summary.project.links` — direct ACC links
- `summary.documents` — array of folders with files (drawings, specs, etc.)

### Step 3 — Create the opportunity in Dynamics 365
Use the D365 MCP connector to create the opportunity. Required fields:
- **Name**: project name from ACC
- **Owner**: always set to Mike (enforced by sq1-core rules)
- **Bid Due Date**: from the ACC project or email
- **Description**: include ACC project link and document summary
- **Source**: BuildingConnected / ACC

Before creating, search D365 for an existing opportunity with the same name to avoid duplicates (enforced by sq1-core dedup guard).

### Step 4 — File documents in SharePoint
Use the SharePoint MCP connector to:
- Create a job folder if one does not exist
- Upload or link drawings and specs pulled from ACC

### Step 5 — Definition of done
- [ ] Opportunity created in D365 with correct owner (Mike), due date, and ACC link
- [ ] No duplicate opportunity exists
- [ ] Key documents linked or filed in SharePoint
- [ ] Original email marked as processed
