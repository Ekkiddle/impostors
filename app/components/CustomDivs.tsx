'use client';

import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type RefObject
} from 'react';

// --- Interfaces ---

interface Position {
  x: number | string;
  y: number | string;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface DraggableDivProps {
  id?: string;
  defaultPosition?: Position;
  width?: number | string;
  height?: number | string;
  onDrag?: (rect: Rect) => void;
  forbiddenZones?: RefObject<HTMLElement | null>[];
  containWithinParent?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

// --- DraggableDiv ---

export const DraggableDiv = forwardRef<HTMLDivElement, DraggableDivProps>(({
  defaultPosition = { x: 0, y: 0 },
  width = 100,
  height = 100,
  onDrag,
  forbiddenZones = [],
  containWithinParent = false,
  children,
  style = {},
}, ref) => {
  // Internal state tracks pixels for math operations
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const offset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragging = useRef(false);
  const containerParentRect = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const initialized = useRef(false);

  const getTouchOrMouse = (e: any): MouseEvent | Touch => {
    return e.touches ? e.touches[0] : e;
  };

  useEffect(() => {
    const internalRef = ref as RefObject<HTMLDivElement>;
    if (!internalRef?.current) return;

    const parent = internalRef.current.offsetParent as HTMLElement;
    if (!parent) return;

    // 1. Update parent bounds
    const rect = parent.getBoundingClientRect();
    containerParentRect.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };

    // 2. Only run the coordinate parser once on mount
    if (!initialized.current) {
      const parseCoord = (coord: string | number, max: number) => {
        if (typeof coord === 'string' && coord.endsWith('%')) {
          return (parseFloat(coord) / 100) * max;
        }
        return Number(coord);
      };

      setPosition({
        x: parseCoord(defaultPosition.x, rect.width),
        y: parseCoord(defaultPosition.y, rect.height)
      });
      initialized.current = true;
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !internalRef.current) return;

      const point = getTouchOrMouse(e);
      const containerRect = internalRef.current.getBoundingClientRect();
      const { left: parentLeft, top: parentTop, width: parentWidth, height: parentHeight } = containerParentRect.current;

      let newX = point.clientX - parentLeft - offset.current.x;
      let newY = point.clientY - parentTop - offset.current.y;

      const newRect = {
        left: newX,
        top: newY,
        right: newX + containerRect.width,
        bottom: newY + containerRect.height,
      };

      // Forbidden Zone Collision Logic
      for (const zoneRef of forbiddenZones) {
        const zone = zoneRef?.current?.getBoundingClientRect();
        if (!zone) continue;

        const zoneLeft = zone.left - parentLeft;
        const zoneTop = zone.top - parentTop;
        const zoneRight = zoneLeft + zone.width;
        const zoneBottom = zoneTop + zone.height;

        const overlaps = !(
          newRect.right <= zoneLeft ||
          newRect.left >= zoneRight ||
          newRect.bottom <= zoneTop ||
          newRect.top >= zoneBottom
        );

        if (!overlaps) continue;

        const options = [
          { x: zoneLeft - containerRect.width, y: newY, dist: Math.abs((zoneLeft - containerRect.width) - newX) },
          { x: zoneRight, y: newY, dist: Math.abs(zoneRight - newX) },
          { x: newX, y: zoneTop - containerRect.height, dist: Math.abs((zoneTop - containerRect.height) - newY) },
          { x: newX, y: zoneBottom, dist: Math.abs(zoneBottom - newY) },
        ];

        const inBounds = options.filter(opt => (
          opt.x >= 0 &&
          opt.x + containerRect.width <= parentWidth &&
          opt.y >= 0 &&
          opt.y + containerRect.height <= parentHeight
        ));

        const best = (inBounds.length > 0 ? inBounds : options).sort((a, b) => a.dist - b.dist)[0];
        newX = best?.x ?? newX;
        newY = best?.y ?? newY;
      }

      if (containWithinParent) {
        newX = Math.max(0, Math.min(newX, parentWidth - containerRect.width));
        newY = Math.max(0, Math.min(newY, parentHeight - containerRect.height));
      }

      if (onDrag) {
        onDrag({
          left: newX,
          top: newY,
          right: newX + containerRect.width,
          bottom: newY + containerRect.height,
        });
      }
      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => { dragging.current = false; };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [ref, forbiddenZones, containWithinParent, onDrag]); // defaultPosition removed from dependencies

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const internalRef = ref as RefObject<HTMLDivElement>;
    if (!internalRef.current) return;

    const point = getTouchOrMouse(e);
    const rect = internalRef.current.getBoundingClientRect();

    offset.current = {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };

    if (internalRef.current.offsetParent) {
      const pRect = (internalRef.current.offsetParent as HTMLElement).getBoundingClientRect();
      containerParentRect.current = {
        left: pRect.left,
        top: pRect.top,
        width: pRect.width,
        height: pRect.height
      };
    }

    dragging.current = true;
  };

  return (
    <div
      ref={ref}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width,
        height,
        cursor: 'grab',
        touchAction: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
});

DraggableDiv.displayName = 'DraggableDiv';

// --- EmbossedDiv ---

interface EmbossedDivProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  innerDimensions?: { left: number; right: number; top: number; bottom: number };
}

export function EmbossedDiv({
  children,
  innerDimensions = { left: 5, right: 95, top: 15, bottom: 85 },
  className = '',
  style = {},
  ...rest
}: EmbossedDivProps) {
  const { left, right, top, bottom } = innerDimensions;

  const leftHighlightClip = `polygon(0 0, ${left}% ${top}%, ${left}% ${bottom}%, 0 100%)`;
  const rightShadowClip = `polygon(${right}% ${top}%, 100% 0, 100% 100%, ${right}% ${bottom}%)`;
  const topHighlightClip = `polygon(0 0, 100% 0, ${right}% ${top}%, ${left}% ${top}%)`;
  const bottomShadowClip = `polygon(${left}% ${bottom}%, ${right}% ${bottom}%, 100% 100%, 0 100%)`;

  return (
    <div className={`relative ${className}`} style={{ ...style }} {...rest}>
      <div className="absolute inset-0 bg-white opacity-40 pointer-events-none" style={{ clipPath: leftHighlightClip }} />
      <div className="absolute inset-0 bg-black opacity-30 pointer-events-none" style={{ clipPath: rightShadowClip }} />
      <div className="absolute inset-0 bg-white opacity-70 pointer-events-none" style={{ clipPath: topHighlightClip }} />
      <div className="absolute inset-0 bg-black opacity-40 pointer-events-none" style={{ clipPath: bottomShadowClip }} />
      {children}
    </div>
  );
}
