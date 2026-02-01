import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";

export default function ImportarLeadsDialog({ open, onOpenChange }) {
  const [arquivo, setArquivo] = useState(null);
  const [unidadePadrao, setUnidadePadrao] = useState("");
  const [vendedorPadrao, setVendedorPadrao] = useState("");
  const [progresso, setProgresso] = useState({ total: 0, processados: 0, sucesso: 0, erros: 0 });
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const queryClient = useQueryClient();

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => base44.entities.Vendedor.list("nome"),
    initialData: [],
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list("nome"),
    initialData: [],
  });

  const processarArquivo = async () => {
    if (!arquivo) {
      alert("⚠️ Selecione um arquivo para importar");
      return;
    }

    setProcessando(true);
    setResultado(null);

    try {
      // 1. Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file: arquivo });

      // 2. Extrair dados da planilha
      const jsonSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            telefone: { type: "string" },
            data_entrada: { type: "string" },
            vendedor: { type: "string" },
            unidade: { type: "string" },
          },
        },
      };

      const extrairResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: jsonSchema,
      });

      if (extrairResult.status === "error") {
        alert(`❌ Erro ao processar arquivo: ${extrairResult.details}`);
        setProcessando(false);
        return;
      }

      const dados = extrairResult.output;

      if (!Array.isArray(dados) || dados.length === 0) {
        alert("⚠️ Nenhum dado encontrado no arquivo");
        setProcessando(false);
        return;
      }

      // 3. Processar e criar leads
      const total = dados.length;
      let sucesso = 0;
      let erros = 0;

      setProgresso({ total, processados: 0, sucesso: 0, erros: 0 });

      for (let i = 0; i < dados.length; i++) {
        const linha = dados[i];

        try {
          // Encontrar vendedor pelo nome (ou usar padrão)
          let vendedor_id = vendedorPadrao;
          let vendedor_nome = vendedores.find(v => v.id === vendedorPadrao)?.nome || "";
          
          if (linha.vendedor) {
            const vendedorEncontrado = vendedores.find(v => 
              v.nome.toLowerCase().includes(linha.vendedor.toLowerCase())
            );
            if (vendedorEncontrado) {
              vendedor_id = vendedorEncontrado.id;
              vendedor_nome = vendedorEncontrado.nome;
            }
          }

          // Encontrar unidade pelo nome (ou usar padrão)
          let unidade_id = unidadePadrao;
          let unidade_nome = unidades.find(u => u.id === unidadePadrao)?.nome || "";
          
          if (linha.unidade) {
            const unidadeEncontrada = unidades.find(u => 
              u.nome.toLowerCase().includes(linha.unidade.toLowerCase())
            );
            if (unidadeEncontrada) {
              unidade_id = unidadeEncontrada.id;
              unidade_nome = unidadeEncontrada.nome;
            }
          }

          // Processar data de entrada da planilha
          let dataEntrada = new Date().toISOString().split('T')[0];
          if (linha.data_entrada) {
            try {
              // Tentar parsear data no formato DD/MM/YYYY HH:MM ou DD/MM/YYYY
              const dataStr = String(linha.data_entrada).trim();
              let dataParsed;
              
              if (dataStr.includes('/')) {
                const partes = dataStr.split(' ');
                const [dia, mes, ano] = partes[0].split('/');
                dataParsed = new Date(ano, mes - 1, dia);
              } else {
                dataParsed = new Date(dataStr);
              }
              
              if (!isNaN(dataParsed.getTime())) {
                dataEntrada = dataParsed.toISOString().split('T')[0];
              }
            } catch (error) {
              console.warn("Erro ao parsear data:", linha.data_entrada);
            }
          }

          // Criar lead
          await base44.entities.Lead.create({
            nome: linha.nome || `Lead ${i + 1}`,
            telefone: linha.telefone || "",
            vendedor_id: vendedor_id,
            vendedor_nome: vendedor_nome,
            unidade_id: unidade_id || "",
            unidade_nome: unidade_nome || "SEM UNIDADE",
            status: "lead",
            origem: "importacao_planilha",
            temperatura: "morno",
            data_entrada: dataEntrada,
            data_primeiro_contato: dataEntrada,
          });

          sucesso++;
        } catch (error) {
          console.error(`Erro na linha ${i + 1}:`, error);
          erros++;
        }

        setProgresso({ total, processados: i + 1, sucesso, erros });
      }

      setResultado({
        total: total,
        sucesso: sucesso,
        erros: erros,
      });

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      if (erros === 0) {
        setTimeout(() => {
          onOpenChange(false);
          setArquivo(null);
          setProcessando(false);
        }, 2000);
      }
    } catch (error) {
      alert(`❌ Erro ao importar: ${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Importar Leads de Planilha
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instruções */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Formato da Planilha</h4>
            <p className="text-sm text-blue-700 mb-2">
              A planilha deve conter as seguintes colunas (nessa ordem):
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li><strong>Nome</strong> - Nome do lead (coluna A)</li>
              <li><strong>Telefone</strong> - Telefone de contato (coluna B)</li>
              <li><strong>Data e hora de entrada</strong> - Formato DD/MM/YYYY HH:MM (coluna C)</li>
              <li><strong>vendedor</strong> - Nome do vendedor (coluna D - opcional)</li>
              <li><strong>unidade</strong> - Nome da unidade (coluna E - opcional)</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              💡 Se vendedor ou unidade estiverem vazios, será usado "SEM UNIDADE" ou deixado sem vendedor.
            </p>
          </div>

          {/* Valores Padrão */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendedor Padrão (opcional)</Label>
              <Select value={vendedorPadrao} onValueChange={setVendedorPadrao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sem vendedor padrão</SelectItem>
                  {vendedores.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unidade Padrão (opcional)</Label>
              <Select value={unidadePadrao} onValueChange={setUnidadePadrao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>SEM UNIDADE</SelectItem>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload */}
          <div>
            <Label>Arquivo (Excel ou CSV) *</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:bg-gray-50 transition-colors">
                <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {arquivo ? arquivo.name : "Clique para selecionar arquivo"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos aceitos: .xlsx, .xls, .csv
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setArquivo(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Progresso */}
          {processando && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Processando...</span>
                <span className="text-sm text-blue-700">
                  {progresso.processados} / {progresso.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progresso.processados / progresso.total) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-blue-700">
                <span>✅ Sucesso: {progresso.sucesso}</span>
                <span>❌ Erros: {progresso.erros}</span>
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className={`border-2 rounded-lg p-4 ${resultado.erros === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                {resultado.erros === 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                )}
                <div>
                  <h4 className={`font-semibold mb-1 ${resultado.erros === 0 ? 'text-green-900' : 'text-yellow-900'}`}>
                    {resultado.erros === 0 ? 'Importação Concluída!' : 'Importação Concluída com Avisos'}
                  </h4>
                  <p className={`text-sm ${resultado.erros === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                    {resultado.sucesso} lead(s) importado(s) com sucesso
                    {resultado.erros > 0 && ` | ${resultado.erros} erro(s) encontrado(s)`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={processando}
            >
              Fechar
            </Button>
            <Button 
              onClick={processarArquivo}
              disabled={!arquivo || processando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {processando ? "Importando..." : "Importar Leads"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}