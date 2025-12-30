import type { RemoteFile } from "@turbostarter/ai/pdf/types";

export type FileInput = File | RemoteFile;

export const getFileName = (file: FileInput) => {
  if ("name" in file) {
    return file.name.replace(/\.[^.]+$/, "");
  }

  const fileName = file.url.split("/").pop() ?? null;
  if (!fileName) return null;
  return fileName.replace(/\.[^.]+$/, "");
};

export const readFile = async (file: FileInput) => {
  if ("url" in file) {
    const response = await fetch(file.url);
    const blob = await response.blob();
    return blob;
  } else {
    const reader = new FileReader();
    return new Promise<Blob>((resolve, reject) => {
      reader.onloadend = () =>
        resolve(new Blob([reader.result as ArrayBuffer]));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
};
