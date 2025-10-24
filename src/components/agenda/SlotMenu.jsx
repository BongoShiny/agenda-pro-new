import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, Ban } from "lucide-react";

export default function SlotMenu({ open, onOpenChange, onNovoAgendamento, onBloquearHorario, children, isAdmin }) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-left hover:bg-blue-50"
            onClick={() => {
              onNovoAgendamento();
              onOpenChange(false);
            }}
          >
            <Plus className="w-4 h-4 mr-2 text-blue-600" />
            Novo Agendamento
          </Button>
          
          {isAdmin && (
            <Button
              variant="ghost"
              className="w-full justify-start text-left hover:bg-red-50"
              onClick={() => {
                onBloquearHorario();
                onOpenChange(false);
              }}
            >
              <Ban className="w-4 h-4 mr-2 text-red-600" />
              Bloquear Horário
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}