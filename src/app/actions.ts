"use server";

import { createClient } from "@/utils/supabase/server";

export async function submitVote(captionId: string, voteValue: number) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("caption_votes")
    .upsert({
      caption_id: captionId,
      profile_id: user.id,
      vote_value: voteValue,
      created_datetime_utc: new Date().toISOString(),
      modified_datetime_utc: new Date().toISOString()
    }, {
      onConflict: 'profile_id,caption_id'
    });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
