import { Lightbulb } from 'lucide-react';

interface VoceSabiaProps {
  fato: string;
  fonte?: string;
}

export function VoceSabia({ fato, fonte }: VoceSabiaProps) {
  return (
    <div className="border border-[#FFD700]/15 bg-[#FFD700]/[0.02] px-5 py-4 flex items-start gap-3">
      <Lightbulb className="w-4 h-4 text-[#FFD700]/50 shrink-0 mt-0.5" />
      <div>
        <p className="font-mono text-[8px] tracking-[0.4em] text-[#FFD700]/40 uppercase mb-1">
          Você sabia?
        </p>
        <p className="text-gray-400 text-sm leading-relaxed">
          {fato}
        </p>
        {fonte && (
          <p className="font-mono text-[7px] tracking-widest text-gray-700 mt-1">
            Fonte: {fonte}
          </p>
        )}
      </div>
    </div>
  );
}
