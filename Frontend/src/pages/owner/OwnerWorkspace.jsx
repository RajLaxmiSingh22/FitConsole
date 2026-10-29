import { useState } from "react";
import { EmptyState, LoadingState, Notice } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../services/api.js";
import AttendanceDesk from "./AttendanceDesk.jsx";
import ClientRoster from "./ClientRoster.jsx";
import CourseCatalog from "./CourseCatalog.jsx";
import MembershipDesk from "./MembershipDesk.jsx";
import OwnerDashboard from "./OwnerDashboard.jsx";
import PaymentLedger from "./PaymentLedger.jsx";
import Reports from "./Reports.jsx";
import TrainerDirectory from "./TrainerDirectory.jsx";

export default function OwnerWorkspace({ section }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const clients = useLoad(async () => responseData(await apiCalls.clients.list()), [refreshKey]);
  const trainers = useLoad(async () => responseData(await apiCalls.trainers.list()), [refreshKey]);
  const courses = useLoad(async () => responseData(await apiCalls.courses.list()), [refreshKey]);
  const refresh = () => setRefreshKey((value) => value + 1);
  const clientRows = clients.data ?? [];
  const trainerRows = trainers.data ?? [];
  const courseRows = courses.data ?? [];
  if (section === "Dashboard") return <OwnerDashboard />;
  if (section === "Clients") {
    return <ClientRoster trainers={trainerRows} onRefresh={refresh} />;
  }
  if (section === "Courses") {
    if (courses.loading && !courses.data) return <LoadingState />;
    return <><Notice error={courses.error} /><CourseCatalog courses={courseRows} trainers={trainerRows} refresh={refresh} /></>;
  }
  if (section === "Memberships") {
    if (clients.loading && !clients.data || courses.loading && !courses.data) return <LoadingState />;
    return <><Notice error={clients.error || courses.error} /><MembershipDesk clients={clientRows} courses={courseRows} /></>;
  }
  if (section === "Trainers") {
    if (trainers.loading && !trainers.data) return <LoadingState />;
    return <><Notice error={trainers.error} /><TrainerDirectory trainers={trainerRows} onRefresh={refresh} /></>;
  }
  if (section === "Payments") return <PaymentLedger clients={clientRows} courses={courseRows} />;
  if (section === "Attendance") return <AttendanceDesk clients={clientRows} courses={courseRows} />;
  if (section === "Reports") return <Reports />;
  return <EmptyState title={`${section} is coming next`} detail="This workspace section will connect to the matching API workflow." />;
}
