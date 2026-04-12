"use server";

import { createClient } from "@/utils/supabase/server";

export async function submitVote(captionId: string, voteValue: number) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check for existing vote
  const { data: existing } = await supabase
    .from("caption_votes")
    .select("vote_value")
    .eq("caption_id", captionId)
    .eq("profile_id", user.id)
    .single();

  if (existing) {
    if (existing.vote_value === voteValue) {
      // Same vote — toggle off
      const { error } = await supabase
        .from("caption_votes")
        .delete()
        .eq("caption_id", captionId)
        .eq("profile_id", user.id);
      if (error) return { error: error.message };
      return { success: true, newVote: null };
    } else {
      // Different vote — update
      const { error } = await supabase
        .from("caption_votes")
        .update({ vote_value: voteValue, modified_by_user_id: user.id })
        .eq("caption_id", captionId)
        .eq("profile_id", user.id);
      if (error) return { error: error.message };
      return { success: true, newVote: voteValue };
    }
  }

  // No existing vote — insert
  const { error } = await supabase
    .from("caption_votes")
    .insert({
      caption_id: captionId,
      profile_id: user.id,
      vote_value: voteValue,
      created_datetime_utc: new Date().toISOString(),
      created_by_user_id: user.id,
      modified_by_user_id: user.id
    });

  if (error) return { error: error.message };
  return { success: true, newVote: voteValue };
}

export async function toggleSave(captionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("caption_saves")
    .select("id")
    .eq("caption_id", captionId)
    .eq("profile_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("caption_saves")
      .delete()
      .eq("caption_id", captionId)
      .eq("profile_id", user.id);
    if (error) return { error: error.message };
    return { saved: false };
  }

  const { error } = await supabase
    .from("caption_saves")
    .insert({
      caption_id: captionId,
      profile_id: user.id,
      created_datetime_utc: new Date().toISOString(),
      created_by_user_id: user.id,
      modified_by_user_id: user.id,
    });
  if (error) return { error: error.message };
  return { saved: true };
}
