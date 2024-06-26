import "./db";
import "./models/Video";
import express from "express";
import morgan from "morgan";
import session from "express-session";
import flash from "express-flash";
import MongoStore from "connect-mongo";
import cors from "cors";
import rootRouter from "./routers/rootRouter";
import userRouter from "./routers/userRouter";
import videoRouter from "./routers/videoRouter";
import apiRouter from "./routers/apiRouter";
import { localsMiddleware } from "./middlewares";

console.log(process.cwd());

const app = express();
const logger = morgan("dev");

app.set("view engine", "pug");
app.set("views", process.cwd() + "/src/views");
app.use(logger);
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); //change JSONstring to javascript object
app.use(
    cors({
        origin: "*",
        credentials: true,
        optionsSuccessStatus: 200,
    })
);

app.use(
    session({
        secret: process.env.COOKIE_SECRET,
        resave: false,
        saveUninitialized: false,
        // cookie: {
        //     maxAge: 20000,
        // },
        store: MongoStore.create({ mongoUrl: process.env.DB_URL }),
    })
);

// app.use((req, res, next) => {
//     res.header("Cross-Origin-Embedder-Policy", "require-corp");
//     res.header("Cross-Origin-Opener-Policy", "same-origin");
//     next();
// });
// app.use((req, res, next) => {
//     req.sessionStore.all((error, sessions) => {
//         console.log(sessions);
//         next();
//     });
//     // console.log(req.headers);
//     // next();
// });
app.use(flash());
app.use(localsMiddleware);
app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("assets"));
// app.get("/add-one", (req, res, next) => {
//     req.session.potato += 1;
//     return res.send(`${req.session.id}\n${req.session.potato}`);
// });

app.use("/", rootRouter);
app.use("/videos", videoRouter);
app.use("/users", userRouter);
app.use("/api", apiRouter);

export default app;
