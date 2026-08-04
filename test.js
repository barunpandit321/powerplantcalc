import { solvePT } from "iapws-if97";
import { convertToBase, convertFromBase, UNIT_TYPES } from "./src/units.js";

console.log("=== MJ/kg & mmHg UNIT TESTS ===");

// 18751.5 mmHg (abs) -> MPa
const p_mmHg_abs = convertToBase(18751.5, UNIT_TYPES.PRESSURE, "mmHg_a");
console.log("18751.5 mmHg (abs) -> MPa:", p_mmHg_abs, "(Expected ~2.5)");

// 17991.5 mmHg (gauge) -> MPa
const p_mmHg_gauge = convertToBase(17991.5, UNIT_TYPES.PRESSURE, "mmHg_g");
console.log("17991.5 mmHg (gauge) -> MPa:", p_mmHg_gauge, "(Expected ~2.5)");

// Solve state
const t_K = convertToBase(350, UNIT_TYPES.TEMPERATURE, "C");
const result = solvePT(p_mmHg_abs, t_K);
console.log("Region:", result.region);

// Enthalpy in MJ/kg
const h_MJ = convertFromBase(result.enthalpy, UNIT_TYPES.ENTHALPY, "MJ_kg");
console.log("Enthalpy (MJ/kg):", h_MJ, "(Expected ~3.127)");