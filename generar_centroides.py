import geopandas as gpd
from pathlib import Path
import sys
import json

def generar_centroides(provincia: str):
    # Cambia esta ruta si tus archivos están en otro lugar
    shp_path = Path("data/codigos_postales/codigos_postales.shp")

    if not shp_path.exists():
        print("❌ No se encontró el shapefile.")
        print("Asegúrate de tener la carpeta 'data/codigos_postales/' con todos los archivos (.shp, .dbf, .shx, .prj)")
        return

    print(f"Procesando provincia {provincia}...")

    gdf = gpd.read_file(shp_path)

    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
        print("   → CRS asignado: EPSG:4326")
    else:
        print(f"   → CRS: {gdf.crs}")

    print(f"   → Columnas disponibles: {list(gdf.columns)}")

    # Usamos la columna correcta que tienes: 'COD_POSTAL'
    cp_col = 'COD_POSTAL'

    # Filtrar por provincia (primeros 2 dígitos)
    gdf['prov'] = gdf[cp_col].astype(str).str.zfill(5).str[:2]
    gdf_prov = gdf[gdf['prov'] == provincia.zfill(2)].copy()

    if gdf_prov.empty:
        print(f"❌ No se encontraron códigos postales para la provincia {provincia}")
        return

    print(f"   → {len(gdf_prov)} polígonos encontrados")

    # Calcular centroides
    gdf_prov['centroid'] = gdf_prov.geometry.centroid
    gdf_prov['lat'] = gdf_prov.centroid.y
    gdf_prov['lon'] = gdf_prov.centroid.x

    # Agrupar por código postal
    result = gdf_prov.groupby(cp_col).agg({
        'lat': 'mean',
        'lon': 'mean'
    }).reset_index()

    # Crear diccionario
    data = {}
    for _, row in result.iterrows():
        cp = str(row[cp_col]).strip()
        data[cp] = {
            "lat": round(float(row['lat']), 6),
            "lon": round(float(row['lon']), 6)
        }

    # Guardar en la estructura solicitada
    out_dir = Path(f"docs/cp/{provincia.zfill(2)}")
    out_dir.mkdir(parents=True, exist_ok=True)

    output_file = out_dir / "codigos-postales-centros.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Archivo generado correctamente:")
    print(f"   → {output_file}")
    print(f"   → {len(data)} códigos postales procesados\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python generar_centroides.py <provincia>")
        print("Ejemplos:")
        print("   python generar_centroides.py 28   # Madrid")
        print("   python generar_centroides.py 08   # Barcelona")
        print("   python generar_centroides.py 41   # Sevilla")
        sys.exit(1)

    generar_centroides(sys.argv[1].strip())