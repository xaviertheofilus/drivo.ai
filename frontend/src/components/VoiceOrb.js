import React from 'react';
import { motion } from 'framer-motion';

export const VoiceOrb = ({ state = 'idle', size = 320 }) => {
  const variants = {
    idle: { scale: [1, 1.02, 1], transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } },
    listening: { scale: [1, 1.04, 1], transition: { duration: 1.2, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } },
    speaking: { scale: [1, 1.015, 1], transition: { duration: 0.8, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } },
    warning: { scale: [1, 1.04, 1], transition: { duration: 0.9, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } },
    danger: { scale: [1, 1.06, 1], transition: { duration: 0.7, repeat: Infinity, ease: [0.16, 1, 0.3, 1] } },
  };

  const auraClass = state === 'danger'
    ? 'orb-aura-danger'
    : state === 'warning'
    ? 'orb-aura-warning'
    : 'orb-aura';

  const ringColor = state === 'danger'
    ? 'rgba(247,95,95,0.45)'
    : state === 'warning'
    ? 'rgba(247,184,79,0.45)'
    : 'rgba(79,142,247,0.45)';

  return (
    <div className="relative grid place-items-center" data-testid="voice-orb">
      <div
        className={`absolute rounded-full ${auraClass}`}
        style={{ width: size * 1.45, height: size * 1.45, filter: 'blur(8px)' }}
      />
      <motion.div
        className="relative rounded-full overflow-hidden"
        style={{
          width: size,
          height: size,
          background: 'var(--surface-alt)',
          border: `1px solid ${ringColor}`,
          boxShadow: `0 0 0 1px ${ringColor}, 0 30px 90px rgba(0,0,0,0.55)`,
        }}
        animate={variants[state] || variants.idle}
        data-testid={`voice-orb-state-${state}`}
      >
        {/* Inner concentric ring */}
        <motion.div
          className="absolute inset-3 rounded-full"
          style={{ border: `1px solid ${ringColor}` }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-8 rounded-full"
          style={{ border: `1px solid ${ringColor}` }}
          animate={{ opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Center dot */}
        <div
          className="absolute inset-0 m-auto rounded-full"
          style={{
            width: size * 0.18,
            height: size * 0.18,
            background: ringColor,
            filter: 'blur(2px)',
          }}
        />
        <div className="noise-overlay rounded-full" />
      </motion.div>
    </div>
  );
};
