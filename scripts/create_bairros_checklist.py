#!/usr/bin/env python3
"""Gera a planilha de revisão dos bairros do Rio em Foco.

Fonte: API local do app (http://localhost:3000).
Saída: checklist-bairros.xlsx na raiz do projeto.
"""
from __future__ import annotations

import json
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.properties import PageSetupProperties

BASE_URL = "http://localhost:3000"
OUTPUT = Path(__file__).resolve().parent.parent / "checklist-bairros.xlsx"

REGION_ORDER = [
    "Zona Sul",
    "Centro",
    "Zona Norte",
    "Zona Sudoeste",
    "Zona Oeste",
    "Ilhas",
]

REGION_TINTS = {
    "Zona Sul": "E0F2FE",
    "Centro": "EDE9FE",
    "Zona Norte": "FEF3C7",
    "Zona Sudoeste": "FEE2E2",
    "Zona Oeste": "FFEDD5",
    "Ilhas": "FCE7F3",
}

BRAND = "0F4C5C"
BRAND_DARK = "0A3540"
ACCENT = "C26A1B"
INK = "292524"
MUTED = "78716C"
LINE = "E7E5E4"
CARD = "F8F6F1"
WHITE = "FFFFFF"

THIN = Side(style="thin", color=LINE)
MEDIUM = Side(style="medium", color="D6D3D1")


def fetch(path: str) -> list[dict]:
    with urlopen(f"{BASE_URL}{path}", timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload.get("items", [])


def sort_key(name: str) -> str:
    return (
        unicodedata.normalize("NFKD", name)
        .encode("ascii", "ignore")
        .decode("ascii")
        .casefold()
    )


def build_rows() -> list[dict]:
    neighborhoods = fetch("/api/neighborhoods")
    cameras = fetch("/api/cameras")

    camera_counts = Counter(
        camera["neighborhoodSlug"]
        for camera in cameras
        if camera.get("neighborhoodSlug")
    )
    offline_counts = Counter(
        camera["neighborhoodSlug"]
        for camera in cameras
        if camera.get("neighborhoodSlug") and camera.get("isOnline") is False
    )

    rows = []
    for neighborhood in neighborhoods:
        slug = neighborhood["slug"]
        rows.append(
            {
                "region": neighborhood["regionName"],
                "name": neighborhood["name"],
                "cameras": camera_counts.get(slug, 0),
                "offline": offline_counts.get(slug, 0),
            }
        )

    rows.sort(
        key=lambda row: (
            REGION_ORDER.index(row["region"])
            if row["region"] in REGION_ORDER
            else len(REGION_ORDER),
            sort_key(row["name"]),
        )
    )
    return rows


def build_workbook(rows: list[dict]) -> Workbook:
    wb = Workbook()
    wb.properties.title = "Checklist de bairros — Rio em Foco"
    wb.properties.subject = "Acompanhamento dos bairros já visitados"
    wb.properties.creator = "Rio em Foco"
    wb.properties.description = (
        "Lista dos 162 bairros do Rio em Foco com contagem de câmeras "
        "e coluna para marcar os bairros já visitados."
    )
    wb.properties.keywords = "Rio em Foco, bairros, câmeras, checklist, revisão"
    wb.calculation.fullCalcOnLoad = True
    wb.calculation.forceFullCalc = True
    wb.calculation.calcMode = "auto"

    ws = wb.active
    ws.title = "Bairros"
    ws.sheet_properties.tabColor = BRAND

    headers = ["Região", "Bairro", "Câmeras", "Offline", "Já vi?", "Data", "Observações"]
    ws.append(headers)

    header_fill = PatternFill("solid", fgColor=BRAND)
    header_font = Font(name="Calibri", size=11, bold=True, color=WHITE)
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = Border(bottom=Side(style="medium", color=BRAND_DARK))
    ws.row_dimensions[1].height = 28

    ws["C1"].comment = Comment(
        "Quantidade de câmeras cadastradas neste bairro.", "Rio em Foco"
    )
    ws["D1"].comment = Comment(
        "Câmeras marcadas como offline no momento da geração da planilha.",
        "Rio em Foco",
    )
    ws["E1"].comment = Comment(
        "Marque Sim, Em andamento ou Não. Use o filtro para achar os pendentes.",
        "Rio em Foco",
    )

    data_font = Font(name="Calibri", size=10, color=INK)
    region_font = Font(name="Calibri", size=10, bold=True, color="44403C")
    muted_font = Font(name="Calibri", size=9, color=MUTED)

    previous_region = None
    for index, row in enumerate(rows, start=2):
        ws.cell(row=index, column=1, value=row["region"])
        ws.cell(row=index, column=2, value=row["name"])
        ws.cell(row=index, column=3, value=row["cameras"])
        ws.cell(row=index, column=4, value=row["offline"])
        ws.cell(row=index, column=5, value="Não")
        ws.cell(row=index, column=6, value=None)
        ws.cell(row=index, column=7, value=None)

        region_start = row["region"] != previous_region
        previous_region = row["region"]

        for col in range(1, 8):
            cell = ws.cell(row=index, column=col)
            cell.font = data_font
            cell.alignment = Alignment(
                horizontal="left" if col in (1, 2, 7) else "center",
                vertical="center",
                wrap_text=col in (2, 7),
            )
            cell.border = Border(
                top=MEDIUM if region_start and col == 1 else None,
                bottom=THIN,
            )

        ws.cell(row=index, column=1).fill = PatternFill(
            "solid", fgColor=REGION_TINTS.get(row["region"], "F5F5F4")
        )
        ws.cell(row=index, column=1).font = region_font
        ws.cell(row=index, column=5).font = muted_font
        ws.cell(row=index, column=6).number_format = "DD/MM/YYYY"
        ws.row_dimensions[index].height = 24

    last_row = len(rows) + 1
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:G{last_row}"

    data_validation = DataValidation(
        type="list",
        formula1='"Não,Sim,Em andamento"',
        allow_blank=False,
        showDropDown=False,
    )
    data_validation.promptTitle = "Já vi?"
    data_validation.prompt = "Escolha Não, Sim ou Em andamento."
    data_validation.errorTitle = "Valor inválido"
    data_validation.error = "Use a lista: Não, Sim ou Em andamento."
    data_validation.showErrorMessage = True
    data_validation.showInputMessage = True
    ws.add_data_validation(data_validation)
    data_validation.add(f"E2:E{last_row}")

    green_cell = PatternFill("solid", fgColor="C8E6C9")
    green_row = PatternFill("solid", fgColor="E8F5E9")
    amber_cell = PatternFill("solid", fgColor="FDE68A")
    amber_row = PatternFill("solid", fgColor="FEF3C7")

    ws.conditional_formatting.add(
        f"E2:E{last_row}",
        FormulaRule(
            formula=['$E2="Sim"'],
            fill=green_cell,
            font=Font(bold=True, color="166534"),
            stopIfTrue=True,
        ),
    )
    ws.conditional_formatting.add(
        f"E2:E{last_row}",
        FormulaRule(
            formula=['$E2="Em andamento"'],
            fill=amber_cell,
            font=Font(bold=True, color="92400E"),
            stopIfTrue=True,
        ),
    )
    ws.conditional_formatting.add(
        f"D2:D{last_row}",
        CellIsRule(
            operator="greaterThan",
            formula=["0"],
            fill=PatternFill("solid", fgColor="FEE2E2"),
            font=Font(bold=True, color="991B1B"),
        ),
    )
    ws.conditional_formatting.add(
        f"A2:G{last_row}",
        FormulaRule(formula=['$E2="Sim"'], fill=green_row),
    )
    ws.conditional_formatting.add(
        f"A2:G{last_row}",
        FormulaRule(formula=['$E2="Em andamento"'], fill=amber_row),
    )

    widths = {"A": 16, "B": 30, "C": 12, "D": 11, "E": 13, "F": 13, "G": 44}
    for column, width in widths.items():
        ws.column_dimensions[column].width = width

    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 100
    ws.print_area = f"A1:G{last_row}"
    ws.print_title_rows = "1:1"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_options.horizontalCentered = True
    ws.page_margins.left = 0.35
    ws.page_margins.right = 0.35
    ws.page_margins.top = 0.45
    ws.page_margins.bottom = 0.45
    ws.oddHeader.center.text = "Rio em Foco — Checklist de bairros"
    ws.oddHeader.center.size = 9
    ws.oddHeader.center.color = MUTED
    ws.oddFooter.center.text = "Página &P de &N"
    ws.oddFooter.center.size = 8
    ws.oddFooter.center.color = MUTED

    return wb


def add_summary(wb: Workbook, rows: list[dict]) -> None:
    ws = wb.create_sheet("Resumo")
    ws.sheet_properties.tabColor = ACCENT
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 100

    widths = {"A": 28, "B": 14, "C": 14, "D": 17, "E": 14, "F": 15}
    for column, width in widths.items():
        ws.column_dimensions[column].width = width

    total_cameras = sum(row["cameras"] for row in rows)
    total_offline = sum(row["offline"] for row in rows)

    ws.merge_cells("A1:F1")
    ws["A1"] = "Progresso da revisão dos bairros"
    ws["A1"].font = Font(name="Calibri", size=20, bold=True, color=BRAND)
    ws["A1"].alignment = Alignment(vertical="center")

    ws.merge_cells("A2:F2")
    ws["A2"] = (
        "Marque “Sim” na coluna Já vi? da aba Bairros. O resumo e as "
        "porcentagens são atualizados automaticamente."
    )
    ws["A2"].font = Font(name="Calibri", size=10, color=MUTED)
    ws["A2"].alignment = Alignment(vertical="center", wrap_text=True)
    ws.row_dimensions[2].height = 28

    generated = datetime.now().strftime("%d/%m/%Y %H:%M")
    ws.merge_cells("A3:F3")
    ws["A3"] = f"Gerado em {generated} · {len(rows)} bairros · {total_cameras:,} câmeras em bairros".replace(
        ",", "."
    )
    ws["A3"].font = Font(name="Calibri", size=9, italic=True, color=MUTED)

    labels = ["Bairros", "Vistos", "Em andamento", "Não vistos", "Concluído"]
    columns = ["B", "C", "D", "E", "F"]
    for column, label in zip(columns, labels):
        cell = ws[f"{column}5"]
        cell.value = label
        cell.font = Font(name="Calibri", size=9, bold=True, color=MUTED)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.fill = PatternFill("solid", fgColor=CARD)
        cell.border = Border(
            left=THIN, right=THIN, top=Side(style="medium", color="E2DCCF")
        )
        value_cell = ws[f"{column}6"]
        value_cell.font = Font(name="Calibri", size=20, bold=True, color=BRAND)
        value_cell.alignment = Alignment(horizontal="center", vertical="center")
        value_cell.fill = PatternFill("solid", fgColor=CARD)
        value_cell.border = Border(
            left=THIN,
            right=THIN,
            bottom=Side(style="medium", color="E2DCCF"),
        )
        value_cell.number_format = "0"

    ws["B6"] = "=COUNTA(Bairros!$B$2:$B$163)"
    ws["C6"] = '=COUNTIF(Bairros!$E$2:$E$163,"Sim")'
    ws["D6"] = '=COUNTIF(Bairros!$E$2:$E$163,"Em andamento")'
    ws["E6"] = '=COUNTIF(Bairros!$E$2:$E$163,"Não")'
    ws["F6"] = "=IF(B6=0,0,C6/B6)"
    ws["F6"].number_format = "0.0%"
    ws.row_dimensions[5].height = 20
    ws.row_dimensions[6].height = 38

    ws.merge_cells("A8:F8")
    ws["A8"] = "Por região"
    ws["A8"].font = Font(name="Calibri", size=12, bold=True, color=INK)
    ws["A8"].alignment = Alignment(vertical="center")

    table_headers = ["Região", "Bairros", "Vistos", "Em andamento", "Não vistos", "Concluído"]
    for index, header in enumerate(table_headers, start=1):
        cell = ws.cell(row=9, column=index, value=header)
        cell.font = Font(name="Calibri", size=10, bold=True, color=WHITE)
        cell.fill = PatternFill("solid", fgColor=BRAND)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = Border(bottom=Side(style="medium", color=BRAND_DARK))
    ws.row_dimensions[9].height = 24

    for offset, region in enumerate(REGION_ORDER):
        row_index = 10 + offset
        ws.cell(row=row_index, column=1, value=region)
        ws.cell(row=row_index, column=2, value=f"=COUNTIF(Bairros!$A$2:$A$163,$A{row_index})")
        ws.cell(
            row=row_index,
            column=3,
            value=f'=COUNTIFS(Bairros!$A$2:$A$163,$A{row_index},Bairros!$E$2:$E$163,"Sim")',
        )
        ws.cell(
            row=row_index,
            column=4,
            value=f'=COUNTIFS(Bairros!$A$2:$A$163,$A{row_index},Bairros!$E$2:$E$163,"Em andamento")',
        )
        ws.cell(row=row_index, column=5, value=f"=B{row_index}-C{row_index}-D{row_index}")
        ws.cell(row=row_index, column=6, value=f"=IF(B{row_index}=0,0,C{row_index}/B{row_index})")

        for column in range(1, 7):
            cell = ws.cell(row=row_index, column=column)
            cell.font = Font(name="Calibri", size=10, color=INK)
            cell.alignment = Alignment(
                horizontal="left" if column == 1 else "center",
                vertical="center",
            )
            cell.border = Border(bottom=THIN)
        ws.cell(row=row_index, column=1).font = Font(
            name="Calibri", size=10, bold=True, color="44403C"
        )
        ws.cell(row=row_index, column=1).fill = PatternFill(
            "solid", fgColor=REGION_TINTS.get(region, "F5F5F4")
        )
        ws.cell(row=row_index, column=6).number_format = "0.0%"

    total_row = 16
    ws.cell(row=total_row, column=1, value="Total")
    ws.cell(row=total_row, column=2, value="=SUM(B10:B15)")
    ws.cell(row=total_row, column=3, value="=SUM(C10:C15)")
    ws.cell(row=total_row, column=4, value="=SUM(D10:D15)")
    ws.cell(row=total_row, column=5, value="=SUM(E10:E15)")
    ws.cell(row=total_row, column=6, value="=IF(B16=0,0,C16/B16)")
    ws.cell(row=total_row, column=6).number_format = "0.0%"
    for column in range(1, 7):
        cell = ws.cell(row=total_row, column=column)
        cell.font = Font(name="Calibri", size=10, bold=True, color=INK)
        cell.fill = PatternFill("solid", fgColor=CARD)
        cell.alignment = Alignment(
            horizontal="left" if column == 1 else "center", vertical="center"
        )
        cell.border = Border(top=Side(style="medium", color="D6D3D1"), bottom=THIN)

    ws.conditional_formatting.add(
        "F10:F15",
        ColorScaleRule(
            start_type="num",
            start_value=0,
            start_color="FFFFFF",
            mid_type="num",
            mid_value=0.5,
            mid_color="D1FAE5",
            end_type="num",
            end_value=1,
            end_color="34D399",
        ),
    )

    ws.merge_cells("A18:F18")
    ws["A18"] = "Como usar"
    ws["A18"].font = Font(name="Calibri", size=12, bold=True, color=INK)

    steps = [
        "1. Na aba Bairros, marque a coluna Já vi? com Sim quando concluir um bairro.",
        "2. Use Em andamento para visitas parciais e a coluna Data para registrar o dia.",
        "3. Filtre por Região ou Já vi? para encontrar os bairros pendentes.",
        "4. O Resumo recalcula sozinho conforme você marca os bairros.",
    ]
    for offset, step in enumerate(steps):
        row_index = 19 + offset
        ws.merge_cells(f"A{row_index}:F{row_index}")
        cell = ws[f"A{row_index}"]
        cell.value = step
        cell.font = Font(name="Calibri", size=10, color="57534E")
        cell.alignment = Alignment(vertical="center", wrap_text=True)
        ws.row_dimensions[row_index].height = 18

    ws.merge_cells("A24:F24")
    ws["A24"] = "Legenda"
    ws["A24"].font = Font(name="Calibri", size=12, bold=True, color=INK)

    legend = [
        ("Sim", "já visitei", "C8E6C9", "166534"),
        ("Em andamento", "visita parcial", "FDE68A", "92400E"),
        ("Não", "pendente", "F5F5F4", "57534E"),
    ]
    for offset, (label, description, fill, font_color) in enumerate(legend):
        row_index = 25 + offset
        label_cell = ws.cell(row=row_index, column=2, value=label)
        label_cell.fill = PatternFill("solid", fgColor=fill)
        label_cell.font = Font(name="Calibri", size=10, bold=True, color=font_color)
        label_cell.alignment = Alignment(horizontal="center", vertical="center")
        label_cell.border = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
        ws.cell(row=row_index, column=3, value=description).font = Font(
            name="Calibri", size=10, color=MUTED
        )

    notes = [
        f"Câmeras: {total_cameras:,} pontos nos bairros; 16 câmeras sem bairro não entram na lista.".replace(
            ",", "."
        ),
        f"Offline: {total_offline} câmera(s) no retrato do banco local em {generated}.",
        "A marcação Já vi? é sua e não altera o status das câmeras.",
    ]
    for offset, note in enumerate(notes):
        row_index = 30 + offset
        ws.merge_cells(f"A{row_index}:F{row_index}")
        cell = ws[f"A{row_index}"]
        cell.value = note
        cell.font = Font(name="Calibri", size=9, italic=True, color=MUTED)
        cell.alignment = Alignment(vertical="center", wrap_text=True)

    ws.freeze_panes = "A10"
    ws.print_area = "A1:F32"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0


def verify(path: Path, expected_rows: int) -> None:
    wb = load_workbook(path, data_only=False)
    assert wb.sheetnames == ["Bairros", "Resumo"], wb.sheetnames
    ws = wb["Bairros"]
    assert ws.max_row == expected_rows + 1, ws.max_row
    assert ws["A1"].value == "Região"
    assert ws["E1"].value == "Já vi?"
    assert ws["E2"].value == "Não"
    assert len(ws.data_validations.dataValidation) == 1
    assert ws.auto_filter.ref == f"A1:G{expected_rows + 1}"
    assert ws["C2"].value is not None
    summary = wb["Resumo"]
    assert summary["B6"].value == "=COUNTA(Bairros!$B$2:$B$163)"
    assert summary["F6"].value == "=IF(B6=0,0,C6/B6)"
    assert summary["A16"].value == "Total"
    print(f"OK: {path.name} | {expected_rows} bairros | {path.stat().st_size:,} bytes")


def main() -> None:
    rows = build_rows()
    wb = build_workbook(rows)
    add_summary(wb, rows)
    wb.active = wb.sheetnames.index("Bairros")
    wb.save(OUTPUT)
    verify(OUTPUT, len(rows))
    print(f"Salvo em: {OUTPUT}")


if __name__ == "__main__":
    main()
