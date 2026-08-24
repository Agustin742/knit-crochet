# impl 21 — tanda 1: Drawer + Tabs + tab General

**Estado:** en curso
**Feature:** #21 `projects_detail_ui` (tanda 1 de 2). NO marcar `done`.

## Plan (previo a leer nada)

- [ ] Leer RFC-03 E3 (§7-quater) entera + §1/§2/§4/§5; SDD-01 §9; architecture/conventions.
- [ ] Primitiva `Tabs` nueva (`role=tablist/tab/tabpanel`, flechas), NO sobre `SegmentedControl`.
- [ ] `Drawer` como variante de `Dialog` (sólo geometría lateral en `dialog.variants.ts`, patrón `DIALOG_SIZES`).
- [ ] Tab General (nombre, foto, tipo, status, needles, fechas, notas).
- [ ] Tap en card de proyecto abre drawer, sin anidar `<button>` dentro de `<a>`.
- [ ] Tests RTL (abre desde card, foco atrapado, Escape devuelve foco, flechas en tabs) + axe.
- [ ] `bash ./init.sh` EXIT 0; aritmética de tests cierra desde 1426 passed | 13 skipped (1439), 84 archivos.

## Bitácora

- (inicio) informe creado antes de leer.
