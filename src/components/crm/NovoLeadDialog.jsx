import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NovoLeadDialog({ open, onOpenChange, onSave, unidades, vendedores, user, leadsExistentes }) {
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    sexo: "Masculino",
    unidade_id: "",
    unidade_nome: "",
    vendedor_id: user?.id || "",
    vendedor_nome: user?.full_name || "",
    status: "novo",
    origem: "whatsapp",
    interesse: "",
    temperatura: "morno",
    data_primeiro_contato: format(new Date(), "yyyy-MM-dd"),
    anotacoes_internas: "",
  });

  const handleUnidadeChange = (unidadeId) => {
    const unidade = unidades.find(u => u.id === unidadeId);
    setFormData(prev => ({
      ...prev,
      unidade_id: unidadeId,
      unidade_nome: unidade?.nome || ""
    }));
  };

  const handleVendedorChange = (vendedorId) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    setFormData(prev => ({
      ...prev,
      vendedor_id: vendedorId,
      vendedor_nome: vendedor?.nome || ""
    }));
  };

  const handleSubmit = () => {
    // Validar campos obrigatórios
    if (!formData.nome || !formData.telefone || !formData.unidade_id || !formData.vendedor_id) {
      alert("⚠️ Preencha os campos obrigatórios: Nome, Telefone, Unidade e Vendedor");
      return;
    }

    // Verificar se já existe lead com este telefone
    const telefoneNormalizado = formData.telefone.replace(/\D/g, '');
    const leadDuplicado = leadsExistentes?.find(lead => {
      const telExistente = lead.telefone.replace(/\D/g, '');
      return telExistente === telefoneNormalizado;
    });

    if (leadDuplicado) {
      alert("❌ Esse lead já foi cadastrado!\n\nNome: " + leadDuplicado.nome + "\nTelefone: " + leadDuplicado.telefone);
      return;
    }

    onSave(formData);
    setFormData({
      nome: "",
      telefone: "",
      email: "",
      sexo: "Masculino",
      unidade_id: "",
      unidade_nome: "",
      vendedor_id: user?.id || "",
      vendedor_nome: user?.full_name || "",
      status: "novo",
      origem: "whatsapp",
      interesse: "",
      temperatura: "morno",
      data_primeiro_contato: format(new Date(), "yyyy-MM-dd"),
      anotacoes_internas: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Sexo</Label>
            <Select value={formData.sexo} onValueChange={(value) => setFormData(prev => ({ ...prev, sexo: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={formData.unidade_id} onValueChange={handleUnidadeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vendedor Responsável *</Label>
            <Select value={formData.vendedor_id} onValueChange={handleVendedorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.filter(v => v.ativo).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={formData.origem} onValueChange={(value) => setFormData(prev => ({ ...prev, origem: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Temperatura</Label>
            <Select value={formData.temperatura} onValueChange={(value) => setFormData(prev => ({ ...prev, temperatura: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quente">🔥 Quente</SelectItem>
                <SelectItem value="morno">☀️ Morno</SelectItem>
                <SelectItem value="frio">❄️ Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Interesse</Label>
            <Input
              value={formData.interesse}
              onChange={(e) => setFormData(prev => ({ ...prev, interesse: e.target.value }))}
              placeholder="Serviço ou pacote de interesse"
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Anotações Internas</Label>
            <Textarea
              value={formData.anotacoes_internas}
              onChange={(e) => setFormData(prev => ({ ...prev, anotacoes_internas: e.target.value }))}
              placeholder="Observações sobre o lead..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.nome || !formData.telefone || !formData.unidade_id || !formData.vendedor_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Criar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}