import { getCountryFlagUrl } from "@/services/countries";

type CountryFlagProps = {
  code: string;
  size?: number;
  className?: string;
};

export function CountryFlag({ code, size = 20, className = "" }: CountryFlagProps) {
  const height = Math.round(size * 0.75);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN flag; tiny lazy-loaded asset
    <img
      src={getCountryFlagUrl(code, size)}
      alt=""
      width={size}
      height={height}
      className={`inline-block shrink-0 rounded-sm object-cover ${className}`.trim()}
      loading="lazy"
    />
  );
}
