"use client";

import { CanvasLayer, Page, Pages, Root, TextLayer } from "@anaralabs/lector";
import { GlobalWorkerOptions } from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import React, { memo } from "react";

import { Skeleton } from "@turbostarter/ui-web/skeleton";

import { DocumentMenu } from "./document-menu";
import { PageNavigation } from "./page-navigation";
import { ZoomMenu } from "./zoom-menu";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface PdfPreviewProps {
  readonly url: string;
}

export const PdfPreview = memo<PdfPreviewProps>(({ url }) => {
  return (
    <Root
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border"
      source={url}
      isZoomFitWidth={true}
      loader={<Skeleton className="h-full w-full" />}
    >
      <div className="relative flex justify-between border-b p-1">
        <ZoomMenu />
        <PageNavigation />
        <DocumentMenu documentUrl={url} />
      </div>
      <Pages className="dark:brightness-80 dark:contrast-228 dark:hue-rotate-180 dark:invert-94">
        <Page>
          <CanvasLayer />
          <TextLayer />
        </Page>
      </Pages>
    </Root>
  );
});

PdfPreview.displayName = "PdfPreview";
