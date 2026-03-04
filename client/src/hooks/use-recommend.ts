import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type RecommendRequest, type RecommendResponse } from "@shared/schema";

export function useRecommend() {
  return useMutation({
    mutationFn: async (data: RecommendRequest) => {
      const res = await fetch(api.recommend.create.path, {
        method: api.recommend.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Recommendation failed" }));
        throw new Error(body.message || "Recommendation failed");
      }

      return (await res.json()) as RecommendResponse;
    },
  });
}
