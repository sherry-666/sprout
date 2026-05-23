import React from 'react';
import Svg, { Path, Circle, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// Exact SVG paths from the Sprout design system (proto-shared.jsx, viewBox 0 0 64 64)

export function HomeIcon({ size = 24, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M8 30 L 32 10 L 56 30" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 28 L14 52 L50 52 L50 28" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M26 52 L26 38 L38 38 L38 52" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AIIcon({ size = 24, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M24 32 C 32 32, 36 28, 36 10 C 36 28, 40 32, 56 32 C 40 32, 36 36, 36 54 C 36 36, 32 32, 24 32 Z"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M8 18 C 14 18, 16 16, 16 8 C 16 16, 18 18, 24 18 C 18 18, 16 20, 16 28 C 16 20, 14 18, 8 18 Z"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChatIcon({ size = 24, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M10 20 C 10 14, 14 10, 20 10 L 44 10 C 50 10, 54 14, 54 20 L 54 36 C 54 42, 50 46, 44 46 L 28 46 L 18 54 L 18 46 C 14 46, 10 42, 10 36 Z"
        stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx={22} cy={28} r={2.2} fill={color} />
      <Circle cx={32} cy={28} r={2.2} fill={color} />
      <Circle cx={42} cy={28} r={2.2} fill={color} />
    </Svg>
  );
}

export function SettingsIcon({ size = 24, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Line x1={10} y1={18} x2={54} y2={18} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={10} y1={32} x2={54} y2={32} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={10} y1={46} x2={54} y2={46} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      {/* Slider knobs — white fill shows on the line, creating the handle effect */}
      <Circle cx={40} cy={18} r={5} fill="white" stroke={color} strokeWidth={2.5} />
      <Circle cx={22} cy={32} r={5} fill="white" stroke={color} strokeWidth={2.5} />
      <Circle cx={44} cy={46} r={5} fill="white" stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

// Small sparkle used as the AI avatar inside cards and chat bubbles
export function SparkIcon({ size = 16, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2 C 12 9, 14 11, 22 11 C 14 11, 12 13, 12 22 C 12 13, 10 11, 2 11 C 10 11, 12 9, 12 2 Z" />
    </Svg>
  );
}
