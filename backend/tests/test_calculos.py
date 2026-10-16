"""
Pruebas Unitarias - Sistema de Gestión Hotelera
Hotel La Villa de Roel
EFSRT IV - Implementación de Pruebas de Software
"""

from datetime import date

def test_calcular_noches():
    print("\n" + "="*60)
    print("PRUEBA 1: Calcular Noches de Estadía")
    print("="*60)
    
    fecha_entrada = date(2026, 8, 29)
    fecha_salida = date(2026, 8, 31)
    noches = (fecha_salida - fecha_entrada).days
    
    assert noches == 2
    print(f"Entrada: {fecha_entrada}")
    print(f"Salida: {fecha_salida}")
    print(f"Resultado: {noches} noches")
    print("PRUEBA APROBADA")
    return True

def test_calcular_total():
    print("\n" + "="*60)
    print("PRUEBA 2: Calcular Tarifa Total")
    print("="*60)
    
    noches = 3
    tarifa = 150.00
    total = noches * tarifa
    
    assert total == 450.00
    print(f"Noches: {noches}")
    print(f"Tarifa/noche: S/ {tarifa}")
    print(f"Total: S/ {total:.2f}")
    print("PRUEBA APROBADA")
    return True

def test_validar_pago():
    print("\n" + "="*60)
    print("PRUEBA 3: Validar Pago Suficiente")
    print("="*60)
    
    monto_pagado = 300
    saldo_pendiente = 500
    
    if monto_pagado < saldo_pendiente:
        print(f"Monto pagado: S/ {monto_pagado}")
        print(f"Saldo pendiente: S/ {saldo_pendiente}")
        print(f"Resultado: Pago INSUFICIENTE (Falta S/ {saldo_pendiente - monto_pagado})")
        print("PRUEBA APROBADA - Caso 1")
    
    monto_pagado = 500
    saldo_pendiente = 500
    
    if monto_pagado >= saldo_pendiente:
        print(f"Monto pagado: S/ {monto_pagado}")
        print(f"Saldo pendiente: S/ {saldo_pendiente}")
        print(f"Resultado: Pago EXACTO")
        print("PRUEBA APROBADA - Caso 2")
    
    return True

def test_conflicto_fechas():
    print("\n" + "="*60)
    print("PRUEBA 4: Validar Conflicto de Fechas")
    print("="*60)
    
    reserva_inicio = date(2026, 9, 1)
    reserva_fin = date(2026, 9, 5)
    nueva_inicio = date(2026, 9, 3)
    nueva_fin = date(2026, 9, 7)
    
    hay_conflicto = (nueva_inicio <= reserva_fin) and (nueva_fin >= reserva_inicio)
    
    assert hay_conflicto
    print(f"Reserva existente: {reserva_inicio} al {reserva_fin}")
    print(f"Nueva reserva: {nueva_inicio} al {nueva_fin}")
    print(f"Resultado: CONFLICTO DETECTADO")
    print("PRUEBA APROBADA")
    return True

def test_formatear_fecha():
    print("\n" + "="*60)
    print("PRUEBA 5: Formatear Fecha")
    print("="*60)
    
    def formatear_fecha(fecha_str):
        if not fecha_str:
            return 'Sin fecha'
        year, month, day = fecha_str.split('-')
        return f"{day}/{month}/{year}"
    
    fecha_input = "2026-08-31"
    resultado = formatear_fecha(fecha_input)
    
    assert resultado == "31/08/2026"
    print(f"Input: {fecha_input}")
    print(f"Output: {resultado}")
    print("PRUEBA APROBADA")
    return True

def ejecutar_todas_las_pruebas():
    print("\n" + "="*60)
    print("EJECUTANDO PRUEBAS UNITARIAS")
    print("Sistema: Hotel La Villa de Roel")
    print("Modulo: EFSRT IV")
    print("="*60)
    
    pruebas = [
        ("Calcular Noches", test_calcular_noches),
        ("Calcular Total", test_calcular_total),
        ("Validar Pago", test_validar_pago),
        ("Conflicto Fechas", test_conflicto_fechas),
        ("Formatear Fecha", test_formatear_fecha)
    ]
    
    aprobadas = 0
    total = len(pruebas)
    
    for nombre, prueba in pruebas:
        try:
            if prueba():
                aprobadas += 1
        except Exception as e:
            print(f"ERROR en {nombre}: {e}")
    
    print("\n" + "="*60)
    print("RESUMEN DE PRUEBAS")
    print("="*60)
    print(f"Total: {aprobadas}/{total} aprobadas")
    print(f"Porcentaje: {(aprobadas/total*100):.1f}%")
    
    if aprobadas == total:
        print("\nTODAS LAS PRUEBAS PASARON CORRECTAMENTE")
    else:
        print(f"\n{total - aprobadas} prueba(s) fallaron")

if __name__ == "__main__":
    ejecutar_todas_las_pruebas()