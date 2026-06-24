import { AdminTable } from "@/components/admin-table";
import { requireAdmin } from "@/lib/auth";
import { listProjects, listRevisionRequests } from "@/lib/repository";
import { RevisionTable } from "@/components/revision-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [admin, projects, revisions] = await Promise.all([
    requireAdmin(),
    listProjects(),
    listRevisionRequests()
  ]);
  return (
    <main className="admin-shell">
      <div className="admin-header"><div><p className="kicker">Operations</p><h1 className="serif">VoiceGift orders</h1></div><small>Signed in as {admin.email}</small></div>
      <AdminTable projects={projects} />
      <h2 className="serif" style={{ marginTop: 48 }}>Revision queue</h2>
      <RevisionTable revisions={revisions} />
    </main>
  );
}
