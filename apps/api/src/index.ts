import express from "express";
import cors from "cors";
import helmet from "helmet";
import { cardsRouter } from "./routes/cards.js";


const app = express();
app.use(helmet());
app.use(express.json({ limit: "1mb" }));


app.use(cors({
origin: [process.env.FRONTEND_ORIGIN ?? "*"],
methods: ["GET", "POST", "PATCH"],
allowedHeaders: ["Content-Type", "Authorization"],
credentials: true
}));


app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/cards", cardsRouter);


const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API listening on :${port}`));