import geopandas as gpd
from pathlib import Path
import sys
import json
from tqdm import tqdm   # barra de progreso (opcional pero muy útil)

def generar_centroides(provincia: str):
    shp_path = Path("data/codigos_postales/codigos_postales.shp")

    if not shp_path.exists():
        print("❌ No se encontró el shapefile.")
        print("Asegúrate de tener la carpeta: data/codigos_postales/")
        print("con los archivos .shp, .dbf, .shx y .prj")
        return False

    # Si es "ALL", procesamos todas las provincias
    if provincia.upper() == "ALL":
        print("🚀 Generando archivos para TODAS las provincias (01-52)...\n")
        provincias = [str(i).zfill(2) for i in range(1, 53)]  # 01 a 52
        success = 0
        for prov in tqdm(provincias, desc="Procesando provincias"):
            if generar_una_provincia(prov, shp_path):
                success += 1
        print(f"\n✅ Proceso completado: {success}/52 provincias generadas correctamente.")
        return True

    # Procesar una sola provincia
    else:
        return generar_una_provincia(provincia, shp_path)


def generar_una_provincia(provincia: str, shp_path: Path):
    print(f"\nProcesando provincia {provincia}...")

    try:
        gdf = gpd.read_file(shp_path)

        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")

        cp_col = 'COD_POSTAL'

        # Filtrar provincia
        gdf['prov'] = gdf[cp_col].astype(str).str.zfill(5).str[:2]
        gdf_prov = gdf[gdf['prov'] == provincia.zfill(2)].copy()

        if gdf_prov.empty:
            print(f"   ❌ No se encontraron datos para la provincia {provincia}")
            return False

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

        # Guardar archivo
        out_dir = Path(f"docs/cp/{provincia.zfill(2)}")
        out_dir.mkdir(parents=True, exist_ok=True)

        output_file = out_dir / "codigos-postales-centros.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"   ✅ {len(data)} códigos postales guardados → docs/cp/{provincia.zfill(2)}/")
        return True

    except Exception as e:
        print(f"   ❌ Error procesando provincia {provincia}: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso:")
        print("   python generar_centroides.py <provincia>")
        print("   python generar_centroides.py ALL")
        print("\nEjemplos:")
        print("   python generar_centroides.py 28     # Solo Madrid")
        print("   python generar_centroides.py 08     # Solo Barcelona")
        print("   python generar_centroides.py ALL    # Todas las provincias")
        sys.exit(1)

    parametro = sys.argv[1].strip()
    generar_centroides(parametro)