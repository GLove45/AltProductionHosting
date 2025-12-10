import { useEffect, useRef } from 'react';

export const NeonBackground = () => {
  const gridRef = useRef(null);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;

    const handlePointer = (event) => {
      const rect = node.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      node.style.setProperty('--glow-x', `${x}%`);
      node.style.setProperty('--glow-y', `${y}%`);
    };

    node.addEventListener('pointermove', handlePointer);
    return () => node.removeEventListener('pointermove', handlePointer);
  }, []);

  return (
    <div className="neon-background" ref={gridRef} aria-hidden>
      <div className="matrix-grid" />
      <div className="matrix-rain" />
    </div>
  );
};
