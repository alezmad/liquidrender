export const formatFileSize = (size: number) => {
  if (size === 0) return "0 B";

  const units = ["B", "kB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );
  const value = size / Math.pow(1024, exponent);

  return `${value.toFixed(2)} ${units[exponent]}`;
};
