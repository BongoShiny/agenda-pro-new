import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Monitor, Shield, Building2, FileSpreadsheet, DollarSign, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MenuConta({ usuarioAtual, onClose }) {
  const [showDispositivos, setShowDispositivos] = useState(false);

  const { data: dispositivos = [] } = useQuery({
    queryKey: ['dispositivos-conectados', usuarioAtual?.email],
    queryFn: () => base44.entities.DispositivoConectado.filter({ usuario_email: usuarioAtual?.email }, "-created_date"),
    enabled: showDispositivos && !!usuarioAtual?.email,
    initialData: [],
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  // Obter informações do dispositivo atual
  const dispositivoAtual = `${navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '💻 Desktop'} - ${
    navigator.userAgent.includes('Chrome') ? 'Chrome' : 
    navigator.userAgent.includes('Firefox') ? 'Firefox' : 
    navigator.userAgent.includes('Safari') ? 'Safari' : 
    'Outro Navegador'
  }`;

  const sessaoAtualId = localStorage.getItem('sessao_id');

  const handleLogout = async () => {
    // Registrar logout no log
    await base44.entities.LogAcao.create({
      tipo: "logout",
      usuario_email: usuarioAtual?.email,
      descricao: `Logout realizado`,
      entidade_tipo: "Usuario"
    });

    // Remover sessão ativa
    const sessaoId = localStorage.getItem('sessao_id');
    if (sessaoId) {
      const sessoes = await base44.entities.SessaoAtiva.filter({ 
        usuario_email: usuarioAtual?.email,
        sessao_id: sessaoId
      });
      
      if (sessoes.length > 0) {
        await base44.entities.SessaoAtiva.delete(sessoes[0].id);
      }
      
      localStorage.removeItem('sessao_id');
    }

    // Fazer logout
    base44.auth.logout();
  };

  const cargoLabels = {
    administrador: { label: "Administrador", icon: Shield, color: "bg-blue-600" },
    superior: { label: "Superior", icon: Shield, color: "bg-blue-500" },
    gerencia_unidades: { label: "Gerência de Unidades", icon: Building2, color: "bg-purple-600" },
    financeiro: { label: "Financeiro", icon: FileSpreadsheet, color: "bg-green-600" },
    vendedor: { label: "Vendedor", icon: DollarSign, color: "bg-orange-600" },
    funcionario: { label: "Funcionário", icon: User, color: "bg-gray-600" }
  };

  const cargo = usuarioAtual?.cargo || "funcionario";
  const cargoInfo = cargoLabels[cargo] || cargoLabels.funcionario;
  const CargoIcon = cargoInfo.icon;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Minha Conta</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${cargoInfo.color.replace('bg-', 'bg-opacity-10 bg-')}`}>
            <CargoIcon className={`w-6 h-6 ${cargoInfo.color.replace('bg-', 'text-')}`} />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{usuarioAtual?.full_name}</div>
            <div className="text-xs text-gray-500">{usuarioAtual?.email}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Cargo</label>
          <Badge className={`${cargoInfo.color} text-white border-0 mt-1`}>
            <CargoIcon className="w-3 h-3 mr-1" />
            {cargoInfo.label}
          </Badge>
        </div>

        {!showDispositivos ? (
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setShowDispositivos(true)}
          >
            <Monitor className="w-4 h-4 mr-2" />
            Ver Dispositivos Conectados
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 uppercase">Dispositivos</label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDispositivos(false)}
                className="h-6 text-xs"
              >
                Ocultar
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Dispositivo Atual - Sempre em primeiro */}
              <div className="p-3 rounded-lg border-2 bg-blue-50 border-blue-400">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <Monitor className="w-4 h-4 mt-0.5 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{dispositivoAtual}</div>
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Este dispositivo (agora)
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-400">
                    Conectado
                  </Badge>
                </div>
              </div>

              {/* Outros dispositivos */}
              {dispositivos
                .filter(disp => disp.dispositivo !== dispositivoAtual || !disp.sessao_ativa)
                .map(disp => (
                  <div 
                    key={disp.id} 
                    className={`p-3 rounded-lg border ${disp.sessao_ativa ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        <Monitor className={`w-4 h-4 mt-0.5 ${disp.sessao_ativa ? 'text-green-600' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{disp.dispositivo}</div>
                          {disp.ip && (
                            <div className="text-xs text-gray-500 mt-1">IP: {disp.ip}</div>
                          )}
                          {disp.localizacao && (
                            <div className="text-xs text-gray-500">📍 {disp.localizacao}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {disp.data_login ? format(new Date(disp.data_login), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Data desconhecida"}
                          </div>
                        </div>
                      </div>
                      {disp.sessao_ativa ? (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>

        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
          Por segurança, apenas 1 dispositivo pode estar conectado por vez
        </div>
      </div>
    </div>
  );
}