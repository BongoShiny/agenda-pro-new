import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Phone, Mail, MapPin, Flame, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  lead: { label: "Lead", color: "bg-green-500", borderColor: "border-green-200" },
  avulso: { label: "Avulso", color: "bg-yellow-500", borderColor: "border-yellow-200" },
  plano_terapeutico: { label: "Plano Terapêutico", color: "bg-amber-700", borderColor: "border-amber-200" },
  renovacao: { label: "Renovação", color: "bg-blue-500", borderColor: "border-blue-200" },
};

const temperaturaConfig = {
  quente: { icon: "🔥", label: "Quente", color: "text-red-600", bg: "bg-red-50" },
  morno: { icon: "☀️", label: "Morno", color: "text-yellow-600", bg: "bg-yellow-50" },
  frio: { icon: "❄️", label: "Frio", color: "text-blue-600", bg: "bg-blue-50" },
};

export default function KanbanView({ leads, onStatusChange, onLeadClick, colunasVisiveis }) {
  const todasColunas = [
    { id: "lead", title: "Lead" },
    { id: "avulso", title: "Avulso" },
    { id: "plano_terapeutico", title: "Plano Terapêutico" },
    { id: "renovacao", title: "Renovação" },
  ];

  // Filtrar colunas baseado no que o usuário pode ver
  const columns = colunasVisiveis 
    ? todasColunas.filter(col => colunasVisiveis.includes(col.id))
    : todasColunas;

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const leadId = draggableId;
    const novoStatus = destination.droppableId;

    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.status !== novoStatus) {
      onStatusChange(leadId, novoStatus);
    }
  };

  const getLeadsByStatus = (status) => {
    return leads.filter(l => l.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
        {columns.map((column) => {
          const config = statusConfig[column.id];
          const columnLeads = getLeadsByStatus(column.id);

          return (
            <div key={column.id} className="flex flex-col bg-gray-50 rounded-lg p-3">
              {/* Header da Coluna */}
              <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${config.borderColor}`}>
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <Badge className={`${config.color} text-white`}>
                  {columnLeads.length}
                </Badge>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2 min-h-[200px] rounded-lg p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
                    }`}
                  >
                    {columnLeads.map((lead, index) => {
                      const temp = temperaturaConfig[lead.temperatura] || temperaturaConfig.morno;

                      return (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onLeadClick(lead)}
                              className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400 rotate-2' : ''
                              }`}
                            >
                              {/* Nome e Temperatura */}
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
                                  {lead.nome}
                                </h4>
                                <div className={`flex items-center gap-1 ${temp.color} ${temp.bg} px-2 py-0.5 rounded-md`}>
                                  <span className="text-sm">{temp.icon}</span>
                                  <span className="text-xs font-medium">{temp.label}</span>
                                </div>
                              </div>

                              {/* Vendedor */}
                              {lead.vendedor_nome && (
                                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                                  <Users className="w-3 h-3" />
                                  <span className="line-clamp-1">{lead.vendedor_nome}</span>
                                </div>
                              )}

                              {/* Telefone */}
                              <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                <Phone className="w-3 h-3" />
                                <span>{lead.telefone}</span>
                              </div>

                              {/* Email */}
                              {lead.email && (
                                <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                  <Mail className="w-3 h-3" />
                                  <span className="line-clamp-1">{lead.email}</span>
                                </div>
                              )}

                              {/* Unidade */}
                              {lead.unidade_nome && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 pt-2 border-t">
                                  <MapPin className="w-3 h-3" />
                                  <span className="line-clamp-1">{lead.unidade_nome}</span>
                                </div>
                              )}

                              {/* Interesse */}
                              {lead.interesse && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs text-gray-500 line-clamp-1">
                                    <span className="font-medium">Interesse:</span> {lead.interesse}
                                  </p>
                                </div>
                              )}

                              {/* Tentativas de Contato */}
                              {lead.tentativas_contato > 0 && (
                                <div className="mt-2 flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {lead.tentativas_contato} {lead.tentativas_contato === 1 ? 'tentativa' : 'tentativas'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {/* Mensagem quando vazio */}
                    {columnLeads.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                        Nenhum lead aqui
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}