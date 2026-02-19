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
      user_id: user.id,
      vote_type: voteType
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
