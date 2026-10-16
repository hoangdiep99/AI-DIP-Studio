import React from 'react';

const ComparisonSlider = ({ before, after, beforeLabel, afterLabel }) => {
  const [pos, setPos] = React.useState(50);
  const containerRef = React.useRef(null);
  const dragging = React.useRef(false);
  const rafRef = React.useRef(null);
  const pendingClientX = React.useRef(null);

  const updatePosNow = React.useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    setPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  const scheduleUpdate = React.useCallback((clientX) => {
    pendingClientX.current = clientX;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingClientX.current !== null) {
        updatePosNow(pendingClientX.current);
      }
    });
  }, [updatePosNow]);

  const onPointerMove = (event) => {
    if (!dragging.current) return;
    event.preventDefault();
    scheduleUpdate(event.clientX);
  };

  const startDrag = (event) => {
    dragging.current = true;
    containerRef.current?.setPointerCapture?.(event.pointerId);
    scheduleUpdate(event.clientX);
  };

  const stopDrag = (event) => {
    dragging.current = false;
    if (event?.pointerId != null) {
      containerRef.current?.releasePointerCapture?.(event.pointerId);
    }
  };

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="compare-container smooth-compare"
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onPointerLeave={stopDrag}
    >
      <div className="compare-after">
        <img src={after} alt="After" draggable={false} loading="eager" decoding="async" />
      </div>
      <div className="compare-before" style={{ width: pos + '%' }}>
        <img src={before} alt="Before" draggable={false} loading="eager" decoding="async" />
      </div>
      <span className="compare-label" style={{ left: '12px' }}>
        {beforeLabel || 'Trước'}
      </span>
      <span className="compare-label" style={{ right: '12px' }}>
        {afterLabel || 'Sau'}
      </span>
      <div
        className="compare-divider"
        style={{ left: pos + '%' }}
        onPointerDown={startDrag}
        role="slider"
        aria-label="Kéo để so sánh ảnh trước và sau"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(pos)}
      />
    </div>
  );
};

export default ComparisonSlider;