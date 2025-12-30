import type { UIMessage } from "ai";

export const getMessageTextContent = <T extends UIMessage>(message?: T) => {
  return (
    message?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim() ?? ""
  );
};
