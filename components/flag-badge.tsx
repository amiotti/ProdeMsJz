import { getFlagAssetUrl, getFlagLabel } from '@/lib/worldcup26';

type FlagBadgeProps = {
  teamName: string;
  size?: 'sm' | 'lg';
};

export function FlagBadge({ teamName, size = 'sm' }: FlagBadgeProps) {
  const src = getFlagAssetUrl(teamName);
  const label = getFlagLabel(teamName);

  return (
    <span className={size === 'lg' ? 'flag-pill flag-pill-lg' : 'flag-pill'} aria-hidden="true">
      {src ? <img className="flag-img" src={src} alt="" loading="lazy" decoding="async" /> : <span>{label}</span>}
    </span>
  );
}

