import { useState } from 'react';
import { aiQuery } from '../lib/api';
import { Send, Bot, Sparkles } from 'lucide-react';

export default function AIAnalyst({ shipmentId }: { shipmentId?: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await aiQuery(question, shipmentId);
      setAnswer(res.answer);
    } catch (e) {
      setAnswer('Error: Unable to get AI response. Check if the backend is running.');
    }
    setLoading(false);
  };

  const suggestedQuestions = shipmentId
    ? [`Why is ${shipmentId} high risk?`, 'What should we do next?', 'Are there any document inconsistencies?']
    : ['Which shipments are most at risk?', 'What shipments are affected by Rotterdam congestion?', 'Show me the biggest operational risks.'];

  return (
    <div className="glass p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-white/80">AI Logistics Analyst</h3>
        <Sparkles className="w-3 h-3 text-purple-400/50" />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this shipment..."
          className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.05] transition-all"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 rounded-xl text-white text-sm font-medium transition-all shadow-lg shadow-purple-500/20 disabled:shadow-none"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => setQuestion(q)}
            className="text-[11px] px-2.5 py-1 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] rounded-lg text-slate-400 hover:text-slate-300 transition-all"
          >
            {q}
          </button>
        ))}
      </div>

      {answer && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}