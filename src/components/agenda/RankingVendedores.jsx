import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp } from "lucide-react";

export default function RankingVendedores() {
  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-ranking'],
    queryFn: () => base44.entities.Agendamento.list(),
    initialData: [],
  });

  // Calcular vendas por vendedor (apenas "Paciente Novo")
  const calcularRanking = () => {
    const vendedoresMap = {};
    
    agendamentos
      .filter(ag => ag.status_paciente === "paciente_novo" && ag.vendedor_id && ag.vendedor_nome)
      .forEach(ag => {
        if (!vendedoresMap[ag.vendedor_id]) {
          vendedoresMap[ag.vendedor_id] = {
            nome: ag.vendedor_nome,
            vendas: 0,
            valorTotal: 0
          };
        }
        vendedoresMap[ag.vendedor_id].vendas++;
        vendedoresMap[ag.vendedor_id].valorTotal += (ag.valor_combinado || 0);
      });

    return Object.values(vendedoresMap)
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10); // Top 10
  };

  const ranking = calcularRanking();

  const getTrofeu = (posicao) => {
    if (posicao === 0) return { emoji: "🏆", cor: "text-yellow-500", bg: "bg-yellow-50", label: "1º" };
    if (posicao === 1) return { emoji: "🥈", cor: "text-gray-400", bg: "bg-gray-50", label: "2º" };
    if (posicao === 2) return { emoji: "🥉", cor: "text-amber-600", bg: "bg-amber-50", label: "3º" };
    return { emoji: "🏅", cor: "text-blue-500", bg: "bg-blue-50", label: `${posicao + 1}º` };
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (ranking.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-700 hover:from-yellow-100 hover:to-amber-100">
          <Trophy className="w-4 h-4 mr-2" />
          Ranking
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="bg-gradient-to-br from-yellow-50 via-white to-amber-50 rounded-lg">
          <div className="p-4 border-b border-yellow-200 bg-gradient-to-r from-yellow-100 to-amber-100">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-yellow-900">🎮 Ranking de Vendedores</h3>
            </div>
            <p className="text-xs text-yellow-700 mt-1">Top performers do mês</p>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {ranking.map((vendedor, index) => {
              const trofeu = getTrofeu(index);
              const isPodio = index < 3;
              
              return (
                <div
                  key={vendedor.nome}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isPodio 
                      ? `${trofeu.bg} border-2 ${trofeu.cor.replace('text-', 'border-')} shadow-md` 
                      : 'bg-white border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    isPodio ? trofeu.bg : 'bg-gray-100'
                  }`}>
                    {trofeu.emoji}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isPodio ? trofeu.cor : 'text-gray-500'}`}>
                        {trofeu.label}
                      </span>
                      <span className={`font-semibold truncate ${
                        isPodio ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {vendedor.nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600">
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {vendedor.vendas} {vendedor.vendas === 1 ? 'venda' : 'vendas'}
                      </span>
                      <span className="text-xs font-medium text-green-600">
                        {formatarValor(vendedor.valorTotal)}
                      </span>
                    </div>
                  </div>

                  {isPodio && (
                    <div className="flex-shrink-0">
                      <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        'bg-amber-600 text-white'
                      }`}>
                        TOP
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {ranking.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <p className="text-xs text-gray-600">
                🎯 Total de {ranking.reduce((acc, v) => acc + v.vendas, 0)} vendas registradas
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}