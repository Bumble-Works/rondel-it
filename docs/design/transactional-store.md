# Isolated transactional snapshot store

This module is an unconnected primitive. It does not migrate data, run at startup,
replace a backup or enforce folder-sync coordination. No production importer is
added. Existing localStorage remains the live app's authority.

`openSnapshotStore(name)` explicitly opens a version 1 database with the
`snapshots` object store. `initialize(snapshot)` refuses existing state;
`read()` never initializes missing state. Absent, corrupt and unknown-schema
states have distinct error codes. Supplied Snapshot records are preserved; this
module checks storage containers, not backup/domain-record validity. Its caller
must validate untrusted input using the approved validator before initialization.

`update({revision, epoch}, synchronousTransform, checkpoint?)` reads and checks
both fences inside its readwrite transaction. It does not retry stale commands.
A checkpoint retains the old generation, advances epoch, and sets a hold that
ordinary edits preserve. Every update advances revision. All three records are
written atomically; results resolve only on transaction completion. Aborts reject,
including when earlier requests succeeded. Transform data and returned data are
detached. Transactions do not await network, files or prompts. Checkpoint is a
low-level testable primitive, not a callable production Restore feature.

The browser owns durability and disk quota. This implementation uses normal
IndexedDB transactions and does not claim power-loss flush guarantees. Quota or
request failure aborts the transaction; there are no compensating writes. Retain
one predecessor only. Browser disk allocation can exceed serialized payload size.

## Amended startup authority state table (design only)

An external localStorage marker must distinguish migration intent from committed
IndexedDB authority. The database and marker cannot share a transaction. Marker
states include a unique migration ID; its matching ID must be in the eventual
migration control envelope. The isolated store here has no migration marker or
activation logic yet; that envelope extension requires its own schema review.

| External marker | Database | Next integration behavior |
| --- | --- | --- |
| Absent | Absent | Eligible for first migration only after upgrade/exclusivity preconditions; read stable legacy data |
| Absent | Present | Unexpected authority: block automatic import and require recovery investigation |
| Intent | Absent, inaccessible or corrupt | Recovery required; never auto-reimport legacy keys; explicit recovery may export legacy data labelled possibly stale |
| Intent | Valid, matching migration ID | Resume marker finalization only; do not reimport or mount writers yet |
| Authority | Valid, matching migration ID | Load new store; never fall back to legacy data |
| Authority | Absent, inaccessible, corrupt or mismatched | Recovery required; do not revive legacy data |
| Unknown/corrupt marker | Any | Fail closed and preserve evidence |

Proposed migration order: acquire upgrade coordination, verify stable legacy data,
write/read-back Intent marker, initialize database transaction with matching ID,
then write/read-back Authority marker. Only then mount app/reminder writers.
If Intent cannot be written, do not initialize the database. If final marker write
fails, leave Intent and the database intact and keep writes blocked. A crash after
Intent but before database commit is deliberately a recovery state, not automatic
retry; there is no safe assumption that a missing DB has never been authoritative.
Retain legacy source keys for explicit export/recovery; never dual-write them.
Whole-profile clearing can remove both marker and DB and is outside this guarantee.

## Coordination and stale commands (design only)

| Situation | Required behavior before activation |
| --- | --- |
| Other participating tab/window edits | IndexedDB serializes writes; expected revision/epoch checked in transaction rejects stale command |
| Old reminder action after checkpoint | Original epoch must be supplied; reject even if task ID still exists; never refresh fence automatically |
| Sync is running/queued | Shared operations coordinator drains external I/O before restore; timeout blocks restore |
| Restored generation/normal edit/restart | Persistent hold prevents all sync imports/uploads; ordinary edits cannot clear it |
| Old uncooperative tab | Web Locks cannot exclude or reliably discover it. Close/restart browser into updated code before migration; observed legacy writes block cutover but silence proves nothing |
| Desktop upgrade | Quit older app processes and coordinate all windows through a verified common/native instance lock; unsupported coordination disables restore |
| Old devices still using remote folder | Local restore must stay detached; separate explicit re-enrolment, never automatic reconnection |

All future command paths (adapters, recurrence, reminder windows and sync) must
carry original expected epoch and any required revision into a common transactional
mutation helper. Notifications refresh views but do not provide correctness.
This primitive deliberately does not implement the external lock or hold checks
for folder I/O; therefore it must not yet be wired into restore/startup.

## Verification boundaries

Unit tests cover pure envelope checks, stale fences, detached transform inputs,
checkpoint retention, null settings and hold preservation. Browser CI tests use
real IndexedDB with two independent connections, reopen, injected quota failure,
unknown/corrupt envelopes, and transaction abort after successful requests at each
record write. Run them in the existing Chromium/WebKit CI projects. No mock test
can prove browser transaction semantics. Actual disk-full/eviction, process kill
at commit, strict durability capabilities, and native Mac/Windows multi-window
coordination remain live integration gates. Initialization and update request
success must never be treated as transaction success.

Subsequent scopes: migration authority/barrier and all-reader/writer cutover;
sync coordinator/hold enforcement; restore engine; then explicit confirmation
and previous-generation recovery UI. No mixed-authority or enabled Restore build
may ship between these gates.
