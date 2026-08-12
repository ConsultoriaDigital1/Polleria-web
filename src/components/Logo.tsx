import Image from "next/image";
import { cn } from "@/lib/cn";

/** Logo oficial de GestorIA. */
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/gestoria-logo-cropped.webp"
        alt="GestorIA"
        width={220}
        height={40}
        priority
        unoptimized
        className="h-8 w-auto max-w-[210px] object-contain object-left"
      />
      <span className="sr-only">{dark ? "GestorIA" : "Tienda GestorIA"}</span>
    </div>
  );
}
