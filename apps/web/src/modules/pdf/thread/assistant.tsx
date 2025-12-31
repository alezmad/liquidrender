import { memo } from "react";

import { getMessageTextContent } from "@turbostarter/ai";

import { ThreadMessage } from "~/modules/common/ai/thread/message";
import { Prose } from "~/modules/common/prose";

import { CitationMarkdown } from "./citation-markdown";

import type { PdfMessage } from "@turbostarter/ai/pdf/types";
import type { ThreadMessageProps } from "~/modules/common/ai/thread/message";

/**
 * Assistant message component with citation support.
 * Renders AI responses with clickable [[cite:id:page]] markers as interactive citations.
 */
export const AssistantMessage = memo<ThreadMessageProps<PdfMessage>>(
  ({ message, ref, status }) => {
    return (
      <ThreadMessage.Layout className="items-start" ref={ref}>
        <Prose className="w-full max-w-none">
          <CitationMarkdown
            id={message.id}
            content={getMessageTextContent(message)}
          />
        </Prose>

        {!["submitted", "streaming"].includes(status) && (
          <ThreadMessage.Controls message={message} />
        )}
      </ThreadMessage.Layout>
    );
  },
);

AssistantMessage.displayName = "AssistantMessage";
