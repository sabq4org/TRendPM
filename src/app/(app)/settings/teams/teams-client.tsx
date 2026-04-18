"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/modal";
import { Icon } from "@/components/icon";
import { AvatarStack } from "@/components/primitives";
import {
  createTeamAction,
  deleteTeamAction,
  updateTeamAction,
  type CreateTeamState,
} from "@/app/actions/teams";

const COLORS = [
  "#38BDF8",
  "#A855F7",
  "#F97316",
  "#10B981",
  "#EF4444",
  "#F59E0B",
  "#3B82F6",
  "#EC4899",
];

type TeamMember = {
  id: string;
  name: string;
  initials: string | null;
  hue: number | null;
};

type Team = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  members: TeamMember[];
};

export default function TeamsClient({
  locale,
  initialTeams,
  allMembers,
}: {
  locale: "ar" | "en";
  initialTeams: Team[];
  allMembers: TeamMember[];
}) {
  const [editOpen, setEditOpen] = useState<{ mode: "create" | "edit"; team: Team | null } | null>(
    null
  );
  const router = useRouter();

  return (
    <div className="scroll">
      <div className="subhead">
        <h1>{locale === "ar" ? "الفرق" : "Teams"}</h1>
        <span className="chip">{initialTeams.length}</span>
        <div style={{ marginInlineStart: "auto" }}>
          <button
            className="btn primary sm"
            type="button"
            onClick={() => setEditOpen({ mode: "create", team: null })}
          >
            <Icon name="plus" size={12} />{" "}
            {locale === "ar" ? "فريق جديد" : "New team"}
          </button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {initialTeams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h2>{locale === "ar" ? "لا توجد فرق بعد" : "No teams yet"}</h2>
            <p>
              {locale === "ar"
                ? "أنشئ فرقاً لتسهيل تنظيم الأعضاء وتعيين المهام."
                : "Create teams to organize members and assign tasks."}
            </p>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => setEditOpen({ mode: "create", team: null })}
              >
                <Icon name="plus" size={12} />{" "}
                {locale === "ar" ? "فريق جديد" : "New team"}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {initialTeams.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                locale={locale}
                onEdit={() => setEditOpen({ mode: "edit", team: t })}
                onDeleted={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </div>

      {editOpen && (
        <TeamFormModal
          locale={locale}
          allMembers={allMembers}
          mode={editOpen.mode}
          team={editOpen.team}
          onClose={(changed) => {
            setEditOpen(null);
            if (changed) router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TeamCard({
  team,
  locale,
  onEdit,
  onDeleted,
}: {
  team: Team;
  locale: "ar" | "en";
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    const msg =
      locale === "ar"
        ? `هل أنت متأكد من حذف فريق "${team.name}"؟`
        : `Delete team "${team.name}"?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await deleteTeamAction({ teamId: team.id });
      if (!res.ok) alert(res.error);
      else onDeleted();
    });
  };

  return (
    <div
      className="panel"
      style={{ padding: 14, display: "grid", gap: 10, gridTemplateRows: "auto auto 1fr auto" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: team.color ?? "var(--text-3)",
          }}
        />
        <strong style={{ fontSize: 15 }}>{team.name}</strong>
      </div>
      {team.description && (
        <div style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>
          {team.description}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <AvatarStack
          users={team.members.map((m) => ({
            id: m.id,
            name: m.name,
            initials: m.initials,
            hue: m.hue,
          }))}
          max={5}
          size="md"
        />
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          {team.members.length} {locale === "ar" ? "عضو" : "members"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onEdit}
          disabled={pending}
        >
          <Icon name="edit" size={12} />{" "}
          {locale === "ar" ? "تعديل" : "Edit"}
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onDelete}
          disabled={pending}
          style={{ color: "hsl(0 70% 55%)" }}
        >
          <Icon name="trash" size={12} />{" "}
          {locale === "ar" ? "حذف" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function TeamFormModal({
  locale,
  allMembers,
  mode,
  team,
  onClose,
}: {
  locale: "ar" | "en";
  allMembers: TeamMember[];
  mode: "create" | "edit";
  team: Team | null;
  onClose: (changed: boolean) => void;
}) {
  const [color, setColor] = useState<string>(team?.color ?? COLORS[0]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set((team?.members ?? []).map((m) => m.id))
  );
  const [state, action, pending] = useActionState<CreateTeamState, FormData>(
    createTeamAction,
    null
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, startTransition] = useTransition();

  if (state?.ok) {
    queueMicrotask(() => onClose(true));
  }

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleEditSubmit = (formData: FormData) => {
    if (!team) return;
    setEditError(null);
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    if (!name) {
      setEditError(locale === "ar" ? "الاسم مطلوب." : "Name required.");
      return;
    }
    startTransition(async () => {
      const res = await updateTeamAction({
        teamId: team.id,
        name,
        description: description || null,
        color,
        memberIds: Array.from(selected),
      });
      if (!res.ok) setEditError(res.error);
      else onClose(true);
    });
  };

  return (
    <Modal
      open
      onClose={() => onClose(false)}
      title={
        mode === "create"
          ? locale === "ar"
            ? "فريق جديد"
            : "New team"
          : locale === "ar"
          ? "تعديل الفريق"
          : "Edit team"
      }
      width={520}
    >
      <form
        action={mode === "create" ? action : undefined}
        onSubmit={
          mode === "edit"
            ? (e) => {
                e.preventDefault();
                handleEditSubmit(new FormData(e.currentTarget));
              }
            : undefined
        }
        className="form-grid"
      >
        <label className="form-field">
          <span>{locale === "ar" ? "اسم الفريق" : "Team name"} *</span>
          <input
            name="name"
            type="text"
            required
            defaultValue={team?.name ?? ""}
            autoFocus
            maxLength={120}
          />
        </label>
        <label className="form-field">
          <span>{locale === "ar" ? "الوصف (اختياري)" : "Description (optional)"}</span>
          <textarea
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={team?.description ?? ""}
          />
        </label>
        <div className="form-field">
          <span>{locale === "ar" ? "اللون" : "Color"}</span>
          <input type="hidden" name="color" value={color} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: c,
                  border: color === c ? "2px solid var(--text-1)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <div className="form-field">
          <span>
            {locale === "ar" ? "الأعضاء" : "Members"} ({selected.size})
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: 8,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--bg-0)",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {allMembers.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                {locale === "ar"
                  ? "أضف أعضاء لمساحة العمل أولاً."
                  : "Add workspace members first."}
              </div>
            ) : (
              allMembers.map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    background: selected.has(m.id)
                      ? "hsl(var(--accent-h) 60% 50% / 0.15)"
                      : "var(--bg-1)",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={m.id}
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    style={{ margin: 0 }}
                  />
                  <span>{m.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {(state && !state.ok && state.error) || editError ? (
          <div className="auth-error" role="alert">
            {editError ?? (state && !state.ok ? state.error : "")}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onClose(false)}
            disabled={pending || editPending}
          >
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </button>
          <button type="submit" className="btn primary" disabled={pending || editPending}>
            {pending || editPending
              ? locale === "ar"
                ? "جاري الحفظ…"
                : "Saving…"
              : mode === "create"
              ? locale === "ar"
                ? "إنشاء"
                : "Create"
              : locale === "ar"
              ? "حفظ"
              : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
