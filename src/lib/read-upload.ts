/**
 * Reads an uploaded file as plain text.
 * Supports .docx (Word) via mammoth, plus any plain-text format.
 */
export async function readUploadedFileAsText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buffer = await file.arrayBuffer();
    const result = await (mammoth as any).extractRawText({ arrayBuffer: buffer });
    return String(result?.value ?? "").trim();
  }

  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files aren't supported — save as .docx and upload again.");
  }

  return await file.text();
}
