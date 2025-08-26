# STL Shelf — Product Requirements Document (PRD) — v0.2 (MVP)

**Status:** Draft  
**Owner:** Product  
**Last updated:** 2025-08-26  

---

## 0) Table of Contents
1. Overview  
2. Goals & Non-Goals  
3. Target Users & Use Cases  
4. Technical Stack  
4.1 Setup & Configuration  
5. Functional Requirements (MVP)  
6. Extended Features (MVP+)  
7. Non-Functional Requirements  
8. Analytics & Success Metrics  
9. Roadmap & Milestones  
10. Out of Scope  
11. Architecture Diagram  

---

## 1) Overview
**What.**  
Self-hosted application for managing a personal library of 3D printable models (**STL, 3MF, OBJ**).  
The app organizes models by version, extracts metadata, and provides a lightweight 3D preview. All data lives on the filesystem, fully **Git-versioned**, with optional GitHub sync for backup/fallback.  

**Why.**  
Existing tools (e.g., Manyfold) are either too heavy, DB-dependent, or visually outdated. The goal is a **simple, elegant, versionable shelf** that lives in Git, runs in Docker, and feels modern.  

---

## 2) Goals & Non-Goals
**Goals**
- Lightweight, **filesystem-based** model library.  
- **Versioning** of models via Git (LFS for large binaries).  
- Easy **preview & browsing** in browser.  
- **Drag & drop** upload/update.  
- Metadata support (`meta.json` / `meta.yml`) for search and filtering.  
- Self-hosted via Docker, accessible in LAN.  

**Non-Goals**
- No full user management (MVP is single-user).  
- No slicing/printing queue management (not a Print Farm tool).  
- No online marketplace/sharing platform.  

---

## 3) Target Users & Use Cases
**Users**
- Makers & 3D printing enthusiasts with a growing personal library.  
- Designers needing a private, versioned archive of models.  
- Hobbyists wanting a LAN-accessible gallery of models.  

**Use Cases**
- Upload and track multiple versions of a part.  
- Browse models visually via thumbnails and 3D viewer.  
- Retrieve older versions for re-printing.  
- Store slicer metadata (time, material, weight) alongside files.  

---

## 4) Technical Stack
- **Backend:** [Hono](https://hono.dev/) + oRPC (typed API).  
- **Frontend:** [TanStack](https://tanstack.com/) (Query, Router, Table).  
- **Database:** Filesystem (models + `meta.json`).  
- **Client persistence:** TanStackDB (local cache).  
- **Versioning:** GitHub (primary) + optional secondary Git remote for fallback.  
- **Packaging:** Docker container built on **Bun** (`oven/bun:alpine`), not Node.  
  - Bun used as runtime + package manager for faster installs and lighter image.  

---

## 4.1) Setup & Configuration
**Directory binding**  
- On container start, the user mounts a **host directory** into `/data`.  
- This directory becomes the **root library** for all models.  
- Example Docker Compose:  
  ```yaml
  services:
    stl-shelf:
      image: stl-shelf:latest
      ports: ["8080:3000"]
      volumes:
        - /Users/you/3d-models:/data   # host path → container path
  ```

**Config file (optional)**  
- A `config.yml` inside `/data` stores additional preferences:  
  ```yaml
  repo_name: "My 3D Models"
  default_tags: ["draft", "PLA"]
  preview_size: 400
  git_remote: "git@github.com:user/models.git"
  ```

**Principles**
- **Separation of concerns:** all files & metadata live in mounted directory, never in container.  
- **Portability:** moving the library = moving one folder.  
- **Transparency:** user always knows where files are stored (no hidden DB).  

---

## 5) Functional Requirements (MVP)
- **File Upload & Versioning**
  - Upload via drag & drop.  
  - Each upload creates a new **version folder** (`v1, v2...`) under model directory.  
  - Old versions remain accessible.  
- **3D Preview**
  - STL/OBJ/3MF preview in browser via `react-three-fiber` + `three.js`.  
  - Orbit controls, grid helper.  
- **Metadata**
  - `meta.json` per model/version: name, tags, notes, printer/material info.  
  - Auto-extract bounding box (size in mm).  
- **Indexing**
  - Background scan generates `index.json` for faster load/search.  
- **Browsing**
  - Grid/list view of models with preview thumbnails.  
  - Search/filter by name, tags.  
- **Storage**
  - All files on FS. Git LFS tracks binaries.  

---

## 6) Extended Features (MVP+)
- **Thumbnails:** Auto-generate `.png` preview at upload.  
- **Tagging System:** Free-form tags in metadata for quick filtering.  
- **Slicer Metadata Extraction:** Parse `.3mf` (Bambu Studio/PrusaSlicer) for:  
  - Layer height, material, estimated print time, weight.  
- **Diff View:** Compare metadata/dimensions between versions.  
- **Public Read-only Mode:** Share library in LAN without write access.  
- **Notes/Markdown:** Per-version notes about printing results.  
- **Export/Backup:** Zip export with models + metadata.  

---

## 7) Non-Functional Requirements
- **Performance:**  
  - Index large libraries (>1k models) under 3s.  
  - STL preview load <2s for typical 10–20MB file.  
- **Portability:** Single Docker container, minimal config.  
- **Security:** Private by default. LAN access only; optional reverse proxy with TLS + basic auth for remote.  
- **Resilience:** All data safe in Git; app should not corrupt FS.  

---

## 8) Analytics & Success Metrics
- Library load time < 3s.  
- Upload → available for browsing < 5s.  
- Git commit success rate 100% (no orphaned files).  
- User satisfaction measured by simplicity: “faster and easier than file explorer.”  

---

## 9) Roadmap & Milestones
**Milestone 1 — MVP (4–6 weeks)**  
- File upload (drag & drop).  
- Git versioning (commit on upload).  
- Metadata (`meta.json`), bounding box calc.  
- Preview 3D viewer.  
- Search/filter (basic).  
- Docker packaging with Bun.  

**Milestone 2 — MVP+ (6–10 weeks)**  
- Thumbnail generation.  
- Tagging system.  
- Slicer metadata extraction.  
- Diff view of versions.  
- Read-only mode.  

**Milestone 3 — Future (Post-MVP)**  
- Multi-user access with auth.  
- Advanced visualization (overlay diff).  
- Cloud sync options (e.g., S3, R2).  

---

## 10) Out of Scope
- Print queue management / OctoPrint integration.  
- Marketplace for model sharing.  
- Real-time collaboration.  

---

## 11) Architecture Diagram

### Mermaid
```mermaid
flowchart LR
  subgraph Host[Mac mini (Host)]
    subgraph FS[/Host Filesystem/]
      M[/ /Users/you/3d-models (mounted) /]
      C[/ /Users/you/stl-shelf-config (optional) /]
    end
    subgraph Docker[Docker]
      App[STL Shelf Container\n(Hono + oRPC · Bun Runtime)]
      App ---|bind mount| M
      App ---|read config| C
    end
  end

  subgraph Client[Browser (LAN)]
    UI[Frontend (TanStack)\nViewer (three.js)]
  end

  subgraph Git[Git Remotes]
    GH[(GitHub Remote)]
    G2[(Secondary Remote · optional)]
  end

  UI <-->|HTTP :3000 (exposed as :8080)| App
  App <-.git push/pull (LFS).-> GH
  App <-.optional fallback.-> G2
```

### ASCII (portable)
```
+--------------------- Mac mini (Host) ----------------------+
|                                                            |
|  /Users/you/3d-models      /Users/you/stl-shelf-config     |
|       (mounted)                    (optional)               |
|           |                           |                     |
|           | bind-mount                | read config         |
|           v                           v                     |
|      +---------------- Docker --------------------+        |
|      |  STL Shelf Container                       |        |
|      |  - Hono + oRPC (Backend API)               |        |
|      |  - Bun runtime (server & package manager)  |        |
|      |  - Serves frontend (TanStack)              |        |
|      +------------------:3000 --------------------+        |
|                         ^                                  |
+-------------------------|----------------------------------+
                          |
                    expose as :8080 (LAN)
                          |
                    +-----v-------------------+
                    |   Browser (Client)      |
                    | - TanStack UI           |
                    | - 3D Viewer (three.js)  |
                    +-------------------------+

                     . . . Git operations . . .
                      push/pull (Git LFS)
                          /           \
                    +----v----+    +---v----+
                    | GitHub  |    | Remote |
                    |  Remote |    |  #2    |
                    +---------+    +--------+
```
