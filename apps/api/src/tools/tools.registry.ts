import {
  ConversationBoardTemplate,
  ConversationCategory,
  ConversationTaskStatus,
  ConversationToolPack,
} from "@omochat/db";

type ToolPackDefinition = {
  pack: ConversationToolPack;
  title: string;
  subtitle: string;
  recommendedCategories: ConversationCategory[];
};

type BoardColumnBlueprint = {
  title: string;
  color: string;
  taskStatus: ConversationTaskStatus;
};

const sharedCategories = [
  ConversationCategory.WORKSPACE,
  ConversationCategory.DEPARTMENT,
  ConversationCategory.CHURCH,
  ConversationCategory.CARE_TEAM,
];

export const toolPackRegistry: Record<
  ConversationToolPack,
  ToolPackDefinition
> = {
  [ConversationToolPack.CORE_WORKSPACE]: {
    pack: ConversationToolPack.CORE_WORKSPACE,
    title: "Core workspace",
    subtitle: "Shared notes, decisions, and room-level task follow-up.",
    recommendedCategories: sharedCategories,
  },
  [ConversationToolPack.COMMUNITY_CARE]: {
    pack: ConversationToolPack.COMMUNITY_CARE,
    title: "Community care",
    subtitle: "Announcements, prayer tracking, and pastoral or team follow-up.",
    recommendedCategories: [
      ConversationCategory.CHURCH,
      ConversationCategory.CARE_TEAM,
      ConversationCategory.COMMUNITY,
    ],
  },
  [ConversationToolPack.BOARDS]: {
    pack: ConversationToolPack.BOARDS,
    title: "Boards",
    subtitle: "Kanban, sprint, and custom workflow boards inside the room.",
    recommendedCategories: sharedCategories,
  },
  [ConversationToolPack.ATTENDANCE]: {
    pack: ConversationToolPack.ATTENDANCE,
    title: "Time & attendance",
    subtitle: "Shifts, rosters, clock events, approvals, and attendance dashboards.",
    recommendedCategories: sharedCategories,
  },
};

export function listToolPackCatalog() {
  return Object.values(toolPackRegistry);
}

export function getToolPackDefinition(pack: ConversationToolPack) {
  return toolPackRegistry[pack];
}

export function formatToolPackLabel(pack: ConversationToolPack) {
  return toolPackRegistry[pack]?.title ?? "Room tools";
}

export function defaultBoardTemplateForCategory(
  category: ConversationCategory,
) {
  switch (category) {
    case ConversationCategory.CHURCH:
    case ConversationCategory.CARE_TEAM:
      return ConversationBoardTemplate.SPRINT;
    default:
      return ConversationBoardTemplate.KANBAN;
  }
}

export function createBoardBlueprint(
  template: ConversationBoardTemplate,
): BoardColumnBlueprint[] {
  switch (template) {
    case ConversationBoardTemplate.SPRINT:
      return [
        {
          title: "Backlog",
          color: "#e7d8a8",
          taskStatus: ConversationTaskStatus.TODO,
        },
        {
          title: "In progress",
          color: "#d6e1f0",
          taskStatus: ConversationTaskStatus.IN_PROGRESS,
        },
        {
          title: "Review",
          color: "#efdcbf",
          taskStatus: ConversationTaskStatus.IN_PROGRESS,
        },
        {
          title: "Done",
          color: "#d5e7d6",
          taskStatus: ConversationTaskStatus.DONE,
        },
      ];
    case ConversationBoardTemplate.CUSTOM:
      return [
        {
          title: "Ideas",
          color: "#efe1ca",
          taskStatus: ConversationTaskStatus.TODO,
        },
        {
          title: "Planned",
          color: "#f1e7d1",
          taskStatus: ConversationTaskStatus.TODO,
        },
        {
          title: "Active",
          color: "#d8e1ef",
          taskStatus: ConversationTaskStatus.IN_PROGRESS,
        },
        {
          title: "Closed",
          color: "#d7e7d8",
          taskStatus: ConversationTaskStatus.DONE,
        },
      ];
    case ConversationBoardTemplate.KANBAN:
    default:
      return [
        {
          title: "Backlog",
          color: "#e7d8a8",
          taskStatus: ConversationTaskStatus.TODO,
        },
        {
          title: "In progress",
          color: "#d6e1f0",
          taskStatus: ConversationTaskStatus.IN_PROGRESS,
        },
        {
          title: "Review",
          color: "#efdcbf",
          taskStatus: ConversationTaskStatus.IN_PROGRESS,
        },
        {
          title: "Done",
          color: "#d5e7d6",
          taskStatus: ConversationTaskStatus.DONE,
        },
      ];
  }
}
