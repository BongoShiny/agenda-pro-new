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
        data_pagamento: agendamento.data_pagamento,
        anotacao_venda: agendamento.anotacao_venda
      });
    }
  }, [agendamento, aberto]);

  const handleSalvar = () => {
    onSalvar({
      data_pagamento: valores.data_pagamento,
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
          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              value={valores.data_pagamento || ""}
              onChange={(e) => setValores(prev => ({ ...prev, data_pagamento: e.target.value }))}
            />
          </div>

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