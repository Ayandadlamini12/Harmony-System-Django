import { AppShell } from "@/components/app-shell";
import { UserNotificationSettingsForm } from "@/components/user-notification-settings-form";
import { getUserNotificationSettings } from "@/lib/api";

export default async function NotificationSettingsPage() {
  const initialSettings = await getUserNotificationSettings();

  return (
    <AppShell title="Notification settings">
      <UserNotificationSettingsForm initialSettings={initialSettings} />
    </AppShell>
  );
}

