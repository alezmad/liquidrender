import * as z from "zod";

import { MAX_FILE_SIZE } from "./constants";
import { Role } from "./types";

export const pdfMessageSchema = z.object({
  id: z.string(),
  role: z.enum(Role).optional().default(Role.USER),
  content: z.string().min(1).max(5000),
});

export type PdfMessagePayload = z.infer<typeof pdfMessageSchema>;

// API input type aliases
export type PdfMessageInput = PdfMessagePayload;

export {
  selectPdfChatSchema as chatSchema,
  selectPdfMessageSchema as messageSchema,
  selectPdfDocumentSchema as pdfSchema,
} from "@turbostarter/db/schema/pdf";

export const pdfUrlFormSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => url.toLowerCase().endsWith(".pdf")),
});

export type PdfUrlFormPayload = z.infer<typeof pdfUrlFormSchema>;

interface ValidateOptions {
  /** Use server proxy to avoid CSP/CORS issues on client-side */
  useProxy?: boolean;
}

export const validateRemotePdfUrl = async (
  url: string,
  options: ValidateOptions = {},
) => {
  try {
    const { useProxy = true } = options;

    // Use proxy endpoint to avoid CSP/CORS blocking on client-side
    // The proxy does HEAD internally and validates the PDF content-type
    const fetchUrl = useProxy
      ? `/api/storage/proxy?url=${encodeURIComponent(url)}&validate=true`
      : url;

    const response = await fetch(fetchUrl, {
      method: useProxy ? "GET" : "HEAD",
    });

    if (!response.ok) {
      return "ai:pdf.upload.error.notFound" as const;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/pdf")) {
      return "validation:error.file.type" as const;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return "validation:error.tooBig.file.notInclusive" as const;
    }

    return { url, size: parseInt(contentLength ?? "0") };
  } catch (error) {
    console.error(error);

    return "ai:pdf.upload.error.notFound" as const;
  }
};
