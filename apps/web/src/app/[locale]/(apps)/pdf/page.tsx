import { Header } from "~/modules/common/layout/header";
import { ThemeSwitcher } from "~/modules/common/theme";
import { ChatHistory } from "~/modules/pdf/history";
import { PdfUpload } from "~/modules/pdf/upload";

export default function PdfPage() {
  return (
    <>
      <Header>
        <div className="flex items-center gap-1">
          <ChatHistory />
          <ThemeSwitcher />
        </div>
      </Header>
      <div className="flex h-full w-full flex-col items-center p-3 pt-12 md:pt-14">
        <PdfUpload />
      </div>
    </>
  );
}
