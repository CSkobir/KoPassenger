import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const ROUTES = [
  {
    id: "NOTUNBAZAR_SAYEDNAGAR_UIU",
    label: "Notunbazar → Sayednagar → UIU",
    stops: ["Notunbazar", "Sayednagar", "UIU"],
  },
  {
    id: "UIU_NOTUNBAZAR",
    label: "UIU → Notunbazar",
    stops: ["UIU", "Notunbazar"],
  },
  {
    id: "UTTORBADDHA_UIU",
    label: "Uttorbaddha → UIU",
    stops: ["Uttorbaddha", "UIU"],
  },
  {
    id: "UIU_UTTORBADDHA",
    label: "UIU → Uttorbaddha",
    stops: ["UIU", "Uttorbaddha"],
  },
];

router.get("/", (_req, res) => {
  res.json({ routes: ROUTES });
});

export { ROUTES };
export default router;

