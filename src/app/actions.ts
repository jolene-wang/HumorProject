"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitVote(captionId: string, voteType: "upvote" | "downvote") {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("caption_votes")
    .insert({
      caption_id: captionId,
      profile_id: user.id,
      vote_value: voteType === "upvote" ? 1 : -1,
      created_datetime_utc: new Date().toISOString()
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
