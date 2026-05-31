import { AppShell } from "@/components/app-shell";
import { MessagingWorkspace } from "@/components/messaging-workspace";
import { getMessageRecipients, getMessageThreads } from "@/lib/api";

export default async function MessagesPage() {
  const [threads, recipients] = await Promise.all([getMessageThreads(), getMessageRecipients()]);

  return (
    <AppShell title="Messages">
      <MessagingWorkspace initialThreads={threads.results} recipients={recipients} />
    </AppShell>
  );
}
