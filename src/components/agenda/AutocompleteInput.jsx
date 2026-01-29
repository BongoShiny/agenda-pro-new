import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function AutocompleteInput({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Buscar...",
  displayField = "nome",
  onSelect
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filteredOptions = options.filter(option => {
    const searchValue = value?.toLowerCase() || "";
    const optionValue = (option[displayField] || "").toLowerCase();
    return optionValue.includes(searchValue);
  }).slice(0, 8); // Limitar a 8 resultados

  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const item = listRef.current.children[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (option) => {
    onChange(option[displayField]);
    if (onSelect) {
      onSelect(option);
    }
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-11 border-gray-300 focus:border-blue-500"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <ul ref={listRef}>
            {filteredOptions.map((option, index) => (
              <li
                key={option.id || index}
                onClick={() => handleSelect(option)}
                className={`px-4 py-2 cursor-pointer ${
                  index === highlightedIndex
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">{option[displayField]}</div>
                {option.telefone && (
                  <div className="text-xs text-gray-500">📱 {option.telefone}</div>
                )}
                {option.email && !option.telefone && (
                  <div className="text-xs text-gray-500">✉️ {option.email}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}