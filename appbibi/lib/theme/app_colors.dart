import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF8E44AD);
  static const Color secondary = Color(0xFF9B59B6);
  static const Color accent = Color(0xFFF8F4FF);
  static const Color background = Color(0xFFF8F4FF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF2C3E50);
  static const Color textLight = Color(0xFFFFFFFF);
  static const Color success = Color(0xFF27AE60);
  static const Color warning = Color(0xFFF39C12);
  static const Color error = Color(0xFFE74C3C);
  static const Color pending = Color(0xFFFFA726);
  static const Color delivered = Color(0xFF66BB6A);
  static const Color cancelled = Color(0xFFEF5350);
  
  static const Gradient primaryGradient = LinearGradient(
    colors: [Color(0xFF8E44AD), Color(0xFF9B59B6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}