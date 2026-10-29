import { useState } from "react";
import { Button, Field, Notice } from "../../../components/ui/index.js";
import { apiCalls, getApiError } from "../../../services/api.js";

export default function PasswordRecoveryForm({ page, path }) {
  const [recovery, setRecovery] = useState({ email: "", password: "", token: new URLSearchParams(window.location.search).get("token") ?? path.split("/").at(-1), busy: false, error: "", success: "" });
  async function submit(event) {
    event.preventDefault();
    setRecovery((current) => ({ ...current, busy: true, error: "", success: "" }));
    try {
      if (page === "forgot-password") {
        await apiCalls.auth.requestPasswordReset(recovery.email);
        setRecovery((current) => ({ ...current, busy: false, success: "If an account matches that email, password reset instructions will be sent." }));
      } else {
        const token = recovery.token || new URLSearchParams(window.location.search).get("token") || "";
        await apiCalls.auth.resetPassword({ token, newPassword: recovery.password });
        setRecovery((current) => ({ ...current, busy: false, success: "Password updated. You can now sign in.", password: "" }));
      }
    } catch (error) {
      setRecovery((current) => ({ ...current, busy: false, error: getApiError(error) }));
    }
  }
  return <form className="public-recovery-form" onSubmit={submit}>
    <Notice error={recovery.error} /><Notice tone="success" error={recovery.success} />
    {page === "forgot-password" ? <Field label="Email address"><input type="email" autoComplete="email" required value={recovery.email} onChange={(event) => setRecovery({ ...recovery, email: event.target.value })} /></Field> : <>
      <Field label="Reset token"><input required value={recovery.token} onChange={(event) => setRecovery({ ...recovery, token: event.target.value })} /></Field>
      <Field label="New password"><input type="password" autoComplete="new-password" minLength="12" required value={recovery.password} onChange={(event) => setRecovery({ ...recovery, password: event.target.value })} /></Field>
    </>}
    <Button type="submit" disabled={recovery.busy}>{recovery.busy ? "Please wait…" : page === "forgot-password" ? "Send reset instructions" : "Update password"}</Button>
    <a className="text-button" href="/login">Back to sign in</a>
  </form>;
}
