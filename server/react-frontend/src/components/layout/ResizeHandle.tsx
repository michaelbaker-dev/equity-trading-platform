// Resize handle component for panel resizing
// Provides visual feedback and handles drag interactions

import React from 'react';

interface ResizeHandleProps {
  id: string;
  onMouseDown: (event: React.MouseEvent) => void;
  isActive?: boolean;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  id,
  onMouseDown,
  isActive = false,
  className = ''
}) => {
  const handleMouseDown = (event: React.MouseEvent) => {
    console.log(`🎯 ResizeHandle ${id} clicked at (${event.clientX}, ${event.clientY})`);
    console.log(`🎯 Event details:`, {
      button: event.button,
      buttons: event.buttons,
      target: event.target,
      currentTarget: event.currentTarget
    });
    
    // Prevent default and stop propagation
    event.preventDefault();
    event.stopPropagation();
    
    onMouseDown(event);
  };

  return (
    <div
      id={id}
      className={`resize-handle ${isActive ? 'active' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      style={{
        cursor: 'col-resize',
        userSelect: 'none',
        backgroundColor: isActive ? '#007bff' : '#ddd',
        transition: 'background-color 0.2s'
      }}
      title="Drag to resize panels"
    />
  );
};