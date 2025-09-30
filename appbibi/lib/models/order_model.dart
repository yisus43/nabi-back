class Order {
  final String id;
  final String customer;
  final int quantity;
  final String package;
  final List<String> liquidos;
  final List<String> frutas;
  final List<String> toppings;
  final String extras;
  final String delivery;
  final String punto;
  final String vestimenta;
  final String phone;
  final double total;
  final String status;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.customer,
    required this.quantity,
    required this.package,
    required this.liquidos,
    required this.frutas,
    required this.toppings,
    required this.extras,
    required this.delivery,
    required this.punto,
    required this.vestimenta,
    required this.phone,
    required this.total,
    required this.status,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['_id'] ?? '',
      customer: json['customer'] ?? '',
      quantity: json['quantity'] ?? 0,
      package: json['package'] ?? '',
      liquidos: List<String>.from(json['liquidos'] ?? []),
      frutas: List<String>.from(json['frutas'] ?? []),
      toppings: List<String>.from(json['toppings'] ?? []),
      extras: json['extras'] ?? '',
      delivery: json['delivery'] ?? '',
      punto: json['punto'] ?? '',
      vestimenta: json['vestimenta'] ?? '',
      phone: json['phone'] ?? '',
      total: (json['total'] ?? 0).toDouble(),
      status: json['status'] ?? 'Pendiente',
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
    );
  }

  String get formattedDate {
    return '${createdAt.day}/${createdAt.month}/${createdAt.year} ${createdAt.hour}:${createdAt.minute.toString().padLeft(2, '0')}';
  }

  String get shortId => id.length > 8 ? id.substring(0, 8) : id;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customer': customer,
      'quantity': quantity,
      'package': package,
      'liquidos': liquidos,
      'frutas': frutas,
      'toppings': toppings,
      'extras': extras,
      'delivery': delivery,
      'punto': punto,
      'vestimenta': vestimenta,
      'phone': phone,
      'total': total,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}