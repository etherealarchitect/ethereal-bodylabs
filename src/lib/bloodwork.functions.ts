/**
 * Blood test analysis — server function calling Lovable AI Gateway.
 * Reads the uploaded lab file from private storage, sends it as multimodal
 * input to Gemini, and stores structured markers + a medically framed
 * markdown report on the blood_reports row.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ reportId: z.string().uuid() });

const SYSTEM = `You are an evidence-based clinical decision-support assistant reviewing an Australian pathology blood test panel for an adult patient using ETHEREAL BODYLABS.

Rules:
- Interpret against standard Australian reference ranges (RCPA / common AU lab ranges). If the report itself prints a range, prefer that.
- Never diagnose. Frame findings as "consistent with", "may suggest", "warrants review".
- Always tell the reader this is educational, not a substitute for their treating GP / endocrinologist.
- Cover, when data is present: full blood count, iron studies, lipids, liver, kidney/eGFR, glucose/HbA1c, thyroid (TSH/fT4/fT3), sex hormones (total & free testosterone, SHBG, LH, FSH, oestradiol, prolactin), vitamin D, B12/folate, inflammation (CRP), and any obvious flags.
- Be specific: quote the value, unit, and range. Group into Optimal / Watch / Out-of-range.
- Give practical lifestyle, training, nutrition, sleep and follow-up-testing guidance based on ETHEREAL BODYLABS's remit (training + recovery + body composition).
- If sex-hormone markers look suboptimal for an adult male, mention that a HORMN TRT eligibility assessment (partnered with Ethereal Bodylabs) is available inside the app — do not prescribe.

You MUST reply as a single JSON object, no prose outside JSON, matching:
{
  "summary": string,                       // <= 240 chars, plain English headline
  "collected_on": string | null,           // ISO date if visible on the report
  "lab_name": string | null,
  "markers": [
    { "name": string, "value": string, "unit": string | null,
      "range": string | null, "flag": "low"|"normal"|"high"|"optimal"|"watch"|"unknown" }
  ],
  "report_md": string                      // long-form markdown report described above
}`;

async function fileToDataUrl(buf: ArrayBuffer, mime: string) {
  // btoa doesn't handle large binaries well; chunk it.
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export const analyzeBloodReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");
    const { supabase, userId } = context;

    const { data: report, error: rErr } = await supabase
      .from("blood_reports")
      .select("*")
      .eq("id", data.reportId)
      .eq("user_id", userId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!report) throw new Error("Report not found.");

    await supabase.from("blood_reports").update({ status: "processing", error: null }).eq("id", report.id);

    try {
      const { data: file, error: dErr } = await supabase.storage
        .from("bloodwork")
        .download(report.file_path);
      if (dErr || !file) throw new Error(dErr?.message ?? "Could not read file");
      const mime = report.file_mime ?? file.type ?? "application/pdf";
      const dataUrl = await fileToDataUrl(await file.arrayBuffer(), mime);

      const isPdf = mime === "application/pdf";
      const userBlock = isPdf
        ? [
            { type: "text", text: "Analyse the attached Australian pathology PDF and reply with the JSON described." },
            { type: "file", file: { filename: report.file_name ?? "bloods.pdf", file_data: dataUrl } },
          ]
        : [
            { type: "text", text: "Analyse the attached Australian pathology report image and reply with the JSON described." },
            { type: "image_url", image_url: { url: dataUrl } },
          ];

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userBlock },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 429) throw new Error("Rate limit — try again shortly.");
        if (res.status === 402) throw new Error("AI credits exhausted.");
        throw new Error(`AI error (${res.status}): ${text.slice(0, 300)}`);
      }

      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = { report_md: raw, summary: "Report parsed", markers: [] }; }

      const update = {
        status: "ready",
        markers: parsed.markers ?? [],
        analysis_md: parsed.report_md ?? "",
        summary: parsed.summary ?? null,
        collected_on: parsed.collected_on ?? null,
        lab_name: parsed.lab_name ?? null,
        error: null,
      };
      const { error: uErr } = await supabase.from("blood_reports").update(update).eq("id", report.id);
      if (uErr) throw uErr;

      return { ok: true };
    } catch (err: any) {
      await supabase.from("blood_reports")
        .update({ status: "error", error: err?.message?.slice(0, 500) ?? "Unknown error" })
        .eq("id", report.id);
      throw err;
    }
  });
