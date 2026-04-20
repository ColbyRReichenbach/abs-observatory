"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import motifConfig from "@/config/team-motifs.json";
import {
  APPROVED_AVATAR_PRESETS,
  normalizeUsername,
  type ApprovedAvatarPreset,
} from "@/lib/server/identity-policy";
import type { ViewerProfile } from "@/lib/server/profiles";

const CSRF_COOKIE_NAME = "aibs_csrf";

type TeamOption = {
  id: number;
  name: string;
};

const TEAM_OPTIONS: TeamOption[] = [...(motifConfig.teams as { team_id: number; name: string }[])]
  .map((team) => ({ id: team.team_id, name: team.name }))
  .sort((left, right) => left.name.localeCompare(right.name));

async function ensureCsrfToken() {
  const existingToken = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.slice(CSRF_COOKIE_NAME.length + 1);

  if (existingToken) {
    return decodeURIComponent(existingToken);
  }

  const response = await fetch("/api/csrf", { method: "GET", credentials: "same-origin" });
  const body = (await response.json()) as { csrfToken?: string };
  if (!response.ok || !body.csrfToken) {
    return null;
  }
  return body.csrfToken;
}

function toFormState(profile: ViewerProfile) {
  return {
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    avatarPreset: profile.avatarPreset ?? "",
    favoriteTeamId: profile.favoriteTeamId === null ? "" : String(profile.favoriteTeamId),
    isPublic: profile.isPublic,
    postingEnabled: profile.postingEnabled,
    aiHistoryEnabled: profile.aiHistoryEnabled,
  };
}

export function ProfileSettingsForm({ initialProfile }: { initialProfile: ViewerProfile }) {
  const [form, setForm] = useState(() => toFormState(initialProfile));
  const [latestProfile, setLatestProfile] = useState(initialProfile);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const publicHref =
    form.username.trim() && form.isPublic ? `/u/${normalizeUsername(form.username)}` : null;

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const csrfToken = await ensureCsrfToken();
      if (!csrfToken) {
        setError("Unable to issue CSRF token.");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          username: form.username.trim() ? form.username.trim() : null,
          bio: form.bio.trim() ? form.bio.trim() : null,
          avatarPreset: form.avatarPreset ? form.avatarPreset : null,
          favoriteTeamId: form.favoriteTeamId ? Number(form.favoriteTeamId) : null,
          isPublic: form.isPublic,
          postingEnabled: form.postingEnabled,
          aiHistoryEnabled: form.aiHistoryEnabled,
        }),
      });

      const body = (await response.json()) as { error?: string; profile?: ViewerProfile };
      if (!response.ok || !body.profile) {
        setError(body.error ?? "Unable to save profile.");
        return;
      }

      setLatestProfile(body.profile);
      setForm(toFormState(body.profile));
      setMessage("Profile saved.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_320px]">
      <section className="panel border-gray-100 bg-white p-8 shadow-2xl shadow-black/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Edit Profile</p>
            <h2 className="mt-3 text-3xl font-display uppercase tracking-tight text-[var(--ink-0)]">
              Profile Settings
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ink-2)]">
              Update how your card looks, what people can see, and what AiBS saves for you.
            </p>
          </div>

          {publicHref ? (
            <Link
              href={publicHref}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-[var(--surface-infield)] px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)] transition hover:border-black/20 hover:bg-white"
            >
              View Public Page
            </Link>
          ) : null}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Field label="Display Name" hint="This comes from your sign-in account right now.">
            <div className="rounded-2xl border border-black/10 bg-[var(--surface-infield)] px-4 py-3 text-sm text-[var(--ink-1)]">
              {latestProfile.displayName ?? "Unnamed viewer"}
            </div>
          </Field>

          <Field label="Primary Email" hint="Your sign-in email is read-only here.">
            <div className="rounded-2xl border border-black/10 bg-[var(--surface-infield)] px-4 py-3 text-sm text-[var(--ink-1)]">
              {latestProfile.primaryEmail ?? "No email on file"}
            </div>
          </Field>

          <Field label="Username" hint="3-16 lowercase letters, numbers, or underscores.">
            <input
              value={form.username}
              onChange={(event) => updateForm("username", event.target.value)}
              disabled={!latestProfile.isVerified || isPending}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/30"
              placeholder="zone_report"
            />
          </Field>

          <Field label="Avatar Preset" hint="Pick the avatar style you want on your card.">
            <select
              value={form.avatarPreset}
              onChange={(event) => updateForm("avatarPreset", event.target.value as ApprovedAvatarPreset | "")}
              disabled={!latestProfile.isVerified || isPending}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/30"
            >
              <option value="">No preset</option>
              {APPROVED_AVATAR_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Favorite Team" hint="Shows up on your card and around the app.">
            <select
              value={form.favoriteTeamId}
              onChange={(event) => updateForm("favoriteTeamId", event.target.value)}
              disabled={!latestProfile.isVerified || isPending}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/30"
            >
              <option value="">Choose a club</option>
              {TEAM_OPTIONS.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Comments" hint="Choose whether you want to comment with this profile.">
            <Toggle
              checked={form.postingEnabled}
              disabled={!latestProfile.isVerified || isPending}
              onChange={(checked) => updateForm("postingEnabled", checked)}
              label={form.postingEnabled ? "Posting enabled" : "Posting paused"}
            />
          </Field>
        </div>

        <Field label="Bio" hint="Keep it short. This shows up on your card.">
          <textarea
            value={form.bio}
            onChange={(event) => updateForm("bio", event.target.value)}
            disabled={!latestProfile.isVerified || isPending}
            rows={5}
            className="w-full rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--ink-1)] outline-none transition focus:border-black/30"
            placeholder="Watching ABS like it owes me money."
          />
        </Field>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Toggle
            checked={form.isPublic}
            disabled={!latestProfile.isVerified || isPending}
            onChange={(checked) => updateForm("isPublic", checked)}
            label={form.isPublic ? "Public profile on" : "Public profile off"}
            hint="Turn this on if you want a shareable profile page."
          />
          <Toggle
            checked={form.aiHistoryEnabled}
            disabled={!latestProfile.isVerified || isPending}
            onChange={(checked) => updateForm("aiHistoryEnabled", checked)}
            label={form.aiHistoryEnabled ? "AI history saved" : "AI history paused"}
            hint="Save your reads and summaries to your profile library."
          />
        </div>

        {!latestProfile.isVerified ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Verify your account first, then you can edit your profile and turn on your public card.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !latestProfile.isVerified}
            className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-[0.16em] text-white transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Saving" : "Save Profile"}
          </button>
        </div>
      </section>

      <aside>
        <section className="panel border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Card Preview</p>
          <div className="mt-4 rounded-[2rem] border border-black/10 bg-[var(--surface-infield)] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">
              {publicHref ? "Profile URL" : "Private for Now"}
            </p>
            <p className="mt-2 text-lg font-display uppercase tracking-tight text-[var(--ink-0)]">
              {publicHref ? `aibs / ${normalizeUsername(form.username)}` : "Not publicly linkable yet"}
            </p>
            <p className="mt-2 text-sm text-[var(--ink-2)]">
              {publicHref
                ? "This is the page people can visit when they open your card."
                : "Add a username and turn on your public profile to make this page live."}
            </p>
          </div>
        </section>
      </aside>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</label>
      </div>
      {children}
      <p className="mt-2 text-xs text-[var(--ink-3)]">{hint}</p>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className={`rounded-3xl border px-4 py-4 ${checked ? "border-blue-200 bg-blue-50/70" : "border-black/10 bg-white"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-1)]">{label}</p>
          {hint ? <p className="mt-1 text-sm text-[var(--ink-2)]">{hint}</p> : null}
        </div>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-black"
        />
      </div>
    </label>
  );
}
