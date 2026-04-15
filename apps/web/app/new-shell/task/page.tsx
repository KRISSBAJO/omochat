import { notFound } from "next/navigation";
import { ToolsTaskPage } from "../../../components/new-chat/tools-task-page";

export default async function TaskDetailPage({
  searchParams,
}: {
  searchParams: Promise<{
    conversationId?: string;
    taskId?: string;
  }>;
}) {
  const { conversationId, taskId } = await searchParams;

  if (!conversationId || !taskId) {
    notFound();
  }

  return <ToolsTaskPage conversationId={conversationId} taskId={taskId} />;
}
