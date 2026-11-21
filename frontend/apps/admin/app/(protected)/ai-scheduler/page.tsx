import { EmptyPanel, PageFrame, PageIntro } from "@epelawa/ui";

export default function AiSchedulerPage() {
  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Staff workspace"
        title="AI Scheduler"
        description="A plan-ahead desk that will line up stories, reminders and social notes onto one calendar, then publish them at the scheduled time."
      />
      <EmptyPanel
        title="Coming soon"
        description="The AI Scheduler is being built. When it arrives it will show a drag-and-drop publishing calendar, suggested story slots from the day's events, and scheduled publish/withdraw for articles, radio episodes and community posts. No action is needed from staff today."
      />
    </PageFrame>
  );
}
