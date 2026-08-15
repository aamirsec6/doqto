import type { RoleCategory } from "@/lib/dashboard/roles";
import { resolveRoleCategory } from "@/lib/dashboard/roles";
import type { HospitalCode, HospitalIncident, HospitalTenant } from "./types";
import { CODE_LABELS } from "./types";
import {
  channelIdBroadcast,
  channelIdIncident,
  channelIdRole,
  channelIdStaff,
  type IntercomMessage,
  type MessagePriority,
} from "./messageTypes";
import { appendMessage, appendMessages, createMessage } from "./messages";
import { emitRealtime } from "./realtimeClient";

function priorityForCode(code: HospitalCode): MessagePriority {
  if (code === "code_blue" || code === "critical_patient") return "critical";
  if (code === "doctor_needed" || code === "security") return "urgent";
  return "normal";
}

/** Post system + inbox messages when an incident is raised. */
export function postIncidentRaiseMessages(
  tenant: HospitalTenant,
  incident: HospitalIncident,
  author?: { id: string; name: string; role: string },
): IntercomMessage[] {
  const authorId = author?.id ?? "system";
  const authorName = author?.name ?? "Hospital ops";
  const authorRole = author?.role ?? "Ops";
  const priority = priorityForCode(incident.code);
  const body = `${CODE_LABELS[incident.code]} · ${incident.roomLabel} · ${incident.sourceWard}`;

  const batch: IntercomMessage[] = [
    createMessage({
      channelId: channelIdIncident(incident.id),
      channelKind: "incident",
      body,
      kind: "code_raise",
      authorId,
      authorName,
      authorRole,
      incidentId: incident.id,
      priority,
    }),
    createMessage({
      channelId: channelIdBroadcast(),
      channelKind: "broadcast",
      body,
      kind: "code_raise",
      authorId,
      authorName,
      authorRole,
      incidentId: incident.id,
      priority,
    }),
  ];

  // Page targeted staff into personal inbox
  for (const staffId of incident.pagedStaffIds) {
    const person = tenant.staffDirectory.find((s) => s.id === staffId);
    batch.push(
      createMessage({
        channelId: channelIdStaff(staffId),
        channelKind: "staff",
        body: `You were paged: ${body}`,
        kind: "concern",
        authorId,
        authorName,
        authorRole,
        incidentId: incident.id,
        targetStaffId: staffId,
        priority,
      }),
    );
    if (person) {
      const cat = resolveRoleCategory(person.role, person.name).id;
      if (cat === "physician" || incident.code === "doctor_needed") {
        batch.push(
          createMessage({
            channelId: channelIdRole("physician"),
            channelKind: "role",
            body,
            kind: "code_raise",
            authorId,
            authorName,
            authorRole,
            incidentId: incident.id,
            targetRole: "physician",
            priority,
          }),
        );
      }
    }
  }

  // Role fan-out for doctor_needed / code_blue even without specific page
  if (
    incident.code === "doctor_needed" ||
    incident.code === "code_blue" ||
    incident.code === "critical_patient"
  ) {
    const roleTargets: RoleCategory[] =
      incident.code === "doctor_needed"
        ? ["physician"]
        : ["physician", "nurse", "charge"];
    for (const role of roleTargets) {
      batch.push(
        createMessage({
          channelId: channelIdRole(role),
          channelKind: "role",
          body,
          kind: "code_raise",
          authorId,
          authorName,
          authorRole,
          incidentId: incident.id,
          targetRole: role,
          priority,
        }),
      );
    }
  }

  const next = appendMessages(batch);
  emitRealtime("message:batch", batch);
  emitRealtime("incident:raised", { incident, messages: batch });
  for (const staffId of incident.pagedStaffIds) {
    emitRealtime("page:staff", { staffId, incidentId: incident.id });
  }
  return next;
}

export function postQuickReplyMessage(input: {
  body: string;
  kind: "quick_reply" | "ack" | "text" | "concern" | "system";
  channelId: string;
  channelKind: IntercomMessage["channelKind"];
  authorId: string;
  authorName: string;
  authorRole: string;
  incidentId?: string;
  priority?: MessagePriority;
}): IntercomMessage {
  const msg = createMessage({
    channelId: input.channelId,
    channelKind: input.channelKind,
    body: input.body,
    kind: input.kind,
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    incidentId: input.incidentId,
    priority: input.priority ?? "normal",
  });
  appendMessage(msg);
  emitRealtime("message:send", msg);
  emitRealtime("message:new", msg);
  if (input.kind === "ack" && input.incidentId) {
    emitRealtime("incident:ack", {
      incidentId: input.incidentId,
      staffId: input.authorId,
      staffName: input.authorName,
    });
  }
  return msg;
}

/** Incidents that should show on a staff member's "For you now". */
export function incidentsForStaff(
  tenant: HospitalTenant,
  staffId: string,
  roleCategory: RoleCategory,
): HospitalIncident[] {
  return tenant.incidents.filter((i) => {
    if (i.lifecycle === "resolved") return false;
    if (i.pagedStaffIds.includes(staffId)) return true;
    if (i.code === "doctor_needed" && roleCategory === "physician") return true;
    if (
      (i.code === "code_blue" || i.code === "critical_patient") &&
      (roleCategory === "physician" ||
        roleCategory === "nurse" ||
        roleCategory === "charge")
    ) {
      return true;
    }
    if (i.code === "security" && roleCategory === "security") return true;
    if (i.code === "info") return true;
    return false;
  });
}
