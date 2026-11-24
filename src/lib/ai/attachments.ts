import type { LabAttachment } from '../types.ts';

export const MAX_LAB_ATTACHMENTS = 3;
export const MAX_TEXT_FILE_BYTES = 250 * 1024; // 250 KB for text/markdown/csv/json
export const MAX_BINARY_FILE_BYTES = 5 * 1024 * 1024; // 5 MB for images, PDF & DOCX
export const MAX_EXTRACTED_TEXT_CHARS = 24_000;

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const ALLOWED_TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
]);

export const ALLOWED_DOCX_MIME_TYPES = new Set([DOCX_MIME_TYPE]);

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const ALLOWED_PDF_MIME_TYPES = new Set(['application/pdf']);

const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.docx': DOCX_MIME_TYPE,
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export interface AttachmentValidationResult {
  ok: boolean;
  kind?: LabAttachment['kind'];
  mimeType?: string;
  error?: string;
}

export function inferAttachmentMimeType(name: string, declaredType?: string): string {
  const cleanDeclared = (declaredType || '').trim().toLowerCase();
  if (
    ALLOWED_TEXT_MIME_TYPES.has(cleanDeclared) ||
    ALLOWED_DOCX_MIME_TYPES.has(cleanDeclared) ||
    ALLOWED_IMAGE_MIME_TYPES.has(cleanDeclared) ||
    ALLOWED_PDF_MIME_TYPES.has(cleanDeclared)
  ) {
    return cleanDeclared;
  }

  const lowerName = (name || '').trim().toLowerCase();
  const dotIdx = lowerName.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = lowerName.slice(dotIdx);
    if (EXTENSION_MIME_FALLBACK[ext]) {
      return EXTENSION_MIME_FALLBACK[ext];
    }
  }

  return cleanDeclared;
}

export function validateAttachmentFile(
  file: { name: string; type?: string; size: number },
  existingCount = 0
): AttachmentValidationResult {
  if (existingCount >= MAX_LAB_ATTACHMENTS) {
    return {
      ok: false,
      error: `Mỗi lượt chỉ đính kèm tối đa ${MAX_LAB_ATTACHMENTS} tệp để đảm bảo tốc độ phân tích.`,
    };
  }

  const mimeType = inferAttachmentMimeType(file.name, file.type);

  if (ALLOWED_TEXT_MIME_TYPES.has(mimeType)) {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      return {
        ok: false,
        error: `Tệp văn bản "${file.name}" vượt quá giới hạn 250 KB.`,
      };
    }
    return { ok: true, kind: 'text', mimeType };
  }

  if (ALLOWED_DOCX_MIME_TYPES.has(mimeType)) {
    if (file.size > MAX_BINARY_FILE_BYTES) {
      return {
        ok: false,
        error: `Tệp Word (.docx) "${file.name}" vượt quá giới hạn 5 MB.`,
      };
    }
    return { ok: true, kind: 'text', mimeType };
  }

  if (ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    if (file.size > MAX_BINARY_FILE_BYTES) {
      return {
        ok: false,
        error: `Ảnh "${file.name}" vượt quá giới hạn 5 MB.`,
      };
    }
    return { ok: true, kind: 'image', mimeType };
  }

  if (ALLOWED_PDF_MIME_TYPES.has(mimeType)) {
    if (file.size > MAX_BINARY_FILE_BYTES) {
      return {
        ok: false,
        error: `Tệp PDF "${file.name}" vượt quá giới hạn 5 MB.`,
      };
    }
    return { ok: true, kind: 'pdf', mimeType };
  }

  return {
    ok: false,
    error: `Định dạng tệp "${file.name}" chưa được hỗ trợ. Chỉ chấp nhận .txt, .md, .docx, .csv, .json, .png, .jpg, .webp và .pdf (tối đa 5 MB).`,
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Không thể đọc tệp văn bản "${file.name}".`));
    reader.readAsText(file, 'utf-8');
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Không thể đọc tệp "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractPlainTextFromWordXml(xml: string): string {
  const paragraphs = xml.split(/<\/w:p>/i);
  const lines: string[] = [];
  for (const para of paragraphs) {
    const runs = Array.from(para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi)).map((m) =>
      decodeXmlEntities(m[1] ?? '')
    );
    const joined = runs.join('').replace(/\s+/g, ' ').trim();
    if (joined) lines.push(joined);
  }
  return lines.join('\n');
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt hiện tại chưa hỗ trợ giải nén .docx trực tiếp.');
  }
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Lightweight zero-dependency DOCX text extractor (reads word/document.xml from ZIP entries).
 */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');

  // Locate End of Central Directory (EOCD: 0x06054b50) to reliably handle data-descriptor ZIPs
  let eocdOffset = -1;
  const searchStart = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= searchStart; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const centralDirSize = view.getUint32(eocdOffset + 12, true);
    const centralDirOffset = view.getUint32(eocdOffset + 16, true);
    let ptr = centralDirOffset;
    const end = Math.min(bytes.length, centralDirOffset + centralDirSize);

    while (ptr + 46 <= end && view.getUint32(ptr, true) === 0x02014b50) {
      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const fileNameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);
      const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));

      if (fileName === 'word/document.xml' && localHeaderOffset + 30 <= bytes.length) {
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const slice = bytes.subarray(dataStart, dataStart + compressedSize);

        let xmlBytes: Uint8Array;
        if (compressionMethod === 0) {
          xmlBytes = slice;
        } else if (compressionMethod === 8) {
          xmlBytes = await inflateRawBytes(slice);
        } else {
          throw new Error('Định dạng nén trong tệp .docx chưa được hỗ trợ.');
        }

        const xml = decoder.decode(xmlBytes);
        return extractPlainTextFromWordXml(xml);
      }

      ptr += 46 + fileNameLen + extraLen + commentLen;
    }
  }

  throw new Error('Không tìm thấy nội dung văn bản hợp lệ trong tệp .docx này.');
}

export async function readAttachmentFile(
  file: File,
  existingCount = 0
): Promise<LabAttachment> {
  const validation = validateAttachmentFile(file, existingCount);
  if (!validation.ok || !validation.kind || !validation.mimeType) {
    throw new Error(validation.error || 'Tệp đính kèm không hợp lệ.');
  }

  const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  if (validation.mimeType === DOCX_MIME_TYPE) {
    const arrayBuffer = await file.arrayBuffer();
    const extracted = (await extractDocxText(arrayBuffer)).trim().slice(0, MAX_EXTRACTED_TEXT_CHARS);
    if (!extracted) {
      throw new Error(`Tệp Word "${file.name}" không chứa đoạn văn bản nào để phân tích.`);
    }
    return {
      id,
      name: file.name,
      mimeType: validation.mimeType,
      size: file.size,
      kind: 'text',
      textContent: extracted,
    };
  }

  if (validation.kind === 'text') {
    const rawText = await readAsText(file);
    const trimmedText = rawText.trim().slice(0, MAX_EXTRACTED_TEXT_CHARS);
    if (!trimmedText) {
      throw new Error(`Tệp "${file.name}" đang trống, không có nội dung để phân tích.`);
    }
    return {
      id,
      name: file.name,
      mimeType: validation.mimeType,
      size: file.size,
      kind: 'text',
      textContent: trimmedText,
    };
  }

  const dataUrl = await readAsDataUrl(file);
  const commaIdx = dataUrl.indexOf(',');
  const base64Data = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : '';
  if (!base64Data) {
    throw new Error(`Không thể mã hóa tệp "${file.name}".`);
  }

  return {
    id,
    name: file.name,
    mimeType: validation.mimeType,
    size: file.size,
    kind: validation.kind,
    base64Data,
    previewUrl: validation.kind === 'image' ? dataUrl : undefined,
  };
}

export function toApiAttachments(attachments?: LabAttachment[]) {
  if (!attachments || attachments.length === 0) return undefined;
  return attachments.slice(0, MAX_LAB_ATTACHMENTS).map((att) => ({
    name: att.name,
    mimeType: att.mimeType,
    textContent: att.kind === 'text' ? att.textContent : undefined,
    data: att.kind !== 'text' ? att.base64Data : undefined,
    base64Data: att.kind !== 'text' ? att.base64Data : undefined,
  }));
}

export function formatAttachmentsContextSummary(attachments?: LabAttachment[]): string {
  if (!attachments || attachments.length === 0) return '';
  return attachments
    .map((att, idx) => {
      if (att.kind === 'text' && att.textContent) {
        const snippet = att.textContent.slice(0, 600).replace(/\s+/g, ' ').trim();
        return `[Tệp ${idx + 1}: ${att.name} (${att.mimeType}) — trích nội dung]: ${snippet}`;
      }
      const label = att.kind === 'image' ? 'Hình ảnh đính kèm' : 'Tài liệu PDF đính kèm';
      return `[Tệp ${idx + 1}: ${att.name} (${label}, ${formatFileSize(att.size)})]`;
    })
    .join('\n');
}
