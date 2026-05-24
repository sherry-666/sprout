import React from 'react';
import { View, Text } from 'react-native';

// Pure React Native icon components — no native packages required.
// Visual style matches the Sprout design system (proto-shared.jsx).

interface IconProps {
  size?: number;
  color?: string;
}

// ── Home — house (roof + walls + door) ────────────────────────────────────
export function HomeIcon({ size = 24, color = '#000' }: IconProps) {
  const stroke = Math.max(1.5, size * 0.1);
  const wallW = size * 0.7;
  const wallH = size * 0.42;
  const roofW = wallW + stroke * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      {/* Roof peak line — drawn as two diagonal lines via rotated Views */}
      <View style={{ width: roofW, height: size * 0.38, position: 'relative', marginTop: stroke }}>
        {/* Left slope */}
        <View style={{
          position: 'absolute',
          width: roofW / 2 + stroke / 2,
          height: stroke,
          backgroundColor: color,
          borderRadius: stroke,
          bottom: 0, left: 0,
          transformOrigin: 'bottom left',
          transform: [{ rotate: '-35deg' }],
        }} />
        {/* Right slope */}
        <View style={{
          position: 'absolute',
          width: roofW / 2 + stroke / 2,
          height: stroke,
          backgroundColor: color,
          borderRadius: stroke,
          bottom: 0, right: 0,
          transformOrigin: 'bottom right',
          transform: [{ rotate: '35deg' }],
        }} />
      </View>

      {/* Walls + door */}
      <View style={{
        width: wallW,
        height: wallH,
        borderLeftWidth: stroke,
        borderRightWidth: stroke,
        borderBottomWidth: stroke,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}>
        {/* Door */}
        <View style={{
          width: wallW * 0.34,
          height: wallH * 0.62,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderTopWidth: stroke,
          borderColor: color,
        }} />
      </View>
    </View>
  );
}

// ── AI — two sparkle stars (large + small companion, top-left) ────────────
export function AIIcon({ size = 24, color = '#000' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.72, color, lineHeight: size * 0.85, includeFontPadding: false }}>✦</Text>
      <Text style={{
        position: 'absolute', top: 0, left: 0,
        fontSize: size * 0.32, color, includeFontPadding: false, lineHeight: size * 0.38,
      }}>✦</Text>
    </View>
  );
}

// ── Chat — rounded speech bubble + 3 dots ─────────────────────────────────
export function ChatIcon({ size = 24, color = '#000' }: IconProps) {
  const stroke = Math.max(1.5, size * 0.09);
  const bubbleH = size * 0.72;
  const dotR = Math.max(1.5, size * 0.09);

  return (
    <View style={{ width: size, height: size }}>
      {/* Bubble */}
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: bubbleH,
        borderRadius: size * 0.28,
        borderWidth: stroke,
        borderColor: color,
      }} />
      {/* Tail */}
      <View style={{
        position: 'absolute',
        bottom: size * 0.02,
        left: size * 0.18,
        width: size * 0.2,
        height: size * 0.2,
        borderBottomWidth: stroke,
        borderLeftWidth: stroke,
        borderColor: color,
        borderBottomLeftRadius: 2,
      }} />
      {/* Dots */}
      {[size * 0.22, size * 0.44, size * 0.66].map((left, i) => (
        <View key={i} style={{
          position: 'absolute',
          top: bubbleH * 0.4,
          left,
          width: dotR * 2, height: dotR * 2,
          borderRadius: dotR,
          backgroundColor: color,
        }} />
      ))}
    </View>
  );
}

// ── Settings — 3 horizontal lines with offset slider knobs ────────────────
export function SettingsIcon({ size = 24, color = '#000', bg = '#fff' }: IconProps & { bg?: string }) {
  const stroke = Math.max(1.5, size * 0.09);
  const knobR = size * 0.12;
  const rows = [
    { top: size * 0.16, knobLeft: size * 0.58 },
    { top: size * 0.48, knobLeft: size * 0.24 },
    { top: size * 0.80, knobLeft: size * 0.62 },
  ];

  return (
    <View style={{ width: size, height: size }}>
      {rows.map(({ top, knobLeft }, i) => (
        <View key={i}>
          <View style={{
            position: 'absolute',
            top: top - stroke / 2,
            left: size * 0.04, right: size * 0.04,
            height: stroke, borderRadius: stroke,
            backgroundColor: color,
          }} />
          <View style={{
            position: 'absolute',
            top: top - knobR,
            left: knobLeft - knobR,
            width: knobR * 2, height: knobR * 2,
            borderRadius: knobR,
            backgroundColor: bg,
            borderWidth: stroke,
            borderColor: color,
          }} />
        </View>
      ))}
    </View>
  );
}

// ── Spark — small ✦ for AI avatar and badges ──────────────────────────────
export function SparkIcon({ size = 16, color = '#000' }: IconProps) {
  return (
    <Text style={{ fontSize: size, color, lineHeight: size * 1.15, includeFontPadding: false }}>✦</Text>
  );
}
