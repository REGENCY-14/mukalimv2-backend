import "dotenv/config";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { attachUser } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
import { UPLOAD_DIR } from "./middleware/upload";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin/non-browser requests (no Origin header) and any
      // explicitly configured frontend origin.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true, // required so the httpOnly session cookies are sent/accepted
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Locally-stored media — swap for a CDN/S3 URL once real object storage is wired in.
app.use("/uploads", express.static(path.resolve(process.cwd(), UPLOAD_DIR)));

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use(attachUser);
app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
