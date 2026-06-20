export function getCertificateFilename(courseTitle: string, enrollmentId: string): string {
  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `certificate-${slug || "course"}-${enrollmentId.slice(0, 8)}.pdf`;
}

export function canDownloadCertificate(courseStatus: string, enrollmentStatus: string): boolean {
  return courseStatus === "COMPLETED" && enrollmentStatus === "completed";
}
