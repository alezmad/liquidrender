import { pdfMessageRoleEnum } from "@turbostarter/db/schema/pdf";

import type { tools } from "./api";
import type { EnumToConstant } from "@turbostarter/shared/types";
import type { InferUITools, UIDataTypes, UIMessage } from "ai";

export interface RemoteFile {
  url: string;
  size: number;
}

export type {
  SelectPdfChat as Chat,
  SelectPdfDocument as Document,
  SelectPdfMessage as Message,
} from "@turbostarter/db/schema/pdf";

export const Role = Object.fromEntries(
  pdfMessageRoleEnum.enumValues.map((role) => [
    role.replace(/-/g, "_").toUpperCase(),
    role,
  ]),
) as EnumToConstant<typeof pdfMessageRoleEnum.enumValues>;

export type Role = (typeof Role)[keyof typeof Role];

export type PdfMessage = UIMessage<
  unknown,
  UIDataTypes,
  InferUITools<typeof tools>
>;
export type PdfMessagePart = PdfMessage["parts"][number];
