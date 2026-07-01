import Image from "next/image";
import { PageHeader } from "@/components/site/PageHeader";

export default function IdCardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital ID Card"
        description="Your virtual student identification card."
      />

      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-primary/10">
          <Image
            src="/icon-512.png"
            alt="Darse Quran Academy Logo"
            fill
            className="object-contain p-4"
          />
        </div>
        <h3 className="mt-8 font-serif text-2xl font-bold text-foreground">
          ID Card Coming Soon
        </h3>
        <p className="mt-2 max-w-md text-muted">
          We are currently working on a digital ID card feature. Check back later to see your official student identification.
        </p>
      </div>
    </div>
  );
}
