import "dotenv/config";
import "./db";
import "./models/Video";
import "./models/User";
import "./models/Comment";
import http from "http";
import app from "./server";

const PORT = 3000;

const handleListening = () => console.log(`Server Listening on port http://localhost:${PORT} 👌`);

app.listen(PORT, handleListening);
