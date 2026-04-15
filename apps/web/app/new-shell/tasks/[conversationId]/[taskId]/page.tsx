import { ToolsTaskPage } from "../../../../../components/new-chat/tools-task-page";

export default async function TaskDetailDynamicPage({
  params,
}: {
  params: Promise<{
    conversationId: string;
    taskId: string;
  }>;
}) {
  const { conversationId, taskId } = await params;

  return <ToolsTaskPage conversationId={conversationId} taskId={taskId} />;
}
