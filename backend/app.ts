import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import env from "./config/env.ts";
import adminRoutes from "./routes/admin.route.ts";
import authRoutes from "./routes/auth.route.ts";
import feedbackRoutes from "./routes/feedback.route.ts";
import formRoutes from "./routes/form.route.ts";
import notificationRoutes from "./routes/notification.route.ts";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.ts";
import path from "path";

const app = express();
 
// Behind a proxy (Render, Fly, nginx) this makes req.ip and `secure` cookies
// resolve correctly.
app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and server-to-server calls arrive without an Origin header.
      if (!origin || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true, // required for the httpOnly auth cookies
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, status: "ok", environment: env.NODE_ENV });
});

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

 const frontendPath = path.join(process.cwd(), "build");
 console.log("CWD:", process.cwd());
console.log("Frontend path:", frontendPath);


app.use(express.static(frontendPath));

app.get("/{*splat}", (req, res, next) => {
    if(req.path.startsWith("/api/")){
      return next();
    }

    if(req.path.startsWith("/socket.io/")){
      return next();
    }

    res.sendFile(path.join(frontendPath, "index.html"));
})


app.use(notFoundHandler);
app.use(errorHandler);

export default app;
