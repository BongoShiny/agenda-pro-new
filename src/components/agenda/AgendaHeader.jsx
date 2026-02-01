import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, ShieldCheck, ExternalLink, DollarSign } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import RankingVendedores from "./RankingVendedores";

// Usar mesma lógica de formatação em todos os componentes
// FUNÇÃO CRÍTICA: Garantir que NUNCA haja conversão de timezone
const formatarDataPura = (data) => {
  // Usar getFullYear, getMonth, getDate (locais) - NUNCA UTC
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const resultado = `${ano}-${mes}-${dia}`;
  console.log("🔧 formatarDataPura | Input:", data.toString(), "| Output:", resultado);
  return resultado;
};

export default function AgendaHeader({ 
  dataAtual,
  unidades,
  unidadeSelecionada,
  onUnidadeChange,
  onDataChange,
  onNovoAgendamento,
  usuarioAtual,
  isVendedor,
  navigate
}) {
  const formatarDataExibicao = () => {
    // NUNCA usar new Date() com parâmetros - pode causar timezone issues
    // Usar a data local direto
    const dataFormatada = format(dataAtual, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const dataPura = formatarDataPura(dataAtual);
    
    console.log("📅 HEADER EXIBIÇÃO:", {
      dataBruta: dataAtual.toString(),
      dataFormatada: dataFormatada,
      dataPura: dataPura,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return dataFormatada;
  };

  const navegarAnterior = () => {
    console.log("⬅️⬅️⬅️ NAVEGAÇÃO ANTERIOR ⬅️⬅️⬅️");
    console.log("Data atual (antes):", dataAtual.toString());
    
    // Usar subDays do date-fns (mantém hora local)
    let novaData = subDays(dataAtual, 1);
    
    // Pular domingo (0 = domingo)
    if (novaData.getDay() === 0) {
      novaData = subDays(novaData, 1);
    }
    
    console.log("Nova data (depois):", novaData.toString());
    console.log("Data formatada:", formatarDataPura(novaData));
    console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    onDataChange(novaData);
  };

  const navegarProximo = () => {
    console.log("➡️➡️➡️ NAVEGAÇÃO PRÓXIMA ➡️➡️➡️");
    console.log("Data atual (antes):", dataAtual.toString());
    
    // Usar addDays do date-fns (mantém hora local)
    let novaData = addDays(dataAtual, 1);
    
    // Pular domingo (0 = domingo)
    if (novaData.getDay() === 0) {
      novaData = addDays(novaData, 1);
    }
    
    console.log("Nova data (depois):", novaData.toString());
    console.log("Data formatada:", formatarDataPura(novaData));
    console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    onDataChange(novaData);
  };

  const irParaHoje = () => {
    console.log("📍📍📍 VOLTAR PARA HOJE 📍📍📍");
    console.log("Data atual (antes):", dataAtual.toString());
    
    // Criar hoje sempre às 12h LOCAL
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const dia = agora.getDate();
    let hoje = new Date(ano, mes, dia, 12, 0, 0, 0);
    
    // Se hoje for domingo, ir para segunda
    if (hoje.getDay() === 0) {
      hoje = addDays(hoje, 1);
    }
    
    console.log("Hoje (depois):", hoje.toString());
    console.log("Data formatada:", formatarDataPura(hoje));
    console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    onDataChange(hoje);
  };

  const isAdmin = usuarioAtual?.cargo === "administrador" || usuarioAtual?.cargo === "superior" || usuarioAtual?.role === "admin" || usuarioAtual?.cargo === "gerencia_unidades" || usuarioAtual?.cargo === "financeiro" || usuarioAtual?.cargo === "pos_venda";
  
  // Todos podem ver o CRM
  const mostrarCRM = true;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-3 md:px-6 py-3 md:py-4">
        {/* Mobile: Layout compacto */}
        <div className="block md:hidden space-y-3">
          <div className="flex items-center justify-between">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  <h1 className="text-lg font-bold text-gray-900">Agenda</h1>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataAtual}
                  onSelect={(date) => {
                    if (date) {
                      if (date.getDay() === 0) {
                        alert("Domingos não estão disponíveis na agenda.");
                        return;
                      }
                      const ano = date.getFullYear();
                      const mes = date.getMonth();
                      const dia = date.getDate();
                      const dataLocal = new Date(ano, mes, dia, 12, 0, 0, 0);
                      onDataChange(dataLocal);
                    }
                  }}
                  locale={ptBR}
                  defaultMonth={dataAtual}
                  disabled={(date) => date.getDay() === 0}
                />
              </PopoverContent>
            </Popover>
            
            <Button 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={onNovoAgendamento}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navegarAnterior}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={irParaHoje} className="flex-1">
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={navegarProximo}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs font-semibold text-gray-700 text-center capitalize">
            {format(dataAtual, "EEE, dd/MM/yyyy", { locale: ptBR })}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to={createPageUrl("Administrador")}>
                <Button variant="outline" size="sm" className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  Superior
                </Button>
              </Link>
            )}
            {mostrarCRM && (
              <Link to={createPageUrl("CRM")}>
                <Button variant="outline" size="sm" className="bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  CRM
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Desktop: Layout completo */}
        <div className="hidden md:flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataAtual}
                  onSelect={(date) => {
                    if (date) {
                      if (date.getDay() === 0) {
                        alert("Domingos não estão disponíveis na agenda.");
                        return;
                      }
                      const ano = date.getFullYear();
                      const mes = date.getMonth();
                      const dia = date.getDate();
                      const dataLocal = new Date(ano, mes, dia, 12, 0, 0, 0);
                      onDataChange(dataLocal);
                    }
                  }}
                  locale={ptBR}
                  defaultMonth={dataAtual}
                  disabled={(date) => date.getDay() === 0}
                />
              </PopoverContent>
            </Popover>
            
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
               <Link to={createPageUrl("Administrador")}>
                 <Button variant="outline" className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
                   <ShieldCheck className="w-4 h-4 mr-2" />
                   Superior
                 </Button>
               </Link>
             )}
             
             {mostrarCRM && (
               <Link to={createPageUrl("CRM")}>
                 <Button variant="outline" className="bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100">
                   <ExternalLink className="w-4 h-4 mr-2" />
                   CRM
                 </Button>
               </Link>
             )}

             {(isVendedor || isAdmin) && navigate && (
               <>
                 <RankingVendedores />
                 <Button 
                   className="bg-green-600 hover:bg-green-700" 
                   onClick={() => navigate(createPageUrl("LancarVendas"))}
                 >
                   <DollarSign className="w-4 h-4 mr-2" />
                   Lançar Vendas
                 </Button>
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
          onUnidadeChange(unidade);
        }}>
          <TabsList className="bg-gray-100 p-1 h-auto w-full overflow-x-auto flex">
            {unidades.map(unidade => (
              <TabsTrigger 
                key={unidade.id} 
                value={unidade.id}
                className="px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap"
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