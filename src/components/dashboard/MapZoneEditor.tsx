"use client";

import { useCallback, useMemo, useState } from "react";
import {
  computeCalibration,
  defaultPixelsPerMetre,
  displayToMetres,
  metresToDisplay,
  verticesToSvgPath,
} from "@/lib/map/geometry";
import type {
  LayoutZone,
  MapCalibration,
  Point,
} from "@/lib/dashboard/types";

const MAP_PAD = 28;
const CANVAS_W = 720;
const CANVAS_H = 480;

type EditorMode = "calibrate" | "draw";

interface Props {
  mode: EditorMode;
  zones: LayoutZone[];
  calibration?: MapCalibration;
  onCalibrationChange: (calibration: MapCalibration) => void;
  onZonesChange: (zones: LayoutZone[]) => void;
}

export function MapZoneEditor({
  mode,
  zones,
  calibration,
  onCalibrationChange,
  onZonesChange,
}: Props) {
  const ppm = defaultPixelsPerMetre(calibration);
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");
  const [calPoints, setCalPoints] = useState<Point[]>([]);
  const [wallMetres, setWallMetres] = useState("5");

  const drawableZones = useMemo(
    () => zones.filter((z) => z.kind !== "opd"),
    [zones],
  );

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  const updateZoneVertices = useCallback(
    (zoneId: string, verticesM: Point[]) => {
      onZonesChange(
        zones.map((z) => (z.id === zoneId ? { ...z, verticesM } : z)),
      );
    },
    [zones, onZonesChange],
  );

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const display: Point = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };

    if (mode === "calibrate") {
      if (calPoints.length >= 2) setCalPoints([display]);
      else setCalPoints((prev) => [...prev, display]);
      return;
    }

    if (!selectedZoneId) return;
    const metres = displayToMetres(display, ppm);
    const zone = zones.find((z) => z.id === selectedZoneId);
    const existing = zone?.verticesM ?? [];
    updateZoneVertices(selectedZoneId, [...existing, metres]);
  };

  const applyCalibration = () => {
    if (calPoints.length < 2) return;
    const distance = Number(wallMetres);
    if (!Number.isFinite(distance) || distance <= 0) return;
    onCalibrationChange(computeCalibration(calPoints[0]!, calPoints[1]!, distance));
    setCalPoints([]);
  };

  const useDefaultScale = () => {
    onCalibrationChange({ pixelsPerMetre: 40 });
  };

  const closePolygon = () => {
    const zone = zones.find((z) => z.id === selectedZoneId);
    if (!zone?.verticesM || zone.verticesM.length < 3) return;
    updateZoneVertices(selectedZoneId, zone.verticesM);
  };

  const clearPolygon = () => {
    if (!selectedZoneId) return;
    updateZoneVertices(selectedZoneId, []);
  };

  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const stepM = 2;
    const stepPx = stepM * ppm;
    for (let x = MAP_PAD; x < CANVAS_W; x += stepPx) {
      lines.push(
        <line
          key={`vx-${x}`}
          x1={x}
          y1={MAP_PAD}
          x2={x}
          y2={CANVAS_H - MAP_PAD}
          stroke="rgba(204,0,0,0.06)"
          strokeWidth={1}
        />,
      );
    }
    for (let y = MAP_PAD; y < CANVAS_H; y += stepPx) {
      lines.push(
        <line
          key={`hy-${y}`}
          x1={MAP_PAD}
          y1={y}
          x2={CANVAS_W - MAP_PAD}
          y2={y}
          stroke="rgba(204,0,0,0.06)"
          strokeWidth={1}
        />,
      );
    }
    return lines;
  }, [ppm]);

  return (
    <div className="space-y-4">
      {mode === "calibrate" ? (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Click two points on a wall or corridor of known length. Enter the
            real distance in metres so zone boundaries map to physical space.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-text">
              Wall length (m)
              <input
                type="number"
                min={0.5}
                step={0.1}
                value={wallMetres}
                onChange={(e) => setWallMetres(e.target.value)}
                className="mt-1 block w-28 rounded-xl border border-red/15 bg-peach-light/50 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={applyCalibration}
              disabled={calPoints.length < 2}
              className="rounded-xl bg-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Apply scale
            </button>
            <button
              type="button"
              onClick={useDefaultScale}
              className="rounded-xl border border-red/20 px-4 py-2 text-sm font-semibold text-text-muted"
            >
              Use default scale
            </button>
          </div>
          {calibration?.pixelsPerMetre && (
            <p className="text-xs text-text-muted">
              Current scale: {calibration.pixelsPerMetre.toFixed(1)} px/m
              {calibration.reference
                ? ` (from ${calibration.reference.distanceMetres} m reference)`
                : " (default)"}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Select a zone, then click the canvas to trace its boundary. Use
            irregular shapes for L-shaped wards, curved corridors, and OPD
            sub-areas.
          </p>
          <div className="flex flex-wrap gap-2">
            {drawableZones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZoneId(z.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  selectedZoneId === z.id
                    ? "border-red bg-red/5 text-text"
                    : "border-red/15 text-text-muted"
                }`}
              >
                {z.label}
                {(z.verticesM?.length ?? 0) >= 3 ? " ✓" : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={closePolygon}
              disabled={(selectedZone?.verticesM?.length ?? 0) < 3}
              className="rounded-lg border border-red/20 px-3 py-1.5 text-xs font-semibold text-text disabled:opacity-40"
            >
              Close polygon
            </button>
            <button
              type="button"
              onClick={clearPolygon}
              className="rounded-lg border border-red/15 px-3 py-1.5 text-xs font-semibold text-text-muted"
            >
              Clear zone
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-red/15 bg-peach-light/30">
        <svg
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="h-auto w-full cursor-crosshair"
          onClick={handleCanvasClick}
          role="img"
          aria-label="Floor plan editor"
        >
          <rect
            x={MAP_PAD}
            y={MAP_PAD}
            width={CANVAS_W - MAP_PAD * 2}
            height={CANVAS_H - MAP_PAD * 2}
            fill="#fff"
            stroke="rgba(204,0,0,0.15)"
          />
          {gridLines}

          {zones.map((zone) => {
            if (!zone.verticesM || zone.verticesM.length < 3) return null;
            const path = verticesToSvgPath(zone.verticesM, ppm);
            const active = zone.id === selectedZoneId;
            return (
              <path
                key={zone.id}
                d={path}
                fill={active ? "rgba(204,0,0,0.12)" : "rgba(204,0,0,0.05)"}
                stroke={active ? "#cc0000" : "rgba(204,0,0,0.35)"}
                strokeWidth={active ? 2 : 1.5}
                className="pointer-events-none"
              />
            );
          })}

          {mode === "draw" &&
            selectedZone?.verticesM?.map((v, i) => {
              const p = metresToDisplay(v, ppm);
              return (
                <circle
                  key={`${selectedZoneId}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="#cc0000"
                  className="pointer-events-none"
                />
              );
            })}

          {mode === "calibrate" &&
            calPoints.map((p, i) => (
              <circle
                key={`cal-${i}`}
                cx={p.x}
                cy={p.y}
                r={6}
                fill={i === 0 ? "#cc0000" : "#2563eb"}
                className="pointer-events-none"
              />
            ))}

          {mode === "calibrate" && calPoints.length === 2 && (
            <line
              x1={calPoints[0]!.x}
              y1={calPoints[0]!.y}
              x2={calPoints[1]!.x}
              y2={calPoints[1]!.y}
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6 4"
              className="pointer-events-none"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
