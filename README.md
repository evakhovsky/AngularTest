# Genealogy Tree

A genealogy editor with a lazy-loaded database tree and a separate cached tree for staging edits, additions, and descendant deletions before applying them.

## Requirements

- .NET 8 SDK
- Node.js 20.19 or newer and npm

No SQL Server, LocalDB, Docker, or pre-existing database is required. The API creates a local SQLite database and seeds sample data on its first run.

## Run the application

Clone the repository, then use two terminals from the repository root.

**Terminal 1 — API and database**

```bash
cd Genealogy/Genealogy
dotnet run --launch-profile http
```

The API listens at `http://localhost:5064`. On first startup it creates `Genealogy/Genealogy/App_Data/genealogy.db`, creates the schema, and inserts 18 sample records with up to six generations. It also snapshots those records for the Reset action. The database file is local and Git-ignored.

**Terminal 2 — Angular UI**

```bash
cd localcache-app
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200). Angular proxies `/api` requests to the API at port 5064.

To restore the sample genealogy after testing, use **Reset to original** in the Cached Tree View. To start over manually, stop the API and delete `Genealogy/Genealogy/App_Data/genealogy.db`; the next API start creates a fresh database and sample.

## Database schema

The `Genealogy` table stores `RecordID` (integer primary key), `ParentID` (string), `Name`, `BirthYear`, `GenerationTitle`, and `IsDeleted`. A root record uses parent ID `"0"`; otherwise `ParentID` contains the parent's record ID. The hierarchy is queried as needed, so expanding a tree node requests only its direct children.

`GenealogyBaseline` stores the original records used by Reset. It is populated once when the local database is first initialized and is not changed when edits are applied.

## Implementation notes

- Changes are staged in the browser and submitted as one API batch.
- The API applies each batch transactionally. New records receive server IDs, which are returned to the UI.
- Deleting a record marks that record and all its descendants as deleted; rows are retained rather than physically removed.
- Reset restores the baseline snapshot.
- The API uses EF Core with SQLite. The database is a per-checkout file under `Genealogy/Genealogy/App_Data`, so reviewers each get an independent, reproducible sample database.

## Project layout

- `Genealogy/Genealogy` — ASP.NET Core API, EF Core data model, and SQLite initialization/seeding.
- `localcache-app` — Angular UI.
