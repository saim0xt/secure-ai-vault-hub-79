
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Lock, RefreshCw } from 'lucide-react';

interface PatternLockProps {
  onPatternComplete: (pattern: number[]) => void;
  onCancel: () => void;
  isSetup?: boolean;
  title?: string;
}

const PatternLock: React.FC<PatternLockProps> = ({ 
  onPatternComplete, 
  onCancel, 
  isSetup = false,
  title = "Draw Pattern" 
}) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [touchedDots, setTouchedDots] = useState<Set<number>>(new Set());
  const [lines, setLines] = useState<{ from: number; to: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const GRID_SIZE = 3;
  const DOT_RADIUS = 20;
  const SELECTED_DOT_RADIUS = 25;

  useEffect(() => {
    drawPattern();
  }, [touchedDots, lines]);

  const getDotPosition = (index: number, containerSize: number) => {
    const spacing = containerSize / (GRID_SIZE + 1);
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    return {
      x: spacing * (col + 1),
      y: spacing * (row + 1)
    };
  };

  const drawPattern = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerSize = Math.min(container.offsetWidth, container.offsetHeight);
    canvas.width = containerSize;
    canvas.height = containerSize;

    // Clear canvas
    ctx.clearRect(0, 0, containerSize, containerSize);

    // Draw dots
    for (let i = 0; i < 9; i++) {
      const pos = getDotPosition(i, containerSize);
      const isSelected = touchedDots.has(i);
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? SELECTED_DOT_RADIUS : DOT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#3b82f6' : '#6b7280';
      ctx.fill();
      
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // Draw lines
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    for (const line of lines) {
      const fromPos = getDotPosition(line.from, containerSize);
      const toPos = getDotPosition(line.to, containerSize);
      
      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.lineTo(toPos.x, toPos.y);
      ctx.stroke();
    }
  };

  const getTouchedDot = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const containerSize = Math.min(container.offsetWidth, container.offsetHeight);

    for (let i = 0; i < 9; i++) {
      const pos = getDotPosition(i, containerSize);
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance <= SELECTED_DOT_RADIUS) {
        return i;
      }
    }
    return null;
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dotIndex = getTouchedDot(clientX, clientY);
    if (dotIndex !== null && !touchedDots.has(dotIndex)) {
      setPattern([dotIndex]);
      setTouchedDots(new Set([dotIndex]));
      setLines([]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dotIndex = getTouchedDot(clientX, clientY);
    if (dotIndex !== null && !touchedDots.has(dotIndex)) {
      const newPattern = [...pattern, dotIndex];
      const newTouchedDots = new Set([...touchedDots, dotIndex]);
      const newLines = [...lines];
      
      if (pattern.length > 0) {
        newLines.push({ from: pattern[pattern.length - 1], to: dotIndex });
      }
      
      setPattern(newPattern);
      setTouchedDots(newTouchedDots);
      setLines(newLines);
    }
  };

  const handleTouchEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (pattern.length >= 4) {
      onPatternComplete(pattern);
    } else {
      toast({
        title: "Pattern Too Short",
        description: "Please connect at least 4 dots",
        variant: "destructive",
      });
      resetPattern();
    }
  };

  const resetPattern = () => {
    setPattern([]);
    setTouchedDots(new Set());
    setLines([]);
    setIsDrawing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700 shadow-2xl p-6">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center"
            >
              <Lock className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-gray-400">
              {isSetup ? "Create a pattern by connecting dots" : "Draw your pattern to unlock"}
            </p>
          </div>

          <div 
            ref={containerRef}
            className="relative bg-gray-900/50 rounded-lg p-4 mb-6"
            style={{ aspectRatio: '1' }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              onMouseDown={handleTouchStart}
              onMouseMove={handleTouchMove}
              onMouseUp={handleTouchEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            />
          </div>

          <div className="space-y-3">
            <Button
              onClick={resetPattern}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear Pattern
            </Button>
            
            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Connect at least 4 dots to create a pattern
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default PatternLock;
