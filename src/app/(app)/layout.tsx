import type { ReactNode } from "react";

import { AppShellClient } from "@/features/auth/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShellClient>{children}</AppShellClient>;
}
