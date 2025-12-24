import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, X, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AlertasModal({ usuarioAtual }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: alertas = [] } = useQuery({
    queryKey: ['alertas-usuario', usuarioAtual?.email],
    queryFn: () => base44.entities.Alerta.filter({
      usuario_email: usuarioAtual?.email,
      lido: false
    }),
    initialData: [],
    refetchInterval: 5000, // Verificar a cada 5 segundos
    enabled: !!usuarioAtual?.email
  });

  const marcarLidoMutation = useMutation({
    mutationFn: (alertaId) => base44.entities.Alerta.update(alertaId, { lido: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas-usuario'] });
    }
  });

  const handleMarcarLido = (alertaId) => {
    marcarLidoMutation.mutate(alertaId);
  };

  // Auto-abrir quando há alertas novos
  React.useEffect(() => {
    if (alertas.length > 0) {
      setOpen(true);
    }
  }, [alertas.length]);

  if (alertas.length === 0) {
    return null;
  }

  return (
    <>
      {/* Badge de notificação */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-20 z-50 bg-red-600 hover:bg-red-700 shadow-lg animate-pulse"
      >
        <AlertTriangle className="w-5 h-5 mr-2" />
        {alertas.length} Alerta{alertas.length > 1 ? 's' : ''}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              Você tem {alertas.length} alerta{alertas.length > 1 ? 's' : ''} não lido{alertas.length > 1 ? 's' : ''}!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {alertas.map(alerta => (
              <div key={alerta.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-red-900">{alerta.titulo}</h3>
                    </div>
                    <p className="text-sm text-red-800 whitespace-pre-wrap">{alerta.mensagem}</p>
                    <p className="text-xs text-red-600 mt-2">
                      Enviado por: {alerta.enviado_por}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarcarLido(alerta.id)}
                    className="border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Marcar Lido
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}