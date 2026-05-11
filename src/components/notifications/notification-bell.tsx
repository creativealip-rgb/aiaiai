"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/notifications";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.isRead).length;

  function markOne(id: string) {
    startTransition(async () => {
      const res = await markNotificationReadAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <details className="group relative">
      <summary className="hover:bg-muted flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5">
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
            {unread}
          </span>
        ) : null}
      </summary>
      <div className="bg-background absolute right-0 z-30 mt-2 w-80 rounded-md border p-2 shadow-xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-sm font-medium">Notifikasi</p>
          <button
            type="button"
            className="text-xs underline disabled:opacity-50"
            onClick={markAll}
            disabled={pending || unread === 0}
          >
            Tandai semua dibaca
          </button>
        </div>
        <div className="max-h-96 space-y-1 overflow-auto">
          {items.length === 0 ? (
            <p className="text-muted-foreground p-2 text-xs">Belum ada notifikasi.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-md border p-2 text-xs">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  {!item.isRead ? (
                    <button
                      type="button"
                      className="text-[11px] underline"
                      onClick={() => markOne(item.id)}
                    >
                      Baca
                    </button>
                  ) : null}
                </div>
                <p className="text-muted-foreground">{item.message}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("id-ID")}
                  </span>
                  {item.linkUrl ? (
                    <Link href={item.linkUrl} className="underline">
                      Buka
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </details>
  );
}

