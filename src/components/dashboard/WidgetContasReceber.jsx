import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function WidgetContasReceber({ agendamentos }) {
  const hoje = new Date().toISOString().split('T')[0];
  
  const contasAPagar = agendamentos
    .filter(ag => {
      if (ag.status === "bloqueio" || ag.tipo === "bloqueio") return false;
      return (ag.falta_quanto > 0);
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  const totalAReceber = contasAPagar.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);
  const contasAtrasadas = contasAPagar.filter(ag => ag.data < hoje);
  const totalAtrasado = contasAtrasadas.reduce((sum, ag) => sum + (ag.falta_quanto || 0), 0);

  const maioresDebitos = contasAPagar
    .sort((a, b) => (b.falta_quanto || 0) - (a.falta_quanto || 0))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
        <Wallet className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total a Receber</p>
              <p className="text-lg font-bold text-orange-600">{formatarMoeda(totalAReceber)}</p>
              <p className="text-xs text-gray-500 mt-1">{contasAPagar.length} conta{contasAPagar.length !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Atrasadas
              </p>
              <p className="text-lg font-bold text-red-600">{formatarMoeda(totalAtrasado)}</p>
              <p className="text-xs text-gray-500 mt-1">{contasAtrasadas.length} conta{contasAtrasadas.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {maioresDebitos.length > 0 && (
            <>
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Maiores Débitos</p>
                <div className="space-y-2">
                  {maioresDebitos.map(ag => (
                    <div key={ag.id} className="flex items-center justify-between text-xs p-2 rounded hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ag.cliente_nome}</p>
                        <p className="text-gray-500">
                          {format(new Date(ag.data + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <p className={`font-bold ${ag.data < hoje ? 'text-red-600' : 'text-orange-600'}`}>
                        {formatarMoeda(ag.falta_quanto)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Link to={createPageUrl("RelatoriosFinanceiros")}>
                <Button variant="outline" className="w-full" size="sm">
                  Ver Relatório Completo
                </Button>
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}