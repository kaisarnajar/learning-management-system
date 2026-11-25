import { describe, expect, it } from "vitest";
import { contentDisposition, toAsciiFilenameBase } from "@/utils/filename";
import { pdfResponse } from "@/utils/pdf-response";

/** Parses the RFC 5987 `filename*` value back to the name a browser shows. */
const utf8NameOf = (header: string) => decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(header)?.[1] ?? "");

describe("download filenames (review L8)", () => {
  it("an Urdu name keeps an ASCII fallback and the full name in filename*", () => {
    const header = contentDisposition("attachment", "ID Card محمد عمران", "pdf");

    expect(header).toMatch(/^attachment; filename="ID_Card\.pdf"; filename\*=UTF-8''/);
    expect(utf8NameOf(header)).toBe("ID Card محمد عمران.pdf");
    // Every byte of the header is printable ASCII, so the runtime accepts it.
    expect(header).toMatch(/^[\x20-\x7E]+$/);
  });

  it("a name with quotes, slashes or line breaks cannot break the header", () => {
    const header = contentDisposition("inline", 'Ali "the scholar" O\'Brien/..\\x\r\nSet-Cookie: a=b', "pdf");

    expect(header).not.toMatch(/[\r\n]/);
    const [, quoted] = /filename="([^"]*)"/.exec(header) ?? [];
    expect(quoted).toMatch(/^[A-Za-z0-9_-]+\.pdf$/);
    expect(header.split('"')).toHaveLength(3);
    expect(utf8NameOf(header)).toBe("Ali the scholar O'Brien..xSet-Cookie: a=b.pdf");
    // RFC 5987 attr-char excludes ' ( ) *.
    expect(header).not.toMatch(/filename\*=UTF-8''[^;]*['()*]/);
  });

  it("an empty or unprintable name falls back to a generic one", () => {
    expect(toAsciiFilenameBase("محمد")).toBe("document");
    expect(contentDisposition("attachment", "", "pdf")).toBe(`attachment; filename="document.pdf"; filename*=UTF-8''document.pdf`);
  });

  it("keeps dashes in an already safe name", () => {
    expect(toAsciiFilenameBase("invoice-tajweed-1a2b3c4d")).toBe("invoice-tajweed-1a2b3c4d");
  });

  it("pdfResponse sends the PDF privately, inline or as a download, without doubling .pdf", async () => {
    const download = pdfResponse(new Uint8Array([37, 80, 68, 70]), "certificate-tajweed-1a2b3c4d.pdf");
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("cache-control")).toBe("private, no-store");
    expect(download.headers.get("content-disposition")).toBe(
      `attachment; filename="certificate-tajweed-1a2b3c4d.pdf"; filename*=UTF-8''certificate-tajweed-1a2b3c4d.pdf`,
    );
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]));

    expect(pdfResponse(new Uint8Array(), "x", { inline: true }).headers.get("content-disposition")).toMatch(/^inline; /);
  });
});
