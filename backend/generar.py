import bcrypt

print("=" * 70)
print("HASHES REALES GENERADOS CON BCRYPT")
print("=" * 70)

# Hash para admin
hash_admin = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
print(f"\n1. USUARIO: admin")
print(f"   CONTRASEÑA: admin123")
print(f"   HASH: {hash_admin}")
print(f"   LARGO: {len(hash_admin)}")

# Hash para recepcionista
hash_recep = bcrypt.hashpw("recepcionista123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
print(f"\n2. USUARIO: recepcionista")
print(f"   CONTRASEÑA: recepcionista123")
print(f"   HASH: {hash_recep}")
print(f"   LARGO: {len(hash_recep)}")

print("\n" + "=" * 70)
print("COPIA LOS HASHES DE ARRIBA Y PÉGALOS EN MYSQL WORKBENCH")
print("=" * 70)