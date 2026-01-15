import { motion } from 'motion/react';

interface GiftBoxProps {
  isOpen?: boolean;
  onClick?: () => void;
  animate?: boolean;
}

export function GiftBox({ isOpen = false, onClick, animate = true }: GiftBoxProps) {
  return (
    <div 
      onClick={onClick} 
      className={`relative flex items-center justify-center ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: '240px', height: '240px' }}
    >
      {/* Box body - always visible */}
      <motion.div 
        className="absolute bottom-8 w-52 h-44 rounded-3xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #FFB3D0 0%, #FF8FB8 100%)',
          boxShadow: '0 12px 32px rgba(255, 107, 157, 0.25)',
        }}
        animate={animate && !isOpen ? {
          y: [0, -8, 0],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Vertical ribbon */}
        <div 
          className="absolute w-8 h-full left-1/2 -translate-x-1/2 rounded-full"
          style={{ background: 'linear-gradient(180deg, #FFD666 0%, #FFC857 100%)' }}
        />
        {/* Horizontal ribbon */}
        <div 
          className="absolute h-8 w-full top-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'linear-gradient(90deg, #FFD666 0%, #FFC857 100%)' }}
        />
        {/* Ribbon center decoration */}
        <div 
          className="absolute w-12 h-12 rounded-full z-10"
          style={{ 
            background: 'linear-gradient(135deg, #FFE699 0%, #FFD666 100%)',
            boxShadow: '0 2px 8px rgba(255, 198, 87, 0.3)'
          }}
        />
      </motion.div>

      {/* Box lid with hinge animation */}
      <motion.div
        className="absolute z-10"
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: 'bottom center',
          bottom: '152px',
        }}
        animate={isOpen ? { 
          rotateX: -25,
          y: -20,
          z: 10
        } : animate ? {
          rotateX: [0, 2, 0],
          y: [0, -8, 0],
        } : {}}
        transition={isOpen ? {
          type: "spring",
          stiffness: 120,
          damping: 15
        } : {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Lid top */}
        <div 
          className="w-56 h-12 rounded-t-3xl relative"
          style={{
            background: 'linear-gradient(135deg, #FF6B9D 0%, #FE8DB5 100%)',
            boxShadow: '0 6px 16px rgba(255, 107, 157, 0.3)',
          }}
        >
          {/* Lid ribbon */}
          <div 
            className="absolute w-8 h-full left-1/2 -translate-x-1/2 top-0"
            style={{ background: 'linear-gradient(180deg, #FFD666 0%, #FFC857 100%)' }}
          />
        </div>
        
        {/* Bow on top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex gap-1 items-center">
            {/* Left bow loop */}
            <div 
              className="w-7 h-7 rounded-full"
              style={{ 
                background: 'linear-gradient(135deg, #FFE699 0%, #FFC857 100%)',
                boxShadow: '0 2px 6px rgba(255, 198, 87, 0.3)'
              }}
            />
            {/* Center knot */}
            <div 
              className="w-4 h-4 rounded-full"
              style={{ 
                background: 'linear-gradient(135deg, #FFD666 0%, #FFAB00 100%)',
                boxShadow: '0 2px 6px rgba(255, 198, 87, 0.4)'
              }}
            />
            {/* Right bow loop */}
            <div 
              className="w-7 h-7 rounded-full"
              style={{ 
                background: 'linear-gradient(135deg, #FFE699 0%, #FFC857 100%)',
                boxShadow: '0 2px 6px rgba(255, 198, 87, 0.3)'
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Floating elements when animate is true */}
      {animate && !isOpen && (
        <>
          {/* Small floating cards/notes */}
          <motion.div
            className="absolute w-6 h-8 rounded bg-white shadow-md"
            style={{ 
              left: '20%', 
              top: '30%',
              opacity: 0.6,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [-5, 5, -5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
          <motion.div
            className="absolute w-5 h-7 rounded bg-white shadow-md"
            style={{ 
              right: '25%', 
              top: '40%',
              opacity: 0.5,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [5, -5, 5],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </>
      )}

      {/* Sparkles/confetti when opening */}
      {isOpen && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1, 0.8, 0],
                opacity: [0, 1, 1, 0],
                x: Math.cos(i * 45 * Math.PI / 180) * 90,
                y: Math.sin(i * 45 * Math.PI / 180) * 90 - 30
              }}
              transition={{ 
                duration: 1.2,
                ease: "easeOut"
              }}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{ 
                background: i % 3 === 0 ? '#FFC857' : i % 3 === 1 ? '#FF6B9D' : '#C060E8'
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}