
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const CalculatorApp = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [waitingForNumber, setWaitingForNumber] = useState(false);
  const [secretSequence, setSecretSequence] = useState('');
  const { setFakeVaultMode } = useAuth();

  const SECRET_CODE = '1337'; // Secret code to access real vault

  const handleNumber = (num: string) => {
    if (waitingForNumber) {
      setDisplay(num);
      setWaitingForNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
    
    // Track secret sequence
    setSecretSequence(prev => (prev + num).slice(-4));
    
    // Check if secret code is entered
    if ((secretSequence + num).slice(-4) === SECRET_CODE) {
      // Access real vault
      setFakeVaultMode(false);
      window.location.href = '/auth?access=real';
    }
  };

  const handleOperator = (operator: string) => {
    const currentNumber = parseFloat(display);
    
    if (equation && !waitingForNumber) {
      calculate();
    } else {
      setEquation(display + ' ' + operator + ' ');
    }
    
    setWaitingForNumber(true);
  };

  const calculate = () => {
    try {
      const result = eval(equation + display);
      setDisplay(result.toString());
      setEquation('');
      setWaitingForNumber(true);
    } catch (error) {
      setDisplay('Error');
      setEquation('');
      setWaitingForNumber(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
    setWaitingForNumber(false);
    setSecretSequence('');
  };

  const clearEntry = () => {
    setDisplay('0');
    setWaitingForNumber(false);
  };

  const handleDecimal = () => {
    if (waitingForNumber) {
      setDisplay('0.');
      setWaitingForNumber(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const buttons = [
    { label: 'C', onClick: clear, className: 'bg-red-500 hover:bg-red-600 text-white' },
    { label: 'CE', onClick: clearEntry, className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { label: '⌫', onClick: handleBackspace, className: 'bg-orange-500 hover:bg-orange-600 text-white' },
    { label: '÷', onClick: () => handleOperator('/'), className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    
    { label: '7', onClick: () => handleNumber('7'), className: 'bg-muted hover:bg-muted/80' },
    { label: '8', onClick: () => handleNumber('8'), className: 'bg-muted hover:bg-muted/80' },
    { label: '9', onClick: () => handleNumber('9'), className: 'bg-muted hover:bg-muted/80' },
    { label: '×', onClick: () => handleOperator('*'), className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    
    { label: '4', onClick: () => handleNumber('4'), className: 'bg-muted hover:bg-muted/80' },
    { label: '5', onClick: () => handleNumber('5'), className: 'bg-muted hover:bg-muted/80' },
    { label: '6', onClick: () => handleNumber('6'), className: 'bg-muted hover:bg-muted/80' },
    { label: '−', onClick: () => handleOperator('-'), className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    
    { label: '1', onClick: () => handleNumber('1'), className: 'bg-muted hover:bg-muted/80' },
    { label: '2', onClick: () => handleNumber('2'), className: 'bg-muted hover:bg-muted/80' },
    { label: '3', onClick: () => handleNumber('3'), className: 'bg-muted hover:bg-muted/80' },
    { label: '+', onClick: () => handleOperator('+'), className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    
    { label: '0', onClick: () => handleNumber('0'), className: 'bg-muted hover:bg-muted/80 col-span-2' },
    { label: '.', onClick: handleDecimal, className: 'bg-muted hover:bg-muted/80' },
    { label: '=', onClick: calculate, className: 'bg-green-500 hover:bg-green-600 text-white' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <Card className="p-6 bg-card border-border">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">Calculator</h1>
            <p className="text-sm text-muted-foreground">Simple Calculator App</p>
          </div>

          {/* Display */}
          <div className="mb-4">
            <div className="bg-muted p-4 rounded-lg border border-border">
              {equation && (
                <div className="text-sm text-muted-foreground mb-1 text-right">
                  {equation}
                </div>
              )}
              <div className="text-3xl font-mono text-foreground text-right">
                {display}
              </div>
            </div>
            
            {/* Secret hint */}
            <div className="mt-2 text-center">
              <p className="text-xs text-muted-foreground/50">
                Enter 1337 for advanced features
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {buttons.map((button, index) => (
              <Button
                key={index}
                onClick={button.onClick}
                className={`h-14 text-lg font-semibold ${button.className} ${
                  button.label === '0' ? 'col-span-2' : ''
                }`}
                variant="outline"
              >
                {button.label}
              </Button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Calculator v1.0
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default CalculatorApp;
