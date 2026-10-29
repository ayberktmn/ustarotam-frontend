import Image from "next/image";

import { cn } from "@/lib/utils";

interface AvatarGroupProps {
  images: readonly string[];
  className?: string;
}

/**
 * Dekoratif, üst üste binen avatar grubu. Görseller bilinçli olarak
 * `aria-hidden` taşır; anlamı yanındaki metin taşır.
 */
function AvatarGroup({ images, className }: AvatarGroupProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex shrink-0 items-center -space-x-1", className)}
    >
      {images.map((src) => (
        <span
          key={src}
          className="relative size-4 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/70"
        >
          <Image src={src} alt="" fill sizes="16px" className="object-cover" />
        </span>
      ))}
    </div>
  );
}

export { AvatarGroup };
