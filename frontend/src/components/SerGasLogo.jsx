import sergasLogo from '../../logosergas.png';

export default function SerGasLogo({ size = 'md' }) {
  const sizes = {
    sm: { width: 40, height: 40 },
    md: { width: 64, height: 64 },
    lg: { width: 120, height: 120 },
  };

  const s = sizes[size] ?? sizes.md;

  return (
    <img
      src={sergasLogo}
      alt="SERGAS"
      width={s.width}
      height={s.height}
      className="logo-icon"
      style={{ objectFit: 'contain' }}
    />
  );
}
