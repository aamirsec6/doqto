"use client";

import { useEffect, useState } from "react";
import type {
  AlertSeverity,
  AssetStatus,
  BedStatus,
  Focus,
  StaffStatus,
  WardSnapshot,
} from "@/lib/dashboard/types";
import { BED_STATUSES, alertAgeMin } from "@/lib/dashboard/layout";
import {
  assetLabel,
  bedLabel,
  staffLabel,
} from "@/lib/dashboard/status";

interface Actions {
  onSetBed: (bedId: string, status: BedStatus, initials?: string) => void;
  onSetStaff: (staffId: string, status: StaffStatus, roomId?: string) => void;
  onSetAsset: (assetId: string, status: AssetStatus, roomId?: string) => void;
  onAckAlert: (alertId: string) => void;
  onRaiseAlert: (input: {
    severity: AlertSeverity;
    title: string;
    detail: string;
    roomId: string;
  }) => void;
  onRaiseEmergency: (roomId: string) => void;
}

interface Props {
  ward: WardSnapshot;
  focus: Focus;
  onClear: () => void;
  actions: Actions;
  now?: number;
}

const btn =
  "rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ops-muted)] transition hover:border-sky-400/40 hover:text-sky-300 active:scale-[0.98]";
const btnActive =
  "rounded-md border border-sky-400/40 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300";
const btnPrimary =
  "rounded-md border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-[#f04343] transition hover:bg-red-500/30 active:scale-[0.98]";

export function LiveInspector({
  ward,
  focus,
  onClear,
  actions,
  now = Date.now(),
}: Props) {
  const [initials, setInitials] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDetail, setAlertDetail] = useState("");
  const [alertSeverity, setAlertSeverity] =
    useState<AlertSeverity>("urgent");
  const [flash, setFlash] = useState("");

  const focusKey = focus.type === "none" ? "none" : `${focus.type}:${focus.id}`;

  useEffect(() => {
    if (focus.type === "bed") {
      const bed = ward.beds.find((b) => b.id === focus.id);
      setInitials(bed?.patientInitials ?? "");
    } else {
      setInitials("");
    }
    setFlash("");
    // Only reset local form when the selected entity changes
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1600);
  };

  if (focus.type === "none") {
    const bedsReady = ward.beds.filter((b) => b.status === "available").length;
    const onFloor = ward.staff.filter((s) => s.status !== "off-floor").length;
    return (
      <section className="ops-panel p-4">
        <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
          Ward summary
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div>
            <dt className="text-[var(--ops-muted)]">Beds ready</dt>
            <dd className="font-semibold text-emerald-300">{bedsReady}</dd>
          </div>
          <div>
            <dt className="text-[var(--ops-muted)]">Staff on floor</dt>
            <dd className="font-semibold text-[var(--ops-text)]">{onFloor}</dd>
          </div>
          <div>
            <dt className="text-[var(--ops-muted)]">Zones</dt>
            <dd className="font-semibold text-[var(--ops-text)]">{ward.rooms.length}</dd>
          </div>
          <div>
            <dt className="text-[var(--ops-muted)]">Assets tracked</dt>
            <dd className="font-semibold text-[var(--ops-text)]">{ward.assets.length}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-[var(--ops-muted)]">
          Tap a <span className="text-sky-300">zone</span>,{" "}
          <span className="text-sky-300">bed</span>, or{" "}
          <span className="text-sky-300">person</span> on the map to update live.
        </p>
      </section>
    );
  }

  if (focus.type === "bed") {
    const bed = ward.beds.find((b) => b.id === focus.id);
    if (!bed) {
      return <Missing onClear={onClear} label="Bed not found" />;
    }
    const zone = ward.rooms.find((r) => r.id === bed.roomId);
    const zoneBeds = ward.beds.filter((b) => b.roomId === bed.roomId);
    const zoneOcc = zoneBeds.filter((b) => b.status === "occupied").length;

    return (
      <section className="ops-panel p-4">
        <Header title={`Bed ${bed.label}`} onClear={onClear} flash={flash} />
        <ExactRow
          items={[
            ["Zone", zone?.label ?? bed.roomId],
            ["Status", bedLabel[bed.status]],
            ["Patient", bed.patientInitials ?? "—"],
            ["Zone beds", `${zoneOcc}/${zoneBeds.length} occupied`],
          ]}
        />
        <p className="mt-3 text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
          Set bed status
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {BED_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={bed.status === status ? btnActive : btn}
              onClick={() => {
                actions.onSetBed(
                  bed.id,
                  status,
                  status === "occupied"
                    ? initials || bed.patientInitials || "PT"
                    : undefined,
                );
                showFlash(`Bed ${bed.label} → ${bedLabel[status]}`);
              }}
            >
              {bedLabel[status]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={initials}
            onChange={(e) =>
              setInitials(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 3))
            }
            placeholder="Initials"
            maxLength={3}
            className="w-24 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] uppercase text-[var(--ops-text)] outline-none focus:border-sky-400/50"
          />
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              const value = (initials || "PT").slice(0, 3).toUpperCase();
              setInitials(value);
              actions.onSetBed(bed.id, "occupied", value);
              showFlash(`Occupied as ${value}`);
            }}
          >
            Admit / occupy
          </button>
        </div>
      </section>
    );
  }

  if (focus.type === "staff") {
    const person = ward.staff.find((s) => s.id === focus.id);
    if (!person) {
      return <Missing onClear={onClear} label="Staff not found" />;
    }
    const zone = ward.rooms.find((r) => r.id === person.roomId);
    const statuses: StaffStatus[] = ["free", "busy", "responding", "off-floor"];
    const freeCount = ward.staff.filter((s) => s.status === "free").length;

    return (
      <section className="ops-panel p-4">
        <Header title={person.name} onClear={onClear} flash={flash} />
        <ExactRow
          items={[
            ["Role", person.role],
            ["Status", staffLabel[person.status]],
            ["Zone", zone?.label ?? person.roomId],
            ["Ward free staff", String(freeCount)],
          ]}
        />
        <p className="mt-3 text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
          Set status
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              className={person.status === status ? btnActive : btn}
              onClick={() => {
                actions.onSetStaff(person.id, status);
                showFlash(`${person.name} → ${staffLabel[status]}`);
              }}
            >
              {staffLabel[status]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
          Move to zone
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ward.rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={person.roomId === room.id ? btnActive : btn}
              onClick={() => {
                actions.onSetStaff(person.id, person.status, room.id);
                showFlash(`${person.name} → ${room.label}`);
              }}
            >
              {room.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (focus.type === "asset") {
    const asset = ward.assets.find((a) => a.id === focus.id);
    if (!asset) {
      return <Missing onClear={onClear} label="Asset not found" />;
    }
    const zone = ward.rooms.find((r) => r.id === asset.roomId);
    const statuses: AssetStatus[] = ["available", "in-use", "missing"];

    return (
      <section className="ops-panel p-4">
        <Header title={asset.name} onClear={onClear} flash={flash} />
        <ExactRow
          items={[
            ["Type", asset.kind],
            ["Status", assetLabel[asset.status]],
            ["Last seen", `${zone?.label ?? asset.roomId}, ${asset.lastSeenMin ?? 0}m ago`],
            [
              "Missing on ward",
              String(ward.assets.filter((a) => a.status === "missing").length),
            ],
          ]}
        />
        <p className="mt-2 text-[11px] text-[var(--ops-muted)]">
          RFID last-known location — not a live GPS position.
        </p>
        <p className="mt-3 text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
          Set status
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              className={asset.status === status ? btnActive : btn}
              onClick={() => {
                actions.onSetAsset(asset.id, status);
                showFlash(`${asset.name} → ${assetLabel[status]}`);
              }}
            >
              {assetLabel[status]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
          Locate in zone
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ward.rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={asset.roomId === room.id ? btnActive : btn}
              onClick={() => {
                actions.onSetAsset(asset.id, asset.status, room.id);
                showFlash(`${asset.name} @ ${room.label}`);
              }}
            >
              {room.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (focus.type === "alert") {
    const alert = ward.alerts.find((a) => a.id === focus.id);
    if (!alert) {
      return <Missing onClear={onClear} label="Alert not found" />;
    }
    const zone = ward.rooms.find((r) => r.id === alert.roomId);
    const age = alertAgeMin(alert.raisedAt, now);
    const statusText = alert.acknowledged
      ? alert.dispatched
        ? `${alert.dispatched.staffName} is responding`
        : "Acknowledged"
      : alert.dispatched
        ? "Dispatched"
        : "Open";

    return (
      <section className="ops-panel p-4">
        <Header title={alert.title} onClear={onClear} flash={flash} />
        <ExactRow
          items={[
            ["Severity", alert.severity],
            ["Zone", zone?.label ?? alert.roomId],
            ["Age", `${age}m`],
            ["Status", statusText],
          ]}
        />
        <p className="mt-3 text-[12px] text-[var(--ops-muted)]">{alert.detail}</p>
        {alert.dispatched && (
          <p className="mt-2 text-[12px] text-slate-200">
            {alert.acknowledged
              ? `${alert.dispatched.staffName} is responding`
              : `Dispatched: ${alert.dispatched.staffName} (${alert.dispatched.staffRole})`}
          </p>
        )}
        {alert.nearestAssets && alert.nearestAssets.length > 0 && (
          <ul className="mt-2 space-y-1">
            {alert.nearestAssets.map((asset) => {
              const label =
                ward.rooms.find((r) => r.id === asset.roomId)?.label ??
                asset.roomId;
              return (
                <li key={asset.assetId} className="text-[11px] text-[var(--ops-muted)]">
                  {asset.name} → {label}, {asset.lastSeenMin}m ago
                </li>
              );
            })}
          </ul>
        )}
        {!alert.acknowledged ? (
          <button
            type="button"
            className={`${btnPrimary} mt-3`}
            onClick={() => {
              actions.onAckAlert(alert.id);
              showFlash(
                alert.dispatched
                  ? `${alert.dispatched.staffName} is responding`
                  : "Alert acknowledged",
              );
            }}
          >
            {alert.dispatched
              ? `Confirm ${alert.dispatched.staffName} responding`
              : "Acknowledge now"}
          </button>
        ) : (
          <p className="mt-3 text-[11px] text-emerald-300/90">
            Confirmed at{" "}
            {alert.acknowledgedAt
              ? new Date(alert.acknowledgedAt).toLocaleTimeString("en-IN")
              : "—"}
          </p>
        )}
      </section>
    );
  }

  const room = ward.rooms.find((r) => r.id === focus.id);
  if (!room) {
    return <Missing onClear={onClear} label="Zone not found" />;
  }

  const beds = ward.beds.filter((b) => b.roomId === room.id);
  const people = ward.staff.filter(
    (s) => s.roomId === room.id && s.status !== "off-floor",
  );
  const assetsHere = ward.assets.filter((a) => a.roomId === room.id);
  const occupied = beds.filter((b) => b.status === "occupied").length;

  return (
    <section className="ops-panel p-4">
      <Header title={room.label} onClear={onClear} flash={flash} />
      <ExactRow
        items={[
          ["Type", room.kind],
          ["Beds", `${occupied}/${beds.length} occupied`],
          ["People here", String(people.length)],
          ["Assets here", String(assetsHere.length)],
        ]}
      />

      {beds.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
            Beds in zone
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {beds.map((b) => (
              <span
                key={b.id}
                className="rounded border border-white/10 px-2 py-1 text-[10px] text-[var(--ops-text)]"
              >
                {b.label}: {bedLabel[b.status]}
                {b.patientInitials ? ` (${b.patientInitials})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
        Emergency · Scenario 1
      </p>
      <button
        type="button"
        className={`${btnPrimary} mt-1.5 w-full sm:w-auto`}
        onClick={() => {
          actions.onRaiseEmergency(room.id);
          showFlash("Code Blue raised · nearest responder dispatched");
        }}
      >
        Raise Code Blue — dispatch nearest help
      </button>

      <p className="mt-4 text-[10px] font-semibold tracking-wider text-[var(--ops-muted)] uppercase">
        Raise other alert
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {(["critical", "urgent", "info"] as AlertSeverity[]).map((s) => (
          <button
            key={s}
            type="button"
            className={alertSeverity === s ? btnActive : btn}
            onClick={() => setAlertSeverity(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <input
        className="mt-3 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-[var(--ops-text)] outline-none focus:border-sky-400/50"
        placeholder="Alert title (required)"
        value={alertTitle}
        onChange={(e) => setAlertTitle(e.target.value)}
      />
      <input
        className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-[var(--ops-text)] outline-none focus:border-sky-400/50"
        placeholder="Detail / context"
        value={alertDetail}
        onChange={(e) => setAlertDetail(e.target.value)}
      />
      <button
        type="button"
        className={`${btnPrimary} mt-3 disabled:opacity-40`}
        disabled={!alertTitle.trim()}
        onClick={() => {
          const title = alertTitle.trim();
          if (!title) return;
          actions.onRaiseAlert({
            severity: alertSeverity,
            title,
            detail: alertDetail.trim() || `Raised from ${room.label}`,
            roomId: room.id,
          });
          setAlertTitle("");
          setAlertDetail("");
          showFlash(`${alertSeverity} alert raised`);
        }}
      >
        Raise {alertSeverity} alert
      </button>
    </section>
  );
}

function ExactRow({
  items,
}: {
  items: [string, string][];
}) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div
          key={k}
          className="rounded-lg border border-white/5 bg-black/25 px-2.5 py-2"
        >
          <dt className="text-[9px] tracking-wider text-[var(--ops-muted)] uppercase">
            {k}
          </dt>
          <dd className="mt-0.5 truncate text-[12px] font-semibold text-[var(--ops-text)]">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Header({
  title,
  onClear,
  flash,
}: {
  title: string;
  onClear: () => void;
  flash?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="ops-panel-title">Live update</p>
        <p className="mt-1 font-display text-base font-semibold text-[var(--ops-text)]">
          {title}
        </p>
        {flash ? (
          <p className="mt-1 text-[11px] font-medium text-emerald-300">{flash}</p>
        ) : null}
      </div>
      <button type="button" className={btn} onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

function Missing({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <section className="ops-panel px-4 py-3">
      <p className="text-[12px] text-[#f04343]">{label}</p>
      <button type="button" className={`${btn} mt-2`} onClick={onClear}>
        Clear focus
      </button>
    </section>
  );
}
