import geopandas as gpd
import pandas as pd
from pathlib import Path
import sys
import json

def generar_centroides(provincia: str):
    # Ruta al shapefile completo (descárgalo una sola vez del repo de inigoflores)
    shp_path = Path("data/codigos_postales/codigos_postales.shp")   # ajusta si está en otro sitio

    if not shp_path.exists():
        print("❌ No se encontró el shapefile.")
        print("Descarga el repositorio: https://github.com/inigoflores/ds-codigos-postales")
        print("y coloca la carpeta 'data/codigos_postales' en la raíz del proyecto.")
        return

    print(f"Procesando provincia {provincia}...")

    gdf = gpd.read_file(shp_path)
    gdf = gdf.to_crs("EPSG:4326")  # WGS84

    # Filtrar por provincia (los 2 primeros dígitos del código postal)
    gdf['prov'] = gdf['codigo_postal'].str[:2]
    gdf_prov = gdf[gdf['prov'] == provincia.zfill(2)]

    if gdf_prov.empty:
        print(f"No se encontraron códigos postales para la provincia {provincia}")
        return

    # Calcular centroide real de cada polígono
    gdf_prov['centroid'] = gdf_prov.geometry.centroid
    gdf_prov['lat'] = gdf_prov.centroid.y
    gdf_prov['lon'] = gdf_prov.centroid.x

    # Agrupar por código postal y calcular promedio (por si hay varios polígonos)
    result = gdf_prov.groupby('codigo_postal').agg({'lat': 'mean', 'lon': 'mean'}).reset_index()

    # Convertir a diccionario
    data = {}
    for _, row in result.iterrows():
        data[row['codigo_postal']] = {
            "lat": round(float(row['lat']), 6),
            "lon": round(float(row['lon']), 6)
        }

    # Guardar en la estructura solicitada
    out_dir = Path(f"docs/cp/{provincia.zfill(2)}")
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(out_dir / "codigos-postales-centros.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Generado: docs/cp/{provincia.zfill(2)}/codigos-postales-centros.json")
    print(f"   → {len(data)} códigos postales procesados")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python generar_centroides.py <provincia>")
        print("Ejemplo: python generar_centroides.py 28")
        sys.exit(1)
    
    prov = sys.argv[1].strip()
    generar_centroides(prov)