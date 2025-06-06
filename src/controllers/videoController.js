import User from "../models/User";
import Video from "../models/Video";
import Comment from "../models/Comment";
export const home = async (req, res) => {
    try {
        const videos = await Video.find({}).sort({ createdAt: "desc" }).populate("owner");
        return res.render("home", { pageTitle: "Home", videos });
    } catch (err) {
        return res.render("server-error");
    }
};

export const watch = async (req, res) => {
    const { id } = req.params;
    const video = await Video.findById(id).populate("owner").populate("comments");
    // const owner = await User.findById(video.owner);

    if (!video) {
        return res.render("404", { pageTitle: "Video Not Found" });
    }

    return res.render("videos/watch", { pageTitle: `Watching: ${video.title}`, video });
};

export const getEdit = async (req, res) => {
    const { id } = req.params;
    const {
        user: { _id },
    } = req.session;
    const video = await Video.findById(id);

    if (!video) {
        return res.render("404", { pageTitle: "Video Not Found" });
    }
    if (String(video.owner) !== String(_id)) {
        req.flash("error", "You are not the owner of the video");
        return res.status(403).redirect("/");
    }
    return res.render("videos/edit", { pageTitle: `Editing: ${video.title}`, video });
};

export const postEdit = async (req, res) => {
     const { id } = req.params;
    const {
        user: { _id },
    } = req.session;
    const video = await Video.findById(id).populate("owner");
    const { title, description, hashtags } = req.body;
    const { video: videoFile, thumb: thumbFile } = req.files;

    if (!video) {
        return res.status(404).render("404", { pageTitle: "Video Not Found" });
    }

    if (String(video.owner._id) !== String(_id)) {
        req.flash("error", "You are not the owner of the video");
        return res.status(403).redirect("/");
    }

    await Video.findByIdAndUpdate(id, {
        title,
        description,
        fileUrl: videoFile ? videoFile[0].location : video.fileUrl,
        thumbUrl: thumbFile ? thumbFile[0].location : video.thumbUrl,
        hashtags: Video.formatHashtags(hashtags),
    });

    req.flash("success", "Changes Done!");
    return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
    return res.render("videos/upload", { pageTitle: `Uploading A Video` });
};

export const postUpload = async (req, res) => {
    //here we will add a video to videos array
    try {
        const {
            body: { title, description, hashtags },
            files: { video, thumb },
            session: {
                user: { _id },
            },
        } = req;
        const newVideo = await Video.create({
            fileUrl: video[0].location,
            thumbUrl: thumb[0].location,
            title,
            description,
            owner: _id,
            hashtags: Video.formatHashtags(hashtags),
        });
        const user = await User.findById(_id);
        user.videos.push(newVideo._id);
        user.save();
        return res.redirect("/");
    } catch (error) {
        console.log(error);
        return res.status(400).render("videos/upload", { pageTitle: "Upload Video", errorMessage: error._message });
    }
};

export const deleteVideo = async (req, res) => {
    const { id } = req.params;
    const {
        user: { _id },
    } = req.session;
    const video = await Video.findById(id);
    if (!video) {
        return res.status(404).render("404", { pageTitle: "Video Not Found" });
    }
    if (String(video.owner) !== String(_id)) {
        return res.status(403).redirect("/");
    }
    //delete the video
    const removedVid = await Video.findByIdAndDelete(id);

    console.log(removedVid);
    return res.redirect("/");
};

export const search = async (req, res) => {
    console.log(req.query);
    const { keyword } = req.query;
    let videos = [];
    if (keyword) {
        videos = await Video.find({
            title: {
                $regex: new RegExp(`${keyword}`, "i"),
            },
        }).populate("owner");
    }else{
        videos = await Video.find({}).populate("owner");
    }
    return res.render("search", { pageTitle: "Search!", videos });
};

export const registerView = async (req, res) => {
    const { id } = req.params;
    console.log(id);
    const video = await Video.findById(id);
    if (!video) {
        return res.sendStatus(404);
    }
    video.meta.views += 1;
    await video.save();
    return res.sendStatus(200);
};

export const createComment = async (req, res) => {
    const {
        session: { user },
        body: { text },
        params: { id },
    } = req;
    const video = await Video.findById(id);
    if (!video) return res.sendStatus(400);
    const comment = await Comment.create({
        text,
        owner: user._id,
        video: video._id,
    });
    video.comments.push(comment._id);
    video.save();

    return res.status(201).json(comment);
};

export const deleteComment = async (req, res) => {
    const {
        params: { id },
        body: { commentId },
    } = req;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.sendStatus(400);
    await Comment.findByIdAndDelete(commentId);
    return res.json(comment);
};
