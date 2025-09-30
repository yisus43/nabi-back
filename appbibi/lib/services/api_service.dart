import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/order_model.dart';

class ApiService {
  static const String baseUrl = 'https://nabi-back.onrender.com/api';
  
  Map<String, String> getHeaders(String token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    };
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      // ✅ INTENTAR MÚLTIPLES ESTRATEGIAS
      final urls = [
        '$baseUrl/auth/login', // Directo
        'https://corsproxy.io/?' + Uri.encodeComponent('$baseUrl/auth/login'), // Proxy 1
        'https://api.corsproxy.io/?' + Uri.encodeComponent('$baseUrl/auth/login'), // Proxy 2
      ];

      http.Response? response;
      String usedUrl = '';

      for (final url in urls) {
        try {
          print('🔄 Intentando con: $url');
          usedUrl = url;
          response = await http.post(
            Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({
              'username': username,
              'password': password,
            }),
          ).timeout(const Duration(seconds: 10));
          
          if (response.statusCode == 200) break;
        } catch (e) {
          print('❌ Falló URL: $url - $e');
          continue;
        }
      }

      if (response == null) {
        throw Exception('Todas las URLs fallaron');
      }

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        final errorBody = response.body.isNotEmpty ? json.decode(response.body) : {};
        throw Exception(errorBody['error'] ?? 'Error en login: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  Future<List<Order>> getOrders(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/pedidos'),
        headers: getHeaders(token),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Order.fromJson(json)).toList();
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['error'] ?? 'Error al obtener pedidos: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  Future<Order> updateOrderStatus(String token, String orderId, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/pedidos/$orderId'),
        headers: getHeaders(token),
        body: json.encode({'status': status}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return Order.fromJson(data['order'] ?? data);
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['error'] ?? 'Error al actualizar pedido: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }
}