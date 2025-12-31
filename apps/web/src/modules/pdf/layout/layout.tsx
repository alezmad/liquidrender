"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";

import { useTranslation } from "@turbostarter/i18n";
import { useBreakpoint } from "@turbostarter/ui-web";
import { Button } from "@turbostarter/ui-web/button";
import { Drawer, DrawerContent } from "@turbostarter/ui-web/drawer";
import { Icons } from "@turbostarter/ui-web/icons";
import { Skeleton } from "@turbostarter/ui-web/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@turbostarter/ui-web/tooltip";

import { Header } from "~/modules/common/layout/header";
import { ThemeSwitcher } from "~/modules/common/theme";

import { PdfViewerProvider } from "../context";
import { ChatHistory } from "../history";
import { pdf } from "../lib/api";

import { PdfPreview } from "./preview";

const Trigger = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useTranslation("ai");

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="group relative"
            onClick={() => onOpenChange(!open)}
          >
            <Icons.FileText className="text-muted-foreground group-hover:text-foreground size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={5}>
          <span>{t("pdf.preview.toggle")}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const DocumentPreview = ({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const isDesktop = useBreakpoint("lg");

  if (isDesktop) {
    return (
      <>
        <motion.div
          className="relative h-full w-1/2"
          variants={{
            open: { width: "50%" },
            closed: { width: 0 },
          }}
          initial="closed"
          animate={open ? "open" : "closed"}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-0 right-0 z-10 h-full w-1/2 p-3 pl-0"
          variants={{
            open: { x: 0 },
            closed: { x: "100%" },
          }}
          initial="closed"
          animate={open ? "open" : "closed"}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Documents id={id} />
        </motion.div>
      </>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-b-none fixed right-0 bottom-0 left-0 mx-[-1px] flex max-h-[97%] flex-col gap-3 rounded-t-[10px] border px-3 pb-3">
        <Documents id={id} />
      </DrawerContent>
    </Drawer>
  );
};

const Documents = ({ id }: { id: string }) => {
  const { t } = useTranslation("ai");

  const documents = useQuery(pdf.queries.chats.documents.getAll(id));
  const document = documents.data?.[0];

  const url = useQuery({
    ...pdf.queries.chats.documents.getUrl(document?.path ?? ""),
    enabled: !!document,
    staleTime: 1000 * 60 * 60,
  });

  if (documents.isLoading || url.isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!url.data?.url) {
    return (
      <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border p-6">
        <Icons.FileX className="size-12" />
        <p className="max-w-sm text-center">{t("pdf.preview.noDocuments")}</p>
      </div>
    );
  }

  return <PdfPreview url={url.data.url} />;
};

export const PdfLayout = ({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) => {
  const [open, setOpen] = useState(true);

  return (
    <PdfViewerProvider>
      <div className="relative flex h-full w-full overflow-hidden">
        <div className="relative flex h-full grow flex-col">
          <Header>
            <div className="flex items-center gap-1">
              <ChatHistory />
              <ThemeSwitcher />
              <Trigger open={open} onOpenChange={setOpen} />
            </div>
          </Header>

          {children}
        </div>

        <DocumentPreview open={open} onOpenChange={setOpen} id={id} />
      </div>
    </PdfViewerProvider>
  );
};
