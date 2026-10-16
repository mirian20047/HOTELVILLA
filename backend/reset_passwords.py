import bcrypt

# Generar hashes para admin y recepcionista
usuarios = [
    ('admin', 'admin123'),
    ('recepcionista', 'recepcionista123')
]

print("=" * 60)
print("HASHES GENERADOS CON BCRYPT")
print("=" * 60)

for username, password in usuarios:
    hash_generado = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    print(f"\n Usuario: {username}")
    print(f" Contraseña: {password}")
    print(f"✅ Hash: {hash_generado}")
    print(f"📏 Largo: {len(hash_generado)}")
    print("-" * 60)

print("\n📋 COPIA CADA HASH Y PÉGALO EN MYSQL WORKBENCH")