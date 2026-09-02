import Image from "next/image";
import { cn } from "@/lib/cn";

/** Logo "Pollería Entre Ríos" (imagen en /public/logo.jpg). */
export function Logo({ className }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/logo.jpg"
        alt="Pollería Entre Ríos"
        width={48}
        height={48}
        priority
        unoptimized
        className="h-12 w-12 rounded-full object-cover"
      />
    </div>
  );
}
