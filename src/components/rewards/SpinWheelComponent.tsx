
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SpinWheelProps {
  onClose: () => void;
  onSpin: () => Promise<void>;
}

const SpinWheelComponent: React.FC<SpinWheelProps> = ({ onClose, onSpin }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const wheelSegments = [
    { color: '#FFD700', label: '10', coins: 10 },
    { color: '#FF6B6B', label: '25', coins: 25 },
    { color: '#4ECDC4', label: '50', coins: 50 },
    { color: '#45B7D1', label: '100', coins: 100 },
    { color: '#96CEB4', label: '250', coins: 250 },
    { color: '#FFEAA7', label: '500', coins: 500 }
  ];

  const handleSpin = async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    
    // Generate random rotation (at least 5 full spins)
    const randomRotation = 1800 + Math.random() * 1800; // 5-10 spins
    setRotation(prev => prev + randomRotation);

    try {
      await onSpin();
    } catch (error) {
      console.error('Spin failed:', error);
    }

    // Reset after animation
    setTimeout(() => {
      setIsSpinning(false);
    }, 4000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-background rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Spin the Wheel!</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center space-y-6">
          {/* Wheel Container */}
          <div className="relative w-64 h-64">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-foreground"></div>
            </div>

            {/* Wheel */}
            <motion.div
              className="w-full h-full rounded-full border-4 border-border overflow-hidden"
              animate={{ rotate: rotation }}
              transition={{ duration: 4, ease: "easeOut" }}
            >
              {wheelSegments.map((segment, index) => {
                const angle = (360 / wheelSegments.length) * index;
                return (
                  <div
                    key={index}
                    className="absolute w-full h-full flex items-center justify-center text-white font-bold text-lg"
                    style={{
                      background: `conic-gradient(from ${angle}deg, ${segment.color} 0deg, ${segment.color} ${360 / wheelSegments.length}deg, transparent ${360 / wheelSegments.length}deg)`,
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((angle + 360 / wheelSegments.length) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle + 360 / wheelSegments.length) * Math.PI / 180)}%)`
                    }}
                  >
                    <span
                      style={{
                        transform: `rotate(${angle + 360 / wheelSegments.length / 2}deg)`,
                        transformOrigin: '50% 50%'
                      }}
                    >
                      {segment.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Spin Button */}
          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full"
            size="lg"
          >
            {isSpinning ? 'Spinning...' : 'Spin Wheel'}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Watch a rewarded ad to spin the wheel and win coins!
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SpinWheelComponent;
