import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Settings, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { addDays, subDays } from "date-fns";

// Usar mesma lógica de formatação em todos os componentes
const formatarDataPura = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function AgendaHeader({ 
  dataAtual,
  unidades,
  unidadeSelecionada,
  onUnidadeChange,
  onDataChange,
  onNovoAgendamento,
  usuarioAtual
}) {
  const formatarDataExibicao = () => {
    // Criar data às 12h para evitar problemas de timezone na exibição
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    const dia = dataAtual.getDate();
    const dataLocal = new Date(ano, mes, dia, 12, 0, 0);
    
    const dataFormatada = format(dataLocal, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    console.log("📅 HEADER - Exibindo:", dataFormatada, "| Data pura:", formatarDataPura(dataAtual));
    
    return dataFormatada;
  };

  const navegarAnterior = () => {
    const novaData = subDays(dataAtual, 1);
    console.log("⬅️ Dia anterior:", formatarDataPura(novaData));
    onDataChange(novaData);
  };

  const navegarProximo = () => {
    const novaData = addDays(dataAtual, 1);
    console.log("➡️ Próximo dia:", formatarDataPura(novaData));
    onDataChange(novaData);
  };

  const irParaHoje = () => {
    const hoje = new Date();
    console.log("📍 Voltar para hoje:", formatarDataPura(hoje));
    onDataChange(hoje);
  };

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.role === "admin";

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={navegarAnterior}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={irParaHoje}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={navegarProximo}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-lg font-semibold text-gray-700 capitalize">
              {formatarDataExibicao()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <Link to={createPageUrl("GerenciarUsuarios")}>
                  <Button variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Usuários
                  </Button>
                </Link>

                <Link to={createPageUrl("ConfiguracaoTerapeutas")}>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Terapeutas
                  </Button>
                </Link>
              </>
            )}
            
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={onNovoAgendamento}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </div>
        </div>

        <Tabs value={unidadeSelecionada?.id || unidades[0]?.id} onValueChange={(value) => {
          const unidade = unidades.find(u => u.id === value);
          console.log("🏢 Unidade selecionada:", unidade?.nome);
          onUnidadeChange(unidade);
        }}>
          <TabsList className="bg-gray-100 p-1 h-auto">
            {unidades.map(unidade => (
              <TabsTrigger 
                key={unidade.id} 
                value={unidade.id}
                className="px-6 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                {unidade.nome}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}