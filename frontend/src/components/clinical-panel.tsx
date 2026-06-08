import { MoreHorizontal, Pencil } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ClinicalPanel({
  title,
  icon,
  children,
  action = false,
  onAction,
  actionNode
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: boolean;
  onAction?: () => void;
  actionNode?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 font-bold">
          {icon}
          {title}
        </div>
        {actionNode ? actionNode : (
          <Button onClick={onAction} aria-label={action ? `Edit ${title}` : `${title} actions`} size="icon" type="button" variant="ghost">
            {action ? <Pencil size={15} /> : <MoreHorizontal size={16} />}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
