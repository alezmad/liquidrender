"use client";

import { Role } from "@turbostarter/ai/pdf/types";
import { useTranslation } from "@turbostarter/i18n";
import { Icons } from "@turbostarter/ui-web/icons";

import { Thread } from "~/modules/common/ai/thread";

import { useComposer } from "../composer/use-composer";

import { AssistantMessage } from "./assistant";
import { UserMessage } from "./user";

import type { PdfMessage } from "@turbostarter/ai/pdf/types";

interface ChatProps {
  readonly id?: string;
  readonly initialMessages?: PdfMessage[];
}

const components = {
  [Role.USER]: UserMessage,
  [Role.ASSISTANT]: AssistantMessage,
};

export const Chat = ({ id, initialMessages }: ChatProps = {}) => {
  const { t } = useTranslation("ai");
  const { messages, regenerate, error, status } = useComposer({
    id,
    initialMessages,
  });

  if (!messages.length) {
    return (
      <div className="flex w-full grow flex-col items-center justify-center gap-4 px-6">
        <Icons.ScrollText className="text-muted-foreground size-32 stroke-[1.5]" />
        <p className="text-muted-foreground max-w-sm text-center">
          {t("pdf.composer.empty")}
        </p>
      </div>
    );
  }

  return (
    <Thread
      messages={messages}
      initialMessages={initialMessages}
      status={status}
      components={components}
      error={error}
      regenerate={regenerate}
    />
  );
};
