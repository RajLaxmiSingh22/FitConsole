import { LoadingState, Notice } from "../../../components/ui/index.js";
import { useLoad } from "../../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../../services/api.js";
import { dateLabel } from "../../../utils/format.js";

// Public, read-only view of the current gym agreement (linked from the payment checkbox).
export default function AgreementText() {
  const agreement = useLoad(async () => responseData(await apiCalls.waivers.current()));
  if (agreement.loading && !agreement.data) return <LoadingState label="Loading the gym agreement…" />;
  if (agreement.error) return <Notice error={agreement.error} />;
  const { text, version, publishedAt } = agreement.data ?? {};
  return <div className="public-prose agreement-public">
    <p className="overline">Version {version}{publishedAt ? ` · updated ${dateLabel(publishedAt)}` : ""}</p>
    <div className="agreement-public-text">{text}</div>
  </div>;
}
