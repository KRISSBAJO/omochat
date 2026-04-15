import { CalendarClock, ClipboardList, HeartHandshake, LayoutDashboard, type LucideIcon } from "lucide-react";
import type { ConversationCategory, ConversationToolPack, ConversationToolsWorkspace } from "../../lib/api-client";

type ToolPackMeta = {
  pack: ConversationToolPack;
  title: string;
  subtitle: string;
  recommendedCategories: ConversationCategory[];
  icon: LucideIcon;
};

export const conversationCategoryOptions: Array<{
  value: ConversationCategory;
  label: string;
  description: string;
}> = [
  {
    value: "GENERAL",
    label: "General",
    description: "A flexible room without a strong operational theme yet."
  },
  {
    value: "WORKSPACE",
    label: "Workspace",
    description: "Delivery, projects, tasks, and team coordination."
  },
  {
    value: "CHURCH",
    label: "Church",
    description: "Ministry teams, departments, follow-up, and care flows."
  },
  {
    value: "COMMUNITY",
    label: "Community",
    description: "Announcements, social coordination, and shared updates."
  },
  {
    value: "DEPARTMENT",
    label: "Department",
    description: "A focused unit with clear roles and structured workflow."
  },
  {
    value: "CARE_TEAM",
    label: "Care team",
    description: "Private pastoral, support, or response-oriented rooms."
  }
];

const defaultToolPackMeta: Record<ConversationToolPack, ToolPackMeta> = {
  CORE_WORKSPACE: {
    pack: "CORE_WORKSPACE",
    title: "Core workspace",
    subtitle: "Task board, shared notes, polls, and message-to-task flow.",
    recommendedCategories: ["WORKSPACE", "DEPARTMENT", "GENERAL"],
    icon: ClipboardList
  },
  COMMUNITY_CARE: {
    pack: "COMMUNITY_CARE",
    title: "Community care",
    subtitle: "Announcements, prayer tracking, and follow-up support.",
    recommendedCategories: ["CHURCH", "COMMUNITY", "CARE_TEAM"],
    icon: HeartHandshake
  },
  BOARDS: {
    pack: "BOARDS",
    title: "Board engine",
    subtitle: "Kanban, sprint, and custom workflow boards with room context.",
    recommendedCategories: ["WORKSPACE", "DEPARTMENT", "CHURCH"],
    icon: LayoutDashboard
  },
  ATTENDANCE: {
    pack: "ATTENDANCE",
    title: "Time & attendance",
    subtitle: "Shift templates, rosters, clocking, approvals, and attendance summaries.",
    recommendedCategories: ["WORKSPACE", "DEPARTMENT", "CHURCH", "CARE_TEAM"],
    icon: CalendarClock
  }
};

export function formatConversationCategory(category: ConversationCategory) {
  switch (category) {
    case "WORKSPACE":
      return "Workspace";
    case "CHURCH":
      return "Church";
    case "COMMUNITY":
      return "Community";
    case "DEPARTMENT":
      return "Department";
    case "CARE_TEAM":
      return "Care team";
    default:
      return "General";
  }
}

export function getDefaultRoomCategory(mode: "DIRECT" | "GROUP" | "CHANNEL"): ConversationCategory {
  if (mode === "GROUP") {
    return "WORKSPACE";
  }

  if (mode === "CHANNEL") {
    return "COMMUNITY";
  }

  return "GENERAL";
}

export function getToolPackMeta(workspace: ConversationToolsWorkspace | null, pack: ConversationToolPack): ToolPackMeta {
  const catalogItem = workspace?.packCatalog.find((item) => item.pack === pack);
  const fallback = defaultToolPackMeta[pack];
  if (!catalogItem) {
    return fallback;
  }

  return {
    ...fallback,
    title: catalogItem.title,
    subtitle: catalogItem.subtitle,
    recommendedCategories: catalogItem.recommendedCategories
  };
}

export function getToolPackLabel(pack: ConversationToolPack) {
  return defaultToolPackMeta[pack].title;
}

export function describeRecommendedCategories(categories: ConversationCategory[]) {
  if (categories.length === 0) {
    return "Works across any room type.";
  }

  return categories.map((category) => formatConversationCategory(category)).join(", ");
}
