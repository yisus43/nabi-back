import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  Future<Widget> _getInitialScreen() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    
    return token != null ? const DashboardScreen() : const LoginScreen();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _getInitialScreen(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return MaterialApp(
            home: Scaffold(
              backgroundColor: Colors.purple[50],
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Colors.purple)),
                    SizedBox(height: 20),
                    Text('Nabi Admin', style: TextStyle(fontSize: 24, color: Colors.purple, fontWeight: FontWeight.bold)),
                    SizedBox(height: 10),
                    Text('Cargando...', style: TextStyle(color: Colors.purple[700])),
                  ],
                ),
              ),
            ),
          );
        }
        
        return MaterialApp(
          title: 'Nabi Admin',
          theme: ThemeData(
            primarySwatch: Colors.purple,
            visualDensity: VisualDensity.adaptivePlatformDensity,
            useMaterial3: true,
          ),
          home: snapshot.data ?? const LoginScreen(),
          debugShowCheckedModeBanner: false,
          routes: {
            '/dashboard': (context) => const DashboardScreen(),
          },
        );
      },
    );
  }
}