"use server";

import { rerunDailyAutoArticleAdmin, publishArticleFromAdmin, suppressArticleFromAdmin } from "@/lib/server/admin-editorial";

export async function rerunDailyAutoAction(formData: FormData) {
  const sourceDate = String(formData.get("sourceDate") ?? "").trim();
  if (!sourceDate) {
    throw new Error("Source date is required");
  }
  await rerunDailyAutoArticleAdmin(sourceDate);
}

export async function publishArticleAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) {
    throw new Error("Article slug is required");
  }
  await publishArticleFromAdmin(slug);
}

export async function suppressArticleAction(formData: FormData) {
  const articleId = String(formData.get("articleId") ?? "").trim();
  if (!articleId) {
    throw new Error("Article id is required");
  }
  await suppressArticleFromAdmin(articleId);
}
