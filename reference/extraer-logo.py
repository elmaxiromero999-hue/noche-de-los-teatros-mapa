# Extrae el logo (caretas + "La noche de los TEATROS") y los logos institucionales
# de la página 1 de ../CONTEXTO GRAFICO.ai como SVG vectoriales en assets/.
# Uso (desde web-mapa/): python3 reference/extraer-logo.py   — requiere PyMuPDF (fitz)
import fitz, os

AI = os.path.join(os.path.dirname(__file__), "..", "..", "CONTEXTO GRAFICO.ai")
OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

def hexc(c):
    return "#%02X%02X%02X" % tuple(round(v * 255) for v in c)

def path_d(items):
    d, last = [], None
    f = lambda p: f"{p.x:.2f},{p.y:.2f}"
    for it in items:
        k = it[0]
        if k == "re":
            r = it[1]; d.append(f"M{r.x0:.2f},{r.y0:.2f}H{r.x1:.2f}V{r.y1:.2f}H{r.x0:.2f}Z"); last = None; continue
        if k == "qu":
            q = it[1]; d.append(f"M{f(q.ul)}L{f(q.ur)}L{f(q.lr)}L{f(q.ll)}Z"); last = None; continue
        p0 = it[1]
        if last is None or abs(last.x - p0.x) > .01 or abs(last.y - p0.y) > .01:
            d.append("M" + f(p0))
        if k == "l": d.append("L" + f(it[2])); last = it[2]
        elif k == "c": d.append("C" + " ".join(f(p) for p in it[2:5])); last = it[4]
    return "".join(d)

def export(page, y0, y1, name, pad=4):
    sel = [dr for dr in page.get_drawings() if dr.get("fill") and dr["rect"].y0 >= y0 and dr["rect"].y1 <= y1 and dr["rect"].width < 1000]
    x0 = min(dr["rect"].x0 for dr in sel) - pad; x1 = max(dr["rect"].x1 for dr in sel) + pad
    ya = min(dr["rect"].y0 for dr in sel) - pad; yb = max(dr["rect"].y1 for dr in sel) + pad
    paths = "".join(
        f'<path d="{path_d(dr["items"])}" fill="{hexc(dr["fill"])}"' + (' fill-rule="evenodd"' if dr.get("even_odd") else "") + "/>"
        for dr in sel)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {ya:.1f} {x1-x0:.1f} {yb-ya:.1f}">{paths}</svg>'
    open(os.path.join(OUT, name), "w").write(svg)
    print(name, len(sel), "trazados", len(svg), "bytes")

page = fitz.open(AI)[0]
export(page, 240, 760, "logo-caretas.svg")
export(page, 780, 1040, "logo-titulo.svg")
export(page, 1240, 1350, "logos-institucionales.svg")
