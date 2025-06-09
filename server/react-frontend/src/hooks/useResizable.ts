// Resizable panels hook - converts existing resize functionality to React
// Maintains the same resize behavior as the original vanilla JS implementation

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '../stores/uiStore';
import type { PanelWidths } from '../types';

interface UseResizableOptions {
  minWidth?: number;
  maxWidth?: number;
  containerWidth?: number;
}

export const useResizable = (options: UseResizableOptions = {}) => {
  const {
    minWidth = 300,
    maxWidth = 800
  } = options;

  const { panelWidths, setPanelWidths } = useUIStore();
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialWidths, setInitialWidths] = useState<PanelWidths>(panelWidths);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  const leftHandleRef = useRef<HTMLDivElement>(null);
  const rightHandleRef = useRef<HTMLDivElement>(null);

  // Calculate constrained widths
  const calculateConstrainedWidths = useCallback((
    newLeftWidth: number,
    _newMiddleWidth: number,
    newRightWidth: number
  ): PanelWidths => {
    const totalAvailableWidth = containerWidth - 16; // Account for resize handles
    
    // Ensure minimum widths
    const constrainedLeft = Math.max(minWidth, Math.min(maxWidth, newLeftWidth));
    const constrainedRight = Math.max(minWidth, Math.min(maxWidth, newRightWidth));
    
    // Calculate remaining width for middle panel
    const remainingWidth = totalAvailableWidth - constrainedLeft - constrainedRight;
    const constrainedMiddle = Math.max(400, remainingWidth); // Middle panel minimum (reduced from 600px)
    
    return {
      left: constrainedLeft,
      middle: constrainedMiddle,
      right: constrainedRight
    };
  }, [minWidth, maxWidth, containerWidth]);

  // Handle mouse down on resize handles
  const handleMouseDown = useCallback((
    event: React.MouseEvent,
    handle: 'left' | 'right'
  ) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log(`🖱️  Mouse down on ${handle} handle at ${event.clientX}`);
    console.log(`📊 Current panel widths:`, panelWidths);
    console.log(`📏 Container width: ${containerWidth}px`);
    
    setIsDragging(handle);
    setDragStartX(event.clientX);
    setInitialWidths(panelWidths);
    
    // Add visual feedback
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    console.log(`🖱️  Started dragging ${handle} handle`);
  }, [panelWidths]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStartX;
    console.log(`🖱️  Mouse move: isDragging=${isDragging}, deltaX=${deltaX}, clientX=${event.clientX}`);
    let newWidths: PanelWidths;

    if (isDragging === 'left') {
      // Dragging left handle affects left and middle panels
      const newLeftWidth = initialWidths.left + deltaX;
      
      newWidths = calculateConstrainedWidths(
        newLeftWidth,
        initialWidths.middle - deltaX,
        initialWidths.right
      );
    } else {
      // Dragging right handle affects middle and right panels
      const newMiddleWidth = initialWidths.middle + deltaX;
      const newRightWidth = initialWidths.right - deltaX;
      
      newWidths = calculateConstrainedWidths(
        initialWidths.left,
        newMiddleWidth,
        newRightWidth
      );
    }

    console.log(`🔄 Dragging ${isDragging}, deltaX: ${deltaX}, newWidths:`, newWidths);
    setPanelWidths(newWidths);
  }, [isDragging, dragStartX, initialWidths, calculateConstrainedWidths, setPanelWidths]);

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      console.log(`🖱️  Stopped dragging ${isDragging} handle`);
      setIsDragging(null);
      
      // Remove visual feedback
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isDragging]);

  // Add global event listeners for drag operations
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle window resize to maintain proportions
  useEffect(() => {
    const handleWindowResize = () => {
      const newContainerWidth = window.innerWidth;
      setContainerWidth(newContainerWidth);
      
      console.log(`📏 Window resized to: ${newContainerWidth}px`);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Reset to equal widths function
  const resetToEqualWidths = useCallback(() => {
    const equalWidth = Math.floor((containerWidth - 16) / 3); // Account for resize handles
    const equalWidths: PanelWidths = {
      left: Math.max(minWidth, equalWidth),
      middle: Math.max(400, equalWidth),
      right: Math.max(minWidth, equalWidth)
    };
    
    setPanelWidths(equalWidths);
    console.log('⚖️  Reset to equal panel widths:', equalWidths);
  }, [containerWidth, minWidth, setPanelWidths]);

  // Maximize middle panel function
  const maximizeMiddlePanel = useCallback(() => {
    const maximizedWidths: PanelWidths = {
      left: minWidth,
      middle: containerWidth - 16 - (minWidth * 2),
      right: minWidth
    };
    
    setPanelWidths(maximizedWidths);
    console.log('🔍 Maximized middle panel');
  }, [containerWidth, minWidth, setPanelWidths]);

  // Keyboard shortcuts for panel management
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + R: Reset to equal widths
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        resetToEqualWidths();
      }
      // Ctrl/Cmd + Shift + M: Maximize middle panel
      else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        maximizeMiddlePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetToEqualWidths, maximizeMiddlePanel]);

  return {
    // Current widths
    panelWidths,
    
    // Drag state
    isDragging,
    
    // Event handlers for resize handles
    handleLeftMouseDown: (event: React.MouseEvent) => handleMouseDown(event, 'left'),
    handleRightMouseDown: (event: React.MouseEvent) => handleMouseDown(event, 'right'),
    
    // Refs for resize handles
    leftHandleRef,
    rightHandleRef,
    
    // Utility functions
    resetToEqualWidths,
    maximizeMiddlePanel,
    
    // Panel visibility helpers
    isLeftPanelMinimized: panelWidths.left <= minWidth + 10,
    isRightPanelMinimized: panelWidths.right <= minWidth + 10,
    isMiddlePanelMaximized: panelWidths.middle >= containerWidth - 16 - (minWidth * 2) - 50
  };
};