"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitVote(captionId: string, voteType: "upvote" | "downvote") {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const voteValue = voteType === "upvote" ? 1 : -1;

  // Check if vote already exists
  const { data: existingVote } = await supabase
    .from("caption_votes")
    .select("id, vote_value")
    .eq("caption_id", captionId)
    .eq("profile_id", user.id)
    .single();

  if (existingVote) {
    // Update existing vote
    const { error } = await supabase
      .from("caption_votes")
      .update({ 
        vote_value: voteValue,
        modified_datetime_utc: new Date().toISOString()
      })
      .eq("id", existingVote.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    // Insert new vote
    const { error } = await supabase
      .from("caption_votes")
      .insert({
        caption_id: captionId,
        profile_id: user.id,
        vote_value: voteValue,
        created_datetime_utc: new Date().toISOString()
      });

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/");
  return { success: true };
}
