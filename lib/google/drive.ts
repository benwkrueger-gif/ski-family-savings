import { google, type drive_v3 } from "googleapis";
import { Readable } from "stream";
import { DRIVE_ROOT_FOLDER_NAME, DRIVE_SEASON_FOLDER } from "@/config/compelling-savings";
import { emailPrefix, safeFolderDate, shortId } from "@/lib/copy/sanitize";
import { getGoogleAuth, loadRootFolderId, storeRootFolderId } from "./auth";

async function driveClient() {
  const auth = await getGoogleAuth();
  return google.drive({ version: "v3", auth });
}

async function findChildFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string | undefined> {
  const result = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
    spaces: "drive",
  });
  return result.data.files?.[0]?.id ?? undefined;
}

async function createFolder(drive: drive_v3.Drive, parentId: string | undefined, name: string): Promise<string> {
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });
  if (!created.data.id) throw new Error(`Failed to create Drive folder ${name}`);
  return created.data.id;
}

async function ensureFolder(drive: drive_v3.Drive, parentId: string | undefined, name: string): Promise<string> {
  if (parentId) {
    const existing = await findChildFolder(drive, parentId, name);
    if (existing) return existing;
  }
  return createFolder(drive, parentId, name);
}

export async function ensureReportsRootFolder(): Promise<string> {
  const existing = await loadRootFolderId();
  const drive = await driveClient();
  if (existing) return existing;
  const id = await createFolder(drive, undefined, DRIVE_ROOT_FOLDER_NAME);
  await storeRootFolderId(id);
  return id;
}

export function customerFolderName(options: {
  submittedAt?: Date | null;
  firstName: string;
  email: string;
  internalId: string;
}): string {
  const date = safeFolderDate(options.submittedAt ?? new Date());
  const first = (options.firstName || "Family").replace(/[^\p{L}\p{N}]+/gu, "-");
  return `${date} - ${first} - ${emailPrefix(options.email)} - ${shortId(options.internalId)}`;
}

export async function ensureCustomerFolder(options: {
  submittedAt?: Date | null;
  firstName: string;
  email: string;
  internalId: string;
  existingFolderId?: string | null;
}): Promise<string> {
  if (options.existingFolderId) return options.existingFolderId;
  const drive = await driveClient();
  const rootId = await ensureReportsRootFolder();
  const seasonId = await ensureFolder(drive, rootId, DRIVE_SEASON_FOLDER);
  const name = customerFolderName(options);
  return ensureFolder(drive, seasonId, name);
}

export async function upsertDrivePdf(options: {
  folderId: string;
  filename: string;
  bytes: Buffer;
  existingFileId?: string | null;
}): Promise<string> {
  const drive = await driveClient();
  const media = {
    mimeType: "application/pdf",
    body: Readable.from(options.bytes),
  };

  if (options.existingFileId) {
    await drive.files.update({
      fileId: options.existingFileId,
      media,
    });
    return options.existingFileId;
  }

  const listed = await drive.files.list({
    q: `'${options.folderId}' in parents and name = '${escapeDriveQuery(options.filename)}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  const existing = listed.data.files?.[0]?.id;
  if (existing) {
    await drive.files.update({
      fileId: existing,
      media,
    });
    return existing;
  }

  const created = await drive.files.create({
    requestBody: {
      name: options.filename,
      parents: [options.folderId],
      appProperties: {},
    },
    media,
    fields: "id",
  });
  if (!created.data.id) throw new Error(`Failed to upload ${options.filename}`);
  return created.data.id;
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const drive = await driveClient();
  const result = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(result.data as ArrayBuffer);
}

export { driveFileUrl, driveFolderUrl } from "./urls";

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
