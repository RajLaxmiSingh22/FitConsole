import { useEffect, useState } from "react";
import { apiCalls, getApiError, responseData } from "../services/api.js";

export function usePublicCatalog() {
  const [catalog, setCatalog] = useState({ courses: [], trainers: [], loading: true, error: "" });
  useEffect(() => {
    let active = true;
    Promise.all([apiCalls.courses.list(), apiCalls.trainers.list()])
      .then(([courses, trainers]) => {
        if (active) setCatalog({ courses: responseData(courses) ?? [], trainers: responseData(trainers) ?? [], loading: false, error: "" });
      })
      .catch((error) => {
        if (active) setCatalog({ courses: [], trainers: [], loading: false, error: getApiError(error, "Unable to load public gym information.") });
      });
    return () => { active = false; };
  }, []);
  return catalog;
}
