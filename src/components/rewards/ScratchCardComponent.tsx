
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { ScratchCard } from '@/services/RewardSystemService';

interface ScratchCardProps {
  card: ScratchCard;
  onReveal: () => void;
}

const ScratchCardComponent: React.FC<ScratchCardProps> = ({ card, onReveal }) => {
  const [isScratching, setIsScratching] = useState(false);
  const [scratchedPercent, setScratchedPercent] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (card.isRevealed) return;
    setIsScratching(true);
    startScratching(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScratching && !card.isRevealed) {
      scratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  const startScratching = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    scratch(relativeX, relativeY);
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, 2 * Math.PI);
    ctx.fill();

    // Calculate scratched percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }
    
    const percent = (transparent / (pixels.length / 4)) * 100;
    setScratchedPercent(percent);

    // Auto-reveal if 50% is scratched
    if (percent > 50 && !card.isRevealed) {
      onReveal();
    }
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw scratch overlay
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add "SCRATCH HERE" text
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH', canvas.width / 2, canvas.height / 2 - 5);
    ctx.fillText('HERE', canvas.width / 2, canvas.height / 2 + 15);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <Card className="p-4 cursor-pointer select-none">
        <div className="relative w-full h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg overflow-hidden">
          {/* Prize Content */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-2xl font-bold">{card.prize.icon}</div>
              <div className="text-lg font-semibold">{card.prize.coins} Coins</div>
              <div className="text-sm">{card.prize.name}</div>
            </div>
          </div>

          {/* Scratch Overlay */}
          {!card.isRevealed && (
            <canvas
              ref={canvasRef}
              width={200}
              height={128}
              className="absolute inset-0 w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ touchAction: 'none' }}
            />
          )}

          {/* Revealed Overlay */}
          {card.isRevealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-green-500/20 border-2 border-green-500 rounded-lg flex items-center justify-center"
            >
              <span className="text-green-600 font-bold">REVEALED!</span>
            </motion.div>
          )}
        </div>

        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            {card.isRevealed ? 'Prize claimed!' : 'Scratch to reveal prize'}
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default ScratchCardComponent;
