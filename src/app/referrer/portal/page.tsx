import { AppShell } from "@/components/AppShell";
import { PublicFooter } from "@/components/PublicFooter";
import PortalClient from "./PortalClient";
import "./portal.css";

export const dynamic = "force-dynamic";

export default function ReferrerPortalPage() {
  return (
    <AppShell>
      <main className="portal-main">
        <PortalClient />
      </main>
      <PublicFooter />
    </AppShell>
  );
}
