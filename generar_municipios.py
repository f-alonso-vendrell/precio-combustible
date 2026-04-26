import pandas as pd
from pathlib import Path
import sys
import json
from tqdm import tqdm

def generar_municipios_unico():
    csv_path = Path("data/municipios/municipios.csv")

    if not csv_path.exists():
        print("❌ No se encontró el archivo municipios.csv")
        print("Colócalo en: data/municipios/municipios.csv")
        return

    print("Cargando municipios.csv...")

    # Probamos encodings comunes para archivos españoles
    encodings = ['latin1', 'cp1252', 'iso-8859-1', 'utf-8']
    df = None

    for enc in encodings:
        try:
            df = pd.read_csv(csv_path, sep=';', encoding=enc, low_memory=False)
            print(f"✅ Archivo leído correctamente con encoding: {enc}")
            break
        except UnicodeDecodeError:
            continue

    if df is None:
        print("❌ No se pudo leer el archivo con ninguno de los encodings probados.")
        return

    print(f"Total de registros: {len(df)}")

    # Columnas según tu estructura
    nombre_col = 'NOMBRE_ACTUAL'
    lon_col    = 'LONGITUD_ETRS89_REGCAN95'
    lat_col    = 'LATITUD_ETRS89_REGCAN95'

    data = {}

    print("Procesando municipios...")
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Procesando"):
        nombre = str(row[nombre_col]).strip()

        if not nombre:
            continue

        try:
            lat = float(str(row[lat_col]).replace(',', '.'))
            lon = float(str(row[lon_col]).replace(',', '.'))
        except (ValueError, TypeError):
            continue  # saltar si coordenadas inválidas

        # Usamos el nombre del municipio como clave
        data[nombre] = {
            "lat": round(lat, 6),
            "lon": round(lon, 6)
        }

    # Guardar archivo único
    out_dir = Path("docs/municipios")
    out_dir.mkdir(parents=True, exist_ok=True)

    output_file = out_dir / "municipios-centros.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ ¡Archivo generado correctamente!")
    print(f"   → {output_file}")
    print(f"   → Total de municipios: {len(data)}")


if __name__ == "__main__":
    generar_municipios_unico()