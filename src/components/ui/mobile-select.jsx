import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function MobileResponsiveSelect({ value, onValueChange, placeholder, children, ...props }) {
  const [open, setOpen] = React.useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Desktop: usar Select normal
  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} {...props}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: usar Drawer (bottom sheet)
  const items = React.Children.toArray(children);
  const selectedItem = items.find(child => child.props.value === value);
  const selectedLabel = selectedItem?.props.children || placeholder;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between h-10 px-3"
          style={{ minHeight: '44px' }}
        >
          <span className="truncate">{selectedLabel}</span>
          <svg 
            className="w-4 h-4 ml-2 flex-shrink-0" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DrawerTrigger>
      <DrawerContent style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <DrawerHeader>
          <DrawerTitle>{placeholder}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-96 overflow-y-auto">
          {items.map((child, idx) => (
            <button
              key={idx}
              onClick={() => {
                onValueChange(child.props.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-4 rounded-lg mb-2 transition-colors ${
                child.props.value === value
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={{ minHeight: '44px' }}
            >
              {child.props.children}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}