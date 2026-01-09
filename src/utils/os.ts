export type OperatingSystem = "macOS" | "Windows" | "Linux" | "Android" | "iOS" | "Unknown";

export function detectOperatingSystem(): OperatingSystem {
  const getPlatformString = () => {
    if (typeof navigator !== "undefined") {
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      return nav.userAgentData?.platform || nav.userAgent || "";
    }
    if (typeof process !== "undefined" && (process as NodeJS.Process).platform) {
      return (process as NodeJS.Process).platform;
    }
    return "";
  };

  const platform = getPlatformString().toLowerCase();

  if (!platform) return "Unknown";
  if (platform.includes("iphone") || platform.includes("ipad") || platform.includes("ipod")) return "iOS";
  if (platform.includes("android")) return "Android";
  if (platform.includes("mac")) return "macOS";
  if (platform.includes("win")) return "Windows";
  if (platform.includes("linux")) return "Linux";

  return "Unknown";
}
