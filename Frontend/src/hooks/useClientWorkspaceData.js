import { useEffect, useState } from "react";
import { apiCalls, getApiError, responseData } from "../services/api.js";

// Loads the signed-in member's profile and every related record; partial failures become warnings.
export function useClientWorkspaceData(userId) {
  const [data, setData] = useState({ loading: true, error: "", client: null, courses: [], memberships: [], payments: [], plans: [], entries: [], attendance: [], summary: null, waiver: null, trainer: null });
  async function load() {
    try {
      const profile = responseData(await apiCalls.clients.me());
      const [membershipResult, paymentResult, planResult, entryResult, attendanceResult, summaryResult, waiverResult, clientWaiverResult, trainerResult, coursesResult] = await Promise.allSettled([
        apiCalls.clients.memberships(profile.id),
        apiCalls.clients.payments(profile.id),
        apiCalls.clients.dietPlans(profile.id),
        apiCalls.clients.dietEntries(profile.id),
        apiCalls.clients.attendance(profile.id),
        apiCalls.clients.dietSummary(profile.id),
        apiCalls.waivers.current(),
        apiCalls.clients.waivers(profile.id),
        profile.trainerId ? apiCalls.trainers.list() : Promise.resolve(null),
        apiCalls.courses.list(),
      ]);
      const trainerList = trainerResult.status === "fulfilled" && trainerResult.value
        ? responseData(trainerResult.value) ?? []
        : [];
      const trainer = trainerList.find((item) => item.id === profile.trainerId);
      let trainerProfile = null;
      let trainerError = "";
      if (trainer) {
        try {
          trainerProfile = responseData(await apiCalls.trainers.get(trainer.userId));
        } catch (error) {
          trainerError = getApiError(error, "Unable to load trainer contact.");
        }
      }
      const warnings = [membershipResult, paymentResult, planResult, entryResult, attendanceResult, summaryResult, waiverResult, clientWaiverResult, trainerResult, coursesResult]
        .filter((result) => result.status === "rejected")
        .map((result) => getApiError(result.reason));
      if (trainerError) warnings.push(trainerError);
      setData({
        loading: false,
        error: warnings.join(" · "),
        client: profile,
        courses: coursesResult.status === "fulfilled" ? responseData(coursesResult.value) ?? [] : [],
        memberships: membershipResult.status === "fulfilled" ? responseData(membershipResult.value) ?? [] : [],
        payments: paymentResult.status === "fulfilled" ? responseData(paymentResult.value) ?? [] : [],
        plans: planResult.status === "fulfilled" ? responseData(planResult.value) ?? [] : [],
        entries: entryResult.status === "fulfilled" ? responseData(entryResult.value) ?? [] : [],
        attendance: attendanceResult.status === "fulfilled" ? responseData(attendanceResult.value) ?? [] : [],
        summary: summaryResult.status === "fulfilled" ? responseData(summaryResult.value) : null,
        waiver: waiverResult.status === "fulfilled" ? responseData(waiverResult.value) : null,
        waivers: clientWaiverResult.status === "fulfilled" ? responseData(clientWaiverResult.value) ?? [] : [],
        trainer: trainerProfile,
      });
    } catch (error) {
      setData((current) => ({ ...current, loading: false, error: getApiError(error, "Unable to load your client profile.") }));
    }
  }
  useEffect(() => { load(); }, [userId]);
  useEffect(() => {
    window.addEventListener("fitconsole:payment-confirmed", load);
    return () => window.removeEventListener("fitconsole:payment-confirmed", load);
  }, [userId]);
  return { data, reload: load };
}
