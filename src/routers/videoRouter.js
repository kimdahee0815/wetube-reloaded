import express from "express";
import { watch, getEdit, postEdit, getUpload, postUpload, deleteVideo } from "../controllers/videoController";
import { protectorMiddleware, videoUpload } from "../middlewares";

const videoRouter = express.Router();

videoRouter.get("/:id([0-9a-f]{24})", watch);
videoRouter
    .route("/:id([0-9a-f]{24})/edit")
    .all(protectorMiddleware)
    .get(getEdit)
    .post(videoUpload.fields([
            { name: "video", maxCount: 1 },
            { name: "thumb", maxCount: 1 },
        ]), postEdit);
videoRouter.route("/:id([0-9a-f]{24})/delete").all(protectorMiddleware).get(deleteVideo);
videoRouter
    .route("/upload")
    .all(protectorMiddleware)
    .get(getUpload)
    .post(
        videoUpload.fields([
            { name: "video", maxCount: 1 },
            { name: "thumb", maxCount: 1 },
        ]),
        postUpload
    );

export default videoRouter;
