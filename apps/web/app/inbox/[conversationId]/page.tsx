import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell/app-shell";
import { ConversationDetailPage } from "../../../components/conversation-detail/conversation-detail-page";
import { ConversationNotFound } from "../../../components/conversation-detail/conversation-not-found";
import { RealConversationDetail } from "../../../components/conversation-detail/real-conversation-detail";
import { getDemoConversationDetail } from "../../../lib/conversations/demo-conversation";

type ConversationDetailRouteProps = {
  params: Promise<{ conversationId: string }>;
};

export const metadata: Metadata = {
  title: "Conversation detail | AI Operations Platform",
  description:
    "Frontend-only demonstration of the AI Operations Platform conversation workspace architecture.",
};

export default async function ConversationDetailRoute({
  params,
}: ConversationDetailRouteProps) {
  const { conversationId } = await params;
  const detail = getDemoConversationDetail(conversationId);

  return (
    <AppShell
      currentRoute="/inbox"
      pageSection="Work"
      pageTitle="Conversation"
      breadcrumbs={[
        { label: "Inbox", href: "/inbox" },
        { label: "Conversation" },
      ]}
    >
      {detail ? (
        <ConversationDetailPage detail={detail} />
      ) : conversationId ? (
        <RealConversationDetail conversationId={conversationId} />
      ) : (
        <ConversationNotFound />
      )}
    </AppShell>
  );
}
