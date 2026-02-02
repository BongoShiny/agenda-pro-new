import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

const formatarDataPagamento = (dataString) => {
  if (!dataString || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) return "";
  return dataString;
};

const formatarMoeda = (valor) => {
  if (!valor && valor !== 0) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function DialogEditarAnotacoes({
  aberto,
  agendamento,
  vendedores,
  onClose,
  onSalvar,
  tipoEdicao = "completo" // "completo" ou "apenas_anotacoes"
}) {
  const [valores, setValores] = React.useState({
    data_pagamento: agendamento?.data_pagamento,
    anotacao_venda: agendamento?.anotacao_venda
  });

  React.useEffect(() => {
    if (agendamento) {
      setValores({
        vendedor_id: agendamento.vendedor_id,
        vendedor_nome: agendamento.vendedor_nome,
        valor_combinado: agendamento.valor_combinado,
        sinal: agendamento.sinal,
        recebimento_2: agendamento.recebimento_2,
        final_pagamento: agendamento.final_pagamento,
        anotacao_venda: agendamento.anotacao_venda
      });
    }
  }, [agendamento, aberto]);

  const totalPago = (valores.sinal || 0) + (valores.recebimento_2 || 0) + (valores.final_pagamento || 0);
  const faltaQuanto = (valores.valor_combinado || 0) - totalPago;

  const handleSalvar = () => {
    onSalvar({
      vendedor_id: valores.vendedor_id,
      vendedor_nome: valores.vendedor_nome,
      valor_combinado: valores.valor_combinado,
      sinal: valores.sinal,
      recebimento_2: valores.recebimento_2,
      final_pagamento: valores.final_pagamento,
      falta_quanto: faltaQuanto,
      anotacao_venda: valores.anotacao_venda
    });
  };

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Dados - {agendamento?.cliente_nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {tipoEdicao === "completo" && (
            <>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={valores.vendedor_id || ""} onValueChange={(value) => {
                  const vendedor = vendedores.find(v => v.id === value);
                  setValores(prev => ({
                    ...prev,
                    vendedor_id: value,
                    vendedor_nome: vendedor?.nome || ""
                  }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sem vendedor</SelectItem>
                    {vendedores.filter(v => v.ativo).map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Combinado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valores.valor_combinado || ""}
                    onChange={(e) => setValores(prev => ({ ...prev, valor_combinado: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sinal</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valores.sinal || ""}
                    onChange={(e) => setValores(prev => ({ ...prev, sinal: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recebimento 2</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valores.recebimento_2 || ""}
                    onChange={(e) => setValores(prev => ({ ...prev, recebimento_2: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Final</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valores.final_pagamento || ""}
                    onChange={(e) => setValores(prev => ({ ...prev, final_pagamento: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 pb-2 bg-gray-50 p-3 rounded">
                <div>
                  <p className="text-sm text-gray-600">Total Pago</p>
                  <p className="text-lg font-bold text-emerald-600">{formatarMoeda(totalPago)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Falta Quanto</p>
                  <p className="text-lg font-bold text-orange-600">{formatarMoeda(faltaQuanto)}</p>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Anotação da Venda</Label>
            <Textarea
              value={valores.anotacao_venda || ""}
              onChange={(e) => setValores(prev => ({ ...prev, anotacao_venda: e.target.value }))}
              placeholder="Anotação da venda..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}