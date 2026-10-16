import bcrypt

password = "admin123"
# Generamos el hash usando bcrypt directamente (sin passlib)
hash_generado = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

print("✅ Hash generado correctamente:")
print(hash_generado)
print("\n👉 COPIA TODO EL TEXTO DE ARRIBA (incluyendo el $2b$...)")