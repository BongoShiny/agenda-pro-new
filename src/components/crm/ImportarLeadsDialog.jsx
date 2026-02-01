import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from 'xlsx';

export default function ImportarLeadsDialog({ open, onOpenChange }) {
  const [arquivo, setArquivo] = useState(null);
  const [unidadePadrao, setUnidadePadrao] = useState("");
  const [vendedorPadrao, setVendedorPadrao] = useState("");
  const [progresso, setProgresso] = useState({ total: 0, processados: 0, sucesso: 0, erros: 0 });
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errosDetalhados, setErrosDetalhados] = useState([]);
  const [usuario, setUsuario] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUsuario).catch(() => {});
  }, []);

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

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios_vendedores'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'vendedor');
    },
    initialData: [],
  });

  const registrarErro = async (tipo, mensagem, nomeLead, telefoneLead, numeroLinha, dadosLinha) => {
    try {
      await base44.entities.ErroImportacaoLead.create({
        usuario_email: usuario?.email || 'desconhecido',
        tipo_erro: tipo,
        mensagem_erro: mensagem,
        nome_lead: nomeLead || '',
        telefone_lead: telefoneLead || '',
        numero_linha: numeroLinha,
        dados_linha: JSON.stringify(dadosLinha)
      });
    } catch (error) {
      console.error('Erro ao registrar erro:', error);
    }
  };

  const processarArquivo = async () => {
    if (!arquivo) {
      alert("⚠️ Selecione um arquivo para importar");
      return;
    }

    setProcessando(true);
    setResultado(null);

    try {
      // 1. Ler arquivo Excel/CSV no navegador
      const fileData = await arquivo.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON (primeira linha = headers)
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!rawData || rawData.length < 2) {
        alert("⚠️ Arquivo vazio ou sem dados");
        setProcessando(false);
        return;
      }

      // Remover header e mapear colunas (A=nome, B=telefone, C=data, D=vendedor, E=unidade)
      const dados = rawData.slice(1).map(row => ({
        nome: row[0] || "",
        telefone: row[1] || "",
        data_entrada: row[2] || "",
        vendedor: row[3] || "",
        unidade: row[4] || "",
      })).filter(d => d.nome || d.telefone); // Filtrar linhas vazias

      if (dados.length === 0) {
        alert("⚠️ Nenhum dado válido encontrado no arquivo");
        setProcessando(false);
        return;
      }

      // 3. Processar e criar leads
      const total = dados.length;
      let sucesso = 0;
      let erros = 0;
      const listaErros = [];

      setProgresso({ total, processados: 0, sucesso: 0, erros: 0 });

      for (let i = 0; i < dados.length; i++) {
        const linha = dados[i];
        const numeroLinha = i + 2;

        try {
          // VENDEDOR: Usar IA para fazer matching inteligente
          let vendedor_id = "";
          let vendedor_nome = "";
          
          const vendedorNaPlanilha = String(linha.vendedor || "").trim();
          
          if (vendedorNaPlanilha) {
            try {
              const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um assistente que faz matching de vendedores. 
                
Dado o vendedor na planilha: "${vendedorNaPlanilha}"

Vendedores cadastrados no sistema:
${vendedores.map(v => `- ID: ${v.id}, Nome: ${v.nome}, Email: ${v.email || 'sem email'}`).join('\n')}

Usuários com cargo de vendedor:
${usuarios.map(u => `- Email: ${u.email}, Nome: ${u.full_name || 'sem nome'}`).join('\n')}

Encontre o vendedor correto fazendo matching por nome OU email. Seja flexível com variações de nome (ex: "João Silva" = "João").
Se encontrar, retorne o ID do vendedor. Se não encontrar, retorne null.`,
                response_json_schema: {
                  type: "object",
                  properties: {
                    vendedor_id: { type: ["string", "null"] },
                    confianca: { type: "string", enum: ["alta", "media", "baixa", "nenhuma"] },
                    motivo: { type: "string" }
                  }
                }
              });

              if (aiResponse.vendedor_id) {
                const vendedorEncontrado = vendedores.find(v => v.id === aiResponse.vendedor_id);
                if (vendedorEncontrado) {
                  vendedor_id = vendedorEncontrado.id;
                  vendedor_nome = vendedorEncontrado.nome;
                  console.log(`✅ IA encontrou vendedor: ${vendedor_nome} (${aiResponse.confianca})`);
                }
              }
            } catch (error) {
              console.warn('Erro ao usar IA para vendedor:', error);
            }
          }
          
          // Fallback para padrão se não encontrou
          if (!vendedor_id && vendedorPadrao) {
            const vendedorPadraoObj = vendedores.find(v => v.id === vendedorPadrao);
            if (vendedorPadraoObj) {
              vendedor_id = vendedorPadraoObj.id;
              vendedor_nome = vendedorPadraoObj.nome;
            }
          }

          // UNIDADE: Usar IA para fazer matching inteligente
          let unidade_id = "";
          let unidade_nome = "SEM UNIDADE";
          
          const unidadeNaPlanilha = String(linha.unidade || "").trim();
          
          if (unidadeNaPlanilha) {
            try {
              const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um assistente que faz matching de unidades. 
                
Dado a unidade na planilha: "${unidadeNaPlanilha}"

Unidades cadastradas no sistema:
${unidades.map(u => `- ID: ${u.id}, Nome: ${u.nome}`).join('\n')}

Encontre a unidade correta fazendo matching por nome. Seja flexível com variações (ex: "Centro" = "Unidade Centro").
Se encontrar, retorne o ID da unidade. Se não encontrar, retorne null.`,
                response_json_schema: {
                  type: "object",
                  properties: {
                    unidade_id: { type: ["string", "null"] },
                    confianca: { type: "string", enum: ["alta", "media", "baixa", "nenhuma"] },
                    motivo: { type: "string" }
                  }
                }
              });

              if (aiResponse.unidade_id) {
                const unidadeEncontrada = unidades.find(u => u.id === aiResponse.unidade_id);
                if (unidadeEncontrada) {
                  unidade_id = unidadeEncontrada.id;
                  unidade_nome = unidadeEncontrada.nome;
                  console.log(`✅ IA encontrou unidade: ${unidade_nome} (${aiResponse.confianca})`);
                }
              }
            } catch (error) {
              console.warn('Erro ao usar IA para unidade:', error);
            }
          }
          
          // Fallback para padrão se não encontrou
          if (!unidade_id && unidadePadrao) {
            const unidadePadraoObj = unidades.find(u => u.id === unidadePadrao);
            if (unidadePadraoObj) {
              unidade_id = unidadePadraoObj.id;
              unidade_nome = unidadePadraoObj.nome;
            }
          }

          // Processar data de entrada da planilha
          let dataEntrada = new Date().toISOString().split('T')[0];
          if (linha.data_entrada) {
            try {
              const dataStr = String(linha.data_entrada).trim();
              let dataParsed;
              
              if (dataStr.includes('/')) {
                // Formato: DD/MM/YYYY ou DD/MM/YYYY HH:MM
                const partes = dataStr.split(' ');
                const [dia, mes, ano] = partes[0].split('/');
                
                if (partes.length > 1 && partes[1].includes(':')) {
                  // Tem hora (DD/MM/YYYY HH:MM)
                  const [hora, minuto] = partes[1].split(':');
                  dataParsed = new Date(ano, mes - 1, dia, hora, minuto);
                } else {
                  // Só data (DD/MM/YYYY)
                  dataParsed = new Date(ano, mes - 1, dia);
                }
              } else {
                // Formato ISO ou outro
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

          // Delay de 1 segundo entre cada criação para evitar rate limit (429)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Erro na linha ${numeroLinha}:`, error);
          const mensagem = error.message || "Erro desconhecido";
          erros++;
          listaErros.push({
            linha: numeroLinha,
            nome: linha.nome || "(sem nome)",
            telefone: linha.telefone || "(sem telefone)",
            erro: mensagem
          });
          await registrarErro('erro_criacao', mensagem, linha.nome, linha.telefone, numeroLinha, linha);
        }

        setProgresso({ total, processados: i + 1, sucesso, erros });
      }

      setResultado({
        total: total,
        sucesso: sucesso,
        erros: erros,
      });
      setErrosDetalhados(listaErros);

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
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${resultado.erros === 0 ? 'text-green-900' : 'text-yellow-900'}`}>
                    {resultado.erros === 0 ? 'Importação Concluída!' : 'Importação Concluída com Avisos'}
                  </h4>
                  <p className={`text-sm ${resultado.erros === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                    {resultado.sucesso} lead(s) importado(s) com sucesso
                    {resultado.erros > 0 && ` | ${resultado.erros} erro(s) encontrado(s)`}
                  </p>

                  {/* Lista de Erros Detalhados */}
                  {errosDetalhados.length > 0 && (
                    <div className="mt-4 max-h-48 overflow-y-auto">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">❌ Erros encontrados:</p>
                      <div className="space-y-2">
                        {errosDetalhados.map((erro, idx) => (
                          <div key={idx} className="bg-white border border-yellow-200 rounded p-2 text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="font-semibold text-yellow-900">Linha {erro.linha}</span>
                              <span className="text-gray-600">{erro.nome}</span>
                            </div>
                            <p className="text-red-700">
                              <span className="font-semibold">Erro:</span> {erro.erro}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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