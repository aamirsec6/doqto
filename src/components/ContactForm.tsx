"use client";

import { FormEvent, useState } from "react";

const interests = [
  { value: "pilot", label: "Hospital pilot" },
  { value: "partnership", label: "Partnership" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          organization: data.get("organization"),
          interest: data.get("interest"),
          message: data.get("message"),
        }),
      });

      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        setStatus("error");
        setError(payload.error || "Could not send. Please try again.");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setError("Could not send. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-red/15 bg-white px-8 py-12 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red/10 text-red">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-text">
          Message received
        </h3>
        <p className="mt-2 text-text-muted">
          Thanks for reaching out. We&apos;ll get back to you soon.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-medium text-red hover:text-red-dark"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-red/15 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-left">
          <span className="mb-1.5 block text-sm font-medium text-text">
            Name <span className="text-red">*</span>
          </span>
          <input
            name="name"
            required
            autoComplete="name"
            placeholder="Your name"
            className="w-full rounded-xl border border-red/15 bg-peach-light/40 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted/50 focus:border-red/40 focus:bg-white"
          />
        </label>

        <label className="block text-left">
          <span className="mb-1.5 block text-sm font-medium text-text">
            Work email <span className="text-red">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@hospital.com"
            className="w-full rounded-xl border border-red/15 bg-peach-light/40 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted/50 focus:border-red/40 focus:bg-white"
          />
        </label>

        <label className="block text-left">
          <span className="mb-1.5 block text-sm font-medium text-text">
            Organization
          </span>
          <input
            name="organization"
            autoComplete="organization"
            placeholder="Hospital or company"
            className="w-full rounded-xl border border-red/15 bg-peach-light/40 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted/50 focus:border-red/40 focus:bg-white"
          />
        </label>

        <label className="block text-left">
          <span className="mb-1.5 block text-sm font-medium text-text">
            I&apos;m interested in
          </span>
          <select
            name="interest"
            defaultValue="pilot"
            className="w-full rounded-xl border border-red/15 bg-peach-light/40 px-4 py-3 text-sm text-text outline-none transition focus:border-red/40 focus:bg-white"
          >
            {interests.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-5 block text-left">
        <span className="mb-1.5 block text-sm font-medium text-text">
          Message <span className="text-red">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Tell us briefly what you're looking for..."
          className="w-full resize-y rounded-xl border border-red/15 bg-peach-light/40 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted/50 focus:border-red/40 focus:bg-white"
        />
      </label>

      {status === "error" && (
        <p className="mt-4 text-sm text-red" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 w-full rounded-xl bg-red px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-dark disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[180px]"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
