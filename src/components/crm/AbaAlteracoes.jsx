import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Edit, UserPlus, ArrowRight, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AbaAlteracoes({ lead }) {
  const { data: historico = [] } = useQuery({
    queryKey: ['historico-alteracoes', lead.id],
    queryFn: () => base44.entities.HistoricoAlteracaoLead.filter({ lead_id: lead.id }, "-created_date"),
    initialData: [],
  });

  const iconesPorTipo = {
    criacao: <UserPlus className="w-4 h-4 text-green-600" />,
    edicao_dados: <Edit className="w-4 h-4 text-blue-600" />,
    mudanca_status: <ArrowRight className="w-4 h-4 text-purple-600" />,
    conversao: <CheckCircle className="w-4 h-4 text-green-600" />,
    adicao_interacao: <Clock className="w-4 h-4 text-orange-600" />,
    edicao_conversao: <Edit className="w-4 h-4 text-blue-600" />,
  };

  const coresPorTipo = {
    criacao: "bg-green-50 border-green-200",
    edicao_dados: "bg-blue-50 border-blue-200",
    mudanca_status: "bg-purple-50 border-purple-200",
    conversao: "bg-green-50 border-green-200",
    adicao_interacao: "bg-orange-50 border-orange-200",
    edicao_conversao: "bg-blue-50 border-blue-200",
  };

  const labelsPorTipo = {
    criacao: "Lead Criado",
    edicao_dados: "Dados Editados",
    mudanca_status: "Status Alterado",
    conversao: "Conversão",
    adicao_interacao: "Interação Adicionada",
    edicao_conversao: "Conversão Editada",
  };

  if (historico.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="font-medium">Nenhuma alteração registrada</p>
        <p className="text-sm mt-2">As alterações feitas neste lead aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-l-2 border-gray-200 pl-4 space-y-4">
        {historico.map((item, idx) => (
          <Card key={item.id} className={`${coresPorTipo[item.tipo_alteracao] || 'bg-gray-50 border-gray-200'} border-2`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {iconesPorTipo[item.tipo_alteracao] || <Clock className="w-4 h-4 text-gray-600" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {labelsPorTipo[item.tipo_alteracao] || item.tipo_alteracao}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {format(new Date(item.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {item.descricao}
                  </p>
                  
                  {item.campo_alterado && (
                    <div className="bg-white rounded-lg p-3 text-xs space-y-1">
                      <p className="font-medium text-gray-700">Campo: {item.campo_alterado}</p>
                      {item.valor_antigo && (
                        <p className="text-gray-600">
                          <span className="text-red-600">Antes:</span> {item.valor_antigo}
                        </p>
                      )}
                      {item.valor_novo && (
                        <p className="text-gray-600">
                          <span className="text-green-600">Depois:</span> {item.valor_novo}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Por: {item.usuario_nome || item.usuario_email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}