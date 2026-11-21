"use client";

import { useState, useTransition } from "react";
import { followTopicToggle, type FollowState, type FollowTopicType } from "../app/follow-actions";

export default function FollowToggle({
  topicType,
  topicId,
  initialFollowing,
}: {
  topicType: FollowTopicType;
  topicId: string;
  initialFollowing: boolean;
}) {
  const [state, setState] = useState<FollowState>({ following: initialFollowing });
  const [pending, startTransition] = useTransition();
  return <button
    type="button"
    className={`btn-secondary follow-toggle${state.following ? " follow-toggle--active" : ""}`}
    aria-pressed={state.following}
    aria-label={state.following ? "Stop following this topic" : "Follow this topic to hear about new activity"}
    disabled={pending}
    onClick={() => startTransition(async () => {
      const next = await followTopicToggle(topicType, topicId);
      if (next) setState(next);
    })}
  >{state.following ? "Following" : "Follow topic"}</button>;
}
