import express from "express";
import cors from "cors"
import path from "path" 

const app = express()

const allowedOrigins = [
      "http://localhost:8081", // expo mobile
      "http://localhost:5173", // vite web devs
       process.env.FRONTEND_URL || "", // production
].filter(Boolean) as string[];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "✅ Server is running" });
})

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.message);
    res.status(500).json({ status: "error", message: err.message });
});

if(process.env.NODE_ENV === "production"){
     app.use(express.static(path.join(__dirname, "../../web/dist")));

    app.get("/*", (_, res) => {
    res.sendFile(path.join(__dirname, "../../web/dist/index.html"));
  });
}

export default app;