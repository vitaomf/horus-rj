/** Blocos de loading animados — substitui conteúdo enquanto carrega. */
export function SkeletonLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111] animate-pulse`} />;
}

export function SkeletonPoliticoItem() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#111]">
      <div className="w-12 text-center"><SkeletonLine w="w-8" h="h-7" /></div>
      <div className="w-10 h-10 bg-[#111] animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine w="w-48" h="h-4" />
        <SkeletonLine w="w-28" h="h-2" />
      </div>
      <div className="text-right space-y-1">
        <SkeletonLine w="w-20" h="h-5" />
        <SkeletonLine w="w-16" h="h-2" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border border-[#1a1a1a] p-4 space-y-3">
      <SkeletonLine w="w-3/4" h="h-4" />
      <SkeletonLine w="w-1/2" h="h-3" />
      <SkeletonLine w="w-full" h="h-8" />
    </div>
  );
}

export function SkeletonEmendasRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#111]">
      <div className="w-16 h-14 bg-[#111] animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine w="w-32" h="h-3" />
        <SkeletonLine w="w-full" h="h-2" />
        <SkeletonLine w="w-48" h="h-2" />
      </div>
      <SkeletonLine w="w-24" h="h-6" />
    </div>
  );
}
