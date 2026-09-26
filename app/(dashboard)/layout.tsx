// src/app/(dashboard)/layout.tsx
import { SyncProvider } from "@/components/offline/SyncProvider"
import { DashboardAuthGuard } from "@/components/auth/dashboard-auth-guard"
import { DashboardLayoutClient } from "./dashboard-layout-client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SyncProvider>
      <DashboardAuthGuard>
        <DashboardLayoutClient>
          {children}
        </DashboardLayoutClient>
      </DashboardAuthGuard>
    </SyncProvider>
  )
}