import { memo } from "react";

import { getMessageTextContent } from "@turbostarter/ai";

import { ThreadMessage } from "~/modules/common/ai/thread/message";
import { MemoizedMarkdown } from "~/modules/common/markdown/memoized-markdown";
import { Prose } from "~/modules/common/prose";

import type { PdfMessage } from "@turbostarter/ai/pdf/types";
import type { ThreadMessageProps } from "~/modules/common/ai/thread/message";

export const AssistantMessage = memo<ThreadMessageProps<PdfMessage>>(
  ({ message, ref, status }) => {
    return (
      <ThreadMessage.Layout className="items-start" ref={ref}>
        <Prose className="w-full max-w-none">
          <MemoizedMarkdown
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
