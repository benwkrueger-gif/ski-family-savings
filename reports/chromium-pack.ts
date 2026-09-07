/** Must match the installed @sparticuz/chromium major.minor.patch. */
export const SPARTICUZ_CHROMIUM_VERSION = "149.0.0";

export function serverlessChromiumPackUrl(arch: string = process.arch): string {
  const override = process.env.CHROMIUM_PACK_URL?.trim();
  if (override) return override;
  const packArch = arch === "arm64" ? "arm64" : "x64";
  return `https://github.com/Sparticuz/chromium/releases/download/v${SPARTICUZ_CHROMIUM_VERSION}/chromium-v${SPARTICUZ_CHROMIUM_VERSION}-pack.${packArch}.tar`;
}
