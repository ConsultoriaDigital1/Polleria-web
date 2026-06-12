import { Star } from "lucide-react";
import type { LoyaltyTier } from "@/lib/types";

interface Props {
  name: string;
  phone: string;
  tier: LoyaltyTier;
  memberId: string;
  since: number;
  qrDataUrl: string;
}

/** Credencial de socio del Club Pollería, estilo tarjeta física con QR. */
export function MemberCard({ name, phone, tier, memberId, since, qrDataUrl }: Props) {
  return (
    <div className="club-pop club-shine relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red via-brand-dark to-[#5e0813] p-5 text-white shadow-card">
      {/* Marca de agua */}
      <span className="absolute -right-5 -bottom-6 text-8xl opacity-10" aria-hidden>
        🐓
      </span>

      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold">
            <Star size={12} className="fill-brand-gold" /> Club Pollería
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/50">
            Tarjeta de socio
          </p>
        </div>
        <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-extrabold uppercase text-brand-ink">
          {tier}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold uppercase tracking-wide">{name}</p>
          <p className="mt-0.5 text-xs text-white/60">{phone}</p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.25em] text-brand-gold/90">
            Nº {memberId}
          </p>
          <p className="text-[10px] text-white/45">Socio desde {since}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR de socio" className="h-20 w-20" />
        </div>
      </div>
    </div>
  );
}
