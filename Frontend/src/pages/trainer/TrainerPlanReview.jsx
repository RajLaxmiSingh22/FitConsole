import { useEffect, useState } from "react";
import DietPlanView from "../../components/DietPlanView.jsx";
import { Button, Card, EmptyState, LoadingState, Notice, PageHeader } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import PlanDraftEditor from "./PlanDraftEditor.jsx";

export default function TrainerPlanReview({ clients }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [editingPlan, setEditingPlan] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const lists = await Promise.all(clients.map(async (client) => {
        const rows = responseData(await apiCalls.clients.dietPlans(client.id)) ?? [];
        return rows.map((plan) => ({ ...plan, clientName: client.User?.fullName ?? "Client" }));
      }));
      setPlans(lists.flat());
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to retrieve diet plans."));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [clients]);
  async function approve(planId) {
    setBusy(planId);
    try {
      await apiCalls.dietPlans.approve(planId);
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to approve diet plan."));
    } finally {
      setBusy("");
    }
  }
  async function savePlan(planId, content) {
    setBusy(planId);
    setError("");
    try {
      await apiCalls.dietPlans.update(planId, content);
      setEditingPlan("");
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to save diet plan."));
    } finally {
      setBusy("");
    }
  }
  if (loading) return <LoadingState label="Gathering client plans…" />;
  const drafts = plans.filter((plan) => plan.status === "draft");
  return <>
    <PageHeader eyebrow={`${drafts.length} drafts`} title="Diet plans" description="Review generated drafts before clients can see the approved plan." />
    <Notice error={error} />
    {drafts.length ? <div className="plan-grid">{drafts.map((plan) => <Card key={plan.id} title={plan.plan?.title || "Diet plan draft"} eyebrow={plan.clientName}>
      <DietPlanView plan={plan.plan} />
      {editingPlan === plan.id && <PlanDraftEditor plan={plan} saving={busy === plan.id} onSave={(content) => savePlan(plan.id, content)} onCancel={() => setEditingPlan("")} />}
      {editingPlan !== plan.id && <div className="row-actions"><Button variant="outline" onClick={() => setEditingPlan(plan.id)}>Advanced edit</Button><Button onClick={() => approve(plan.id)} disabled={busy === plan.id}>{busy === plan.id ? "Approving…" : "Approve & send"}</Button></div>}
    </Card>)}</div> : <EmptyState title="Nothing to review" detail="Generated diet-plan drafts will appear here." />}
  </>;
}
