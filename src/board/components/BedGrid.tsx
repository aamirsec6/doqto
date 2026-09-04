"use client";

import type { Bed, BedStatus, WardSnapshot } from "@/lib/dashboard/types";

const STATUSES: BedStatus[] = [
  "available",
  "occupied",
  "cleaning",
  "reserved",
];

interface Props {
  ward: WardSnapshot;
  onUpdate: (
    bedId: string,
    status: BedStatus,
    patientInitials?: string,
  ) => void;
}

export function BedGrid({ ward, onUpdate }: Props) {
  const byRoom = ward.rooms.reduce<Record<string, Bed[]>>((acc, room) => {
    acc[room.id] = ward.beds.filter((b) => b.roomId === room.id);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {ward.rooms
        .filter((r) => (byRoom[r.id]?.length ?? 0) > 0)
        .map((room) => (
          <section key={room.id}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {room.label}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(byRoom[room.id] ?? []).map((bed) => (
                <BedCard
                  key={bed.id}
                  bed={bed}
                  onUpdate={(status, initials) =>
                    onUpdate(bed.id, status, initials)
                  }
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

function BedCard({
  bed,
  onUpdate,
}: {
  bed: Bed;
  onUpdate: (status: BedStatus, initials?: string) => void;
}) {
  const tone =
    bed.status === "available"
      ? "border-emerald-200 bg-emerald-50"
      : bed.status === "occupied"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-3 transition ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-900">{bed.label}</span>
        <select
          value={bed.status}
          onChange={(e) =>
            onUpdate(e.target.value as BedStatus, bed.patientInitials)
          }
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {bed.status === "occupied" && (
        <input
          className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
          placeholder="Patient initials"
          value={bed.patientInitials ?? ""}
          onChange={(e) => onUpdate("occupied", e.target.value)}
        />
      )}
    </div>
  );
}
