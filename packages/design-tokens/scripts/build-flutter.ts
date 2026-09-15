import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import tokens from '../src/tokens.json';

/**
 * tokens.json -> Flutter ThemeData/ColorScheme.
 * apps/mobile bu dosyayi path-dependency olarak kullanir (packages/shared-dart/lib/app_theme.dart
 * uzerinden yayinlanir), boylece renk paleti web ile mobil arasinda elle senkronize edilmez.
 */
function hexToFlutterColor(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  return `Color(0xFF${clean})`;
}

const brand = tokens.color.brand as Record<string, { $value: string }>;
const semantic = tokens.color.semantic as Record<string, { $value: string }>;
const surface = tokens.color.surface as Record<string, { $value: string }>;

const dart = `// Bu dosya packages/design-tokens/src/tokens.json'dan otomatik uretilir.
// Elle duzenlemeyin - degisiklikleri tokens.json'a yapip \`pnpm tokens:build\` calistirin.
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const brand500 = ${hexToFlutterColor(brand['500'].$value)};
  static const brand600 = ${hexToFlutterColor(brand['600'].$value)};
  static const brand700 = ${hexToFlutterColor(brand['700'].$value)};

  static const sidebar = ${hexToFlutterColor(surface.sidebar.$value)};
  static const sidebarActive = ${hexToFlutterColor(surface.sidebarActive.$value)};
  static const background = ${hexToFlutterColor(surface.background.$value)};
  static const card = ${hexToFlutterColor(surface.card.$value)};
  static const border = ${hexToFlutterColor(surface.border.$value)};

  static const present = ${hexToFlutterColor(semantic.present.$value)};
  static const presentBg = ${hexToFlutterColor(semantic.presentBg.$value)};
  static const absentUnexcused = ${hexToFlutterColor(semantic.absentUnexcused.$value)};
  static const absentUnexcusedBg = ${hexToFlutterColor(semantic.absentUnexcusedBg.$value)};
  static const absentExcused = ${hexToFlutterColor(semantic.absentExcused.$value)};
  static const absentExcusedBg = ${hexToFlutterColor(semantic.absentExcusedBg.$value)};
  static const excused = ${hexToFlutterColor(semantic.excused.$value)};
  static const excusedBg = ${hexToFlutterColor(semantic.excusedBg.$value)};
  static const late = ${hexToFlutterColor(semantic.late.$value)};
  static const lateBg = ${hexToFlutterColor(semantic.lateBg.$value)};
}

ThemeData buildAppTheme({required Brightness brightness}) {
  final isDark = brightness == Brightness.dark;
  final colorScheme = ColorScheme(
    brightness: brightness,
    primary: AppColors.brand600,
    onPrimary: Colors.white,
    secondary: AppColors.brand400,
    onSecondary: Colors.white,
    error: AppColors.absentUnexcused,
    onError: Colors.white,
    surface: isDark ? const Color(0xFF1A1F26) : AppColors.card,
    onSurface: isDark ? Colors.white : const Color(0xFF20242C),
  );
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: isDark ? const Color(0xFF12141B) : AppColors.background,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.sidebar,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
  );
}
`;

writeFileSync(join(__dirname, '../dist/app_theme.dart'), dart);
console.log('app_theme.dart uretildi.');
