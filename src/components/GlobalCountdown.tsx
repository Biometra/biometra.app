import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

function GlobalCountdown() {
  // Set target date to 15 days from now
  const targetDate = new Date('2025-02-15T00:00:00Z');
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-6">
      {[
        { value: timeLeft.days, label: 'Days', color: 'from-purple-500 to-pink-500' },
        { value: timeLeft.hours, label: 'Hours', color: 'from-cyan-500 to-blue-500' },
        { value: timeLeft.minutes, label: 'Minutes', color: 'from-green-500 to-emerald-500' },
        { value: timeLeft.seconds, label: 'Seconds', color: 'from-yellow-500 to-orange-500' }
      ].map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          className={`mobile-card p-3 text-center bg-gradient-to-br ${item.color}/20 border-2 border-transparent`}
          style={{
            background: `linear-gradient(145deg, rgba(0, 0, 0, 0.4), rgba(75, 0, 130, 0.1)), linear-gradient(145deg, var(--tw-gradient-stops))`
          }}
        >
          <motion.div 
            className="text-2xl font-black text-white mb-1"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {String(item.value).padStart(2, '0')}
          </motion.div>
          <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">
            {item.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default GlobalCountdown;