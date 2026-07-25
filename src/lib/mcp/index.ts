import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get-profile";
import listWorkoutsTool from "./tools/list-workouts";
import listMeasurementsTool from "./tools/list-measurements";
import listDosesTool from "./tools/list-doses";
import listProgramsTool from "./tools/list-programs";
import logMeasurementTool from "./tools/log-measurement";

// The OAuth issuer MUST be the direct Supabase host (RFC 8414 issuer match).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time. Fallback keeps
// the issuer well-formed during the throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ethereal-bodylab-mcp",
  title: "ETHEREAL BODYLABS",
  version: "0.1.0",
  instructions:
    "Tools for the ETHEREAL BODYLABS athlete platform. Read the signed-in user's profile, training programs, workouts, body measurements and dose logs; log a new body measurement. All tools act as the authenticated user under Row Level Security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfileTool,
    listWorkoutsTool,
    listMeasurementsTool,
    listDosesTool,
    listProgramsTool,
    logMeasurementTool,
  ],
});
