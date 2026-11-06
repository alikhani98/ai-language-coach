"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The Better Auth route is enabled only in the local development preview. */
export function MySqlPreviewLogout({ label }: { label: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setFailed(false);
          try {
            const response = await fetch("/api/auth/sign-out", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            if (!response.ok) throw new Error("Sign-out failed");
            window.location.assign("/login");
          } catch {
            setPending(false);
            setFailed(true);
          }
        }}
      >
        <LogOut className="h-4 w-4" />
        {pending ? "…" : label}
      </Button>
      {failed ? <span role="alert" className="text-xs text-destructive">Sign-out failed. Try again.</span> : null}
    </div>
  );
}
