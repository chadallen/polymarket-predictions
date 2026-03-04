import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type AnalyzeRequest, type AnalyzeResponse } from "@shared/schema";

export function useAnalyze() {
  return useMutation({
    mutationFn: async (data: AnalyzeRequest) => {
      const res = await fetch(api.analyze.create.path, {
        method: api.analyze.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Analysis failed" }));
        throw new Error(body.message || "Analysis failed");
      }
      
      return (await res.json()) as AnalyzeResponse;
    },
  });
}
