import type { RoleCategory } from "@/lib/dashboard/roles";

export type MessageKind =
  | "text"
  | "quick_reply"
  | "system"
  | "ack"
  | "code_raise"
  | "concern";

export type ChannelKind =
  | "broadcast"
  | "unit"
  | "role"
  | "incident"
  | "staff";

export type MessagePriority = "normal" | "urgent" | "critical";

export interface IntercomMessage {
  id: string;
  channelId: string;
  channelKind: ChannelKind;
  body: string;
  kind: MessageKind;
  authorId: string;
  authorName: string;
  authorRole: string;
  incidentId?: string;
  targetStaffId?: string;
  targetRole?: RoleCategory;
  createdAt: string;
  priority: MessagePriority;
}

export interface IntercomChannel {
  id: string;
  kind: ChannelKind;
  label: string;
  /** For role channels */
  roleCategory?: RoleCategory;
  unitId?: string;
  incidentId?: string;
  staffId?: string;
}

export const MESSAGES_STORAGE_KEY = "doqto.hospital.messages.v1";
export const MESSAGES_UPDATED_EVENT = "doqto-messages-updated";
export const PRESENCE_STORAGE_KEY = "doqto.hospital.presence.v1";

export const QUICK_REPLIES = [
  { id: "coming", label: "I'm coming", body: "I'm coming", ack: true },
  { id: "eta2", label: "ETA 2 min", body: "ETA 2 minutes", ack: true },
  { id: "cart", label: "Need crash cart", body: "Need crash cart at location", ack: false },
  { id: "scene", label: "On scene", body: "On scene", ack: true },
] as const;

export function channelIdBroadcast() {
  return "ch-broadcast";
}

export function channelIdUnit(unitId: string) {
  return `ch-unit-${unitId}`;
}

export function channelIdRole(role: RoleCategory) {
  return `ch-role-${role}`;
}

export function channelIdIncident(incidentId: string) {
  return `ch-incident-${incidentId}`;
}

export function channelIdStaff(staffId: string) {
  return `ch-staff-${staffId}`;
}

export function buildDefaultChannels(input: {
  unitId?: string;
  unitName?: string;
  incidentIds?: { id: string; label: string }[];
}): IntercomChannel[] {
  const channels: IntercomChannel[] = [
    {
      id: channelIdBroadcast(),
      kind: "broadcast",
      label: "Hospital broadcast",
    },
  ];

  if (input.unitId) {
    channels.push({
      id: channelIdUnit(input.unitId),
      kind: "unit",
      label: input.unitName ? `Unit · ${input.unitName}` : "My unit",
      unitId: input.unitId,
    });
  }

  for (const role of ["physician", "nurse", "charge", "tech", "security"] as RoleCategory[]) {
    const labels: Record<string, string> = {
      physician: "Doctors",
      nurse: "Nurses",
      charge: "Charge",
      tech: "Technicians",
      security: "Security",
    };
    channels.push({
      id: channelIdRole(role),
      kind: "role",
      label: labels[role] ?? role,
      roleCategory: role,
    });
  }

  for (const inc of input.incidentIds ?? []) {
    channels.push({
      id: channelIdIncident(inc.id),
      kind: "incident",
      label: inc.label,
      incidentId: inc.id,
    });
  }

  return channels;
}
