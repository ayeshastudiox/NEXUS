import { CheckCircle, AlertTriangle, Circle, FileText } from 'lucide-react';

const DOC_TYPES = ['BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'PROOF_OF_DELIVERY'];
const DOC_LABELS: Record<string, string> = {
  BILL_OF_LADING: 'Bill of Lading',
  COMMERCIAL_INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  PROOF_OF_DELIVERY: 'Proof of Delivery',
};

export default function DocumentViewer({ documents, discrepancies }: { documents: any[]; discrepancies: any[] }) {
  const docMap = new Map(documents.map(d => [d.type, d]));

  return (
    <div className="glass p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-semibold text-white/80">Document Intelligence</h3>
      </div>
      <div className="space-y-2">
        {DOC_TYPES.map(type => {
          const doc = docMap.get(type);
          const isFlagged = discrepancies.length > 0 && type === 'BILL_OF_LADING';
          return (
            <div key={type} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
              {doc ? (
                isFlagged ? (
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )
              ) : (
                <div className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center">
                  <Circle className="w-3.5 h-3.5 text-slate-700" />
                </div>
              )}
              <div className="flex-1">
                <span className={`text-sm ${doc ? (isFlagged ? 'text-orange-300' : 'text-slate-200') : 'text-slate-600'}`}>
                  {DOC_LABELS[type]}
                </span>
              </div>
              {doc && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  isFlagged ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {isFlagged ? 'Flagged' : 'Processed'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}