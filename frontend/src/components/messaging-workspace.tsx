"use client";

import { MessageSquare, Plus, Send, UserRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MessageRecipient, MessageThread } from "@/types/clinic";

type Props = {
  initialThreads: MessageThread[];
  recipients: MessageRecipient[];
};

function displayUser(user: MessageRecipient) {
  return user.name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
}

function formatDate(value?: string | null) {
  if (!value) return "No messages yet";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function MessagingWorkspace({ initialThreads, recipients }: Props) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreads[0]?.id ?? 0);
  const [isCreating, setIsCreating] = useState(initialThreads.length === 0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || threads[0],
    [selectedThreadId, threads]
  );

  async function refreshThreads(preferredId?: number) {
    try {
      const res = await fetch("/api/message-threads", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({ results: [] }));
      const nextThreads = data.results || [];
      setThreads(nextThreads);
      if (preferredId) setSelectedThreadId(preferredId);
      if (!preferredId && nextThreads.length && !selectedThreadId) setSelectedThreadId(nextThreads[0].id);
    } catch {
      // The UI already has the submitted thread/message; background refresh can fail silently.
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const recipientId = Number(formData.get("recipient_id"));
    const subject = String(formData.get("subject") || "").trim();
    const initialMessage = String(formData.get("initial_message") || "").trim();
    if (!recipientId || !subject || !initialMessage) {
      setError("Choose a recipient, subject, and first message.");
      setIsSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/message-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          thread_type: "direct",
          participant_ids: [recipientId],
          initial_message: initialMessage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || "Could not create the message thread.");
        return;
      }
      const createdThread = data as MessageThread;
      event.currentTarget.reset();
      setThreads((currentThreads) => [createdThread, ...currentThreads.filter((thread) => thread.id !== createdThread.id)]);
      setSelectedThreadId(createdThread.id);
      setIsCreating(false);
      void refreshThreads(createdThread.id);
    } catch {
      setError("Could not create the message thread. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread) return;
    setError("");
    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(formData.get("body") || "").trim();
    if (!body) {
      setError("Write a message before sending.");
      setIsSubmitting(false);
      return;
    }
    try {
      const res = await fetch(`/api/message-threads/${selectedThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.body?.[0] || "Could not send the message.");
        return;
      }
      form.reset();
      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === selectedThread.id
            ? {
                ...thread,
                messages: [...thread.messages, data],
                latest_message: data,
                last_message_at: data.sent_at || thread.last_message_at,
              }
            : thread
        )
      );
      void refreshThreads(selectedThread.id);
    } catch {
      setError("Could not send the message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-150px)] gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="hh-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--hh-border)] p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#65736d]">Internal messaging</p>
            <h2 className="text-lg font-bold text-[var(--hh-text)]">Staff conversations</h2>
          </div>
          <Button size="icon" type="button" onClick={() => setIsCreating((value) => !value)} aria-label="Start message">
            <Plus size={18} />
          </Button>
        </div>

        {isCreating ? (
          <form className="space-y-4 border-b border-[var(--hh-border)] bg-[#fbf8fd] p-4" onSubmit={handleCreateThread}>
            <div className="space-y-2">
              <Label htmlFor="recipient_id">Recipient</Label>
              <select
                id="recipient_id"
                name="recipient_id"
                className="h-10 w-full rounded-lg border border-[var(--hh-border)] bg-white px-3 text-sm focus:border-[var(--hh-purple)] focus:outline-none focus:ring-2 focus:ring-[#e8d5f3]"
                defaultValue=""
              >
                <option value="" disabled>
                  Select staff user
                </option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {displayUser(recipient)} - {recipient.role}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" placeholder="Patient handoff, appointment request..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial_message">Message</Label>
              <Textarea id="initial_message" name="initial_message" placeholder="Write the first message..." />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Send size={16} />
              Start thread
            </Button>
          </form>
        ) : null}

        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
          {threads.length ? (
            threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={`block w-full border-b border-[var(--hh-border)] p-4 text-left transition hover:bg-[#fbf8fd] ${
                  selectedThread?.id === thread.id ? "bg-[#f6eefb]" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--hh-text)]">{thread.subject}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#60716a]">{thread.latest_message?.body || "No messages yet"}</p>
                  </div>
                  {thread.unread_count ? <Badge variant="harmony">{thread.unread_count}</Badge> : null}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#6b7a73]">{formatDate(thread.last_message_at)}</p>
              </button>
            ))
          ) : (
            <div className="p-6 text-sm leading-6 text-[#60716a]">
              No internal conversations yet. Start a thread with another staff user.
            </div>
          )}
        </div>
      </aside>

      <section className="hh-panel flex min-h-[560px] flex-col overflow-hidden">
        {selectedThread ? (
          <>
            <div className="border-b border-[var(--hh-border)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#65736d]">Conversation</p>
                  <h2 className="text-xl font-bold text-[var(--hh-text)]">{selectedThread.subject}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="harmony">{selectedThread.thread_type}</Badge>
                    {selectedThread.patient_name ? <Badge variant="outline">{selectedThread.patient_name}</Badge> : null}
                    {selectedThread.appointment_label ? <Badge variant="outline">{selectedThread.appointment_label}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedThread.participants.map((participant) => (
                    <Badge key={participant.id} variant="outline">
                      <UserRound size={13} />
                      {participant.user_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fbf9] p-5">
              {selectedThread.messages.length ? (
                selectedThread.messages.map((message) => (
                  <article key={message.id} className="rounded-lg border border-[var(--hh-border)] bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-[var(--hh-text)]">{message.sender_name}</p>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#65736d]">{message.sender_role || "system"}</p>
                      </div>
                      <span className="text-xs text-[#65736d]">{formatDate(message.sent_at)}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--hh-text)]">{message.body}</p>
                  </article>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#60716a]">No messages in this thread yet.</div>
              )}
            </div>

            <form className="space-y-3 border-t border-[var(--hh-border)] bg-white p-4" onSubmit={handleSendMessage}>
              <Label htmlFor="body">Reply</Label>
              <Textarea id="body" name="body" className="min-h-24" placeholder="Type a message for the selected staff conversation..." />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#65736d]">External sending to email, WhatsApp, and Telegram will attach to these threads later.</p>
                <Button type="submit" disabled={isSubmitting}>
                  <Send size={16} />
                  Send
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#f5edfa] text-[var(--hh-purple)]">
              <MessageSquare size={26} />
            </div>
            <h2 className="mt-4 text-xl font-bold">No conversation selected</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#60716a]">
              Start an internal thread to coordinate patient handoffs, appointments, and operational work between Harmony Health users.
            </p>
          </div>
        )}
      </section>

      {error ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 shadow-lg">
          {error}
        </div>
      ) : null}
    </div>
  );
}
