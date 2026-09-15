interface MosqueSkylineProps {
  className?: string;
}

/**
 * Genel/jenerik cami silueti (kubbe + minare) - belirli bir yapiyi
 * betimlemez, sadece kurumsal kimlige dokunan cok dusuk kontrastli bir
 * arka plan dokusu olarak tasarlandi. currentColor kullanir, opaklik
 * cagiran tarafta (className ile) ayarlanir.
 */
export function MosqueSkyline({ className }: MosqueSkylineProps) {
  return (
    <svg
      viewBox="0 0 600 130"
      preserveAspectRatio="none"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <rect x="20" y="100" width="14" height="30" />
      <polygon points="17,100 37,100 27,78" />
      <circle cx="27" cy="74" r="3" />

      <rect x="82" y="88" width="56" height="42" />
      <circle cx="110" cy="88" r="26" />

      <rect x="176" y="70" width="14" height="60" />
      <polygon points="173,70 193,70 183,46" />
      <circle cx="183" cy="42" r="3" />

      <rect x="234" y="58" width="132" height="72" />
      <circle cx="300" cy="58" r="62" />
      <rect x="294" y="10" width="12" height="20" />
      <circle cx="300" cy="8" r="4" />

      <rect x="410" y="70" width="14" height="60" />
      <polygon points="407,70 427,70 417,46" />
      <circle cx="417" cy="42" r="3" />

      <rect x="462" y="88" width="56" height="42" />
      <circle cx="490" cy="88" r="26" />

      <rect x="566" y="100" width="14" height="30" />
      <polygon points="563,100 583,100 573,78" />
      <circle cx="573" cy="74" r="3" />
    </svg>
  );
}
